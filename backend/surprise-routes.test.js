const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("./auth");

test("game API enforces Daniel permissions, consumes recharge without approval, saves progress and one prize", async () => {
  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-11-25T00:00:00Z");
  const users = { 1: "Daniel", 3: "Kristen" };
  const progress = {};
  let enabled = 0;
  const db = {
    query: async (sql, args = []) => {
      sql = sql.replace(/\s+/g, " ").trim();
      if (
        sql.startsWith("CREATE TABLE") ||
        sql.startsWith("INSERT IGNORE INTO surprise_settings")
      )
        return [{}];
      if (sql === "SELECT id FROM users WHERE id = ?")
        return [users[args[0]] ? [{ id: args[0] }] : []];
      if (sql === "SELECT name FROM users WHERE id = ?")
        return [[{ name: users[args[0]] }]];
      if (sql.startsWith("SELECT enabled")) return [[{ enabled }]];
      if (sql.startsWith("INSERT IGNORE INTO surprise_progress")) {
        progress[args[0]] ||= {
          mission: 0,
          prize: null,
          recharge: null,
          approved: 0,
        };
        return [{}];
      }
      if (sql.startsWith("SELECT")) return [[{ ...progress[args[0]] }]];
      if (sql.startsWith("UPDATE surprise_settings")) {
        enabled = 1;
        return [{ affectedRows: 1 }];
      }
      const p =
        progress[
          args[
            sql.includes("SET prize = ?") || sql.includes("SET recharge = ?")
              ? 1
              : 0
          ]
        ];
      let changed = false;
      if (sql.includes("SET mission = mission + 1") && p.mission === args[1]) {
        p.mission++;
        p.recharge = null;
        p.approved = 0;
        changed = true;
      }
      if (sql.includes("SET recharge = ?") && p.mission === 1 && !p.recharge) {
        p.recharge = args[0];
        p.approved = 0;
        changed = true;
      }
      if (
        sql.includes("SET recharge = NULL") &&
        p.mission === 1 &&
        p.recharge &&
        p.recharge === args[1]
      ) {
        p.recharge = null;
        p.approved = 0;
        changed = true;
      }
      if (sql.includes("SET prize = ?")) {
        assert.match(
          sql,
          /WHERE user_id = \? AND mission = 5 AND prize IS NULL$/,
        );
        if (p.mission === 5 && !p.prize) {
          p.prize = args[0];
          p.mission = 6;
          changed = true;
        }
      }
      return [{ affectedRows: changed ? 1 : 0 }];
    },
  };
  const dbPath = require.resolve("./config/db");
  const previous = require.cache[dbPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: db,
  };
  process.env.JWT_SECRET = "surprise-route-test-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/surprise", requireAuth(db), require("./routes/surpriseRoutes"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/surprise`;
  const call = (user, path = "", body) =>
    fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user
          ? {
              Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}`,
            }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    assert.equal((await call(null)).status, 401);
    assert.equal((await (await call(3)).json()).visible, false);
    assert.equal((await (await call(1)).json()).visible, true);
    for (const endpoint of ["/activate", "/reset-test"])
      assert.equal((await call(3, endpoint, { userId: 3 })).status, 403);
    assert.equal((await call(3, "/advance", { mission: 0 })).status, 403);
    assert.equal((await call(1, "/activate", {})).status, 200);
    assert.equal((await (await call(3)).json()).visible, true);
    assert.equal((await call(3, "/recharge", { kind: "time" })).status, 409);
    assert.equal((await call(3, "/advance", { mission: 0 })).status, 200);
    assert.equal((await call(3, "/advance", { mission: 0 })).status, 409);
    assert.equal((await call(3, "/recharge", { kind: "skip" })).status, 400);
    assert.equal((await call(3, "/recharge", { kind: "time" })).status, 200);
    assert.equal((await call(3, "/recharge", { kind: "restart" })).status, 409);
    assert.equal(progress[3].approved, 0);
    assert.equal((await (await call(3, "/consume", {})).json()).kind, "time");
    assert.equal((await call(3, "/consume", {})).status, 409);
    assert.equal((await call(3, "/recharge", { kind: "restart" })).status, 200);
    assert.equal(
      (await (await call(3, "/consume", {})).json()).kind,
      "restart",
    );
    assert.equal((await call(3, "/spin", {})).status, 409);
    progress[3].mission = 5;
    const draws = await Promise.all(
      Array.from({ length: 8 }, () =>
        call(3, "/spin", {}).then((r) => r.json()),
      ),
    );
    assert.equal(new Set(draws.map((d) => d.prize.id)).size, 1);
    assert.equal(
      (await (await call(3)).json()).progress.prize,
      draws[0].prize.id,
    );
    assert.equal(progress[1].prize, null);
  } finally {
    Date.now = originalNow;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (previous) require.cache[dbPath] = previous;
    else delete require.cache[dbPath];
  }
});
