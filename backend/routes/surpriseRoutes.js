const express = require("express");
const { randomInt } = require("node:crypto");
const db = require("../config/db");
const {
  RELEASE_AT,
  PRIZES,
  TOTAL_SLICES,
  choosePrize,
  isReleased,
} = require("../surprise-game");
const router = express.Router();
let initialized;
function init() {
  if (!initialized)
    initialized = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS surprise_settings (
      id INT PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0)`);
      await db.query("INSERT IGNORE INTO surprise_settings (id) VALUES (1)");
      await db.query(`CREATE TABLE IF NOT EXISTS surprise_progress (
      user_id INT PRIMARY KEY, mission INT NOT NULL DEFAULT 0,
      prize VARCHAR(40) NULL, recharge VARCHAR(20) NULL, approved TINYINT NOT NULL DEFAULT 0)`);
    })().catch((e) => {
      initialized = null;
      throw e;
    });
  return initialized;
}
router.use(async (req, res, next) => {
  try {
    await init();
    const [[user]] = await db.query("SELECT name FROM users WHERE id = ?", [
      req.user.id,
    ]);
    req.isDaniel = user?.name?.trim().toLowerCase() === "daniel";
    const [[settings]] = await db.query(
      "SELECT enabled FROM surprise_settings WHERE id = 1",
    );
    req.released = isReleased(settings.enabled);
    req.manual = !!settings.enabled;
    await db.query(
      "INSERT IGNORE INTO surprise_progress (user_id) VALUES (?)",
      [req.user.id],
    );
    next();
  } catch (e) {
    next(e);
  }
});
router.get("/", async (req, res, next) => {
  try {
    const [[progress]] = await db.query(
      "SELECT mission, prize, recharge, approved FROM surprise_progress WHERE user_id = ?",
      [req.user.id],
    );
    res.json({
      visible: req.released || req.isDaniel,
      released: req.released,
      manual: req.manual,
      isDaniel: req.isDaniel,
      releaseAt: RELEASE_AT,
      progress,
      prizes: req.released || req.isDaniel ? PRIZES : [],
    });
  } catch (e) {
    next(e);
  }
});
router.post("/activate", async (req, res, next) => {
  if (!req.isDaniel) return res.sendStatus(403);
  try {
    await db.query("UPDATE surprise_settings SET enabled = 1 WHERE id = 1");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router.use((req, res, next) =>
  req.released || req.isDaniel
    ? next()
    : res.status(403).json({ message: "驚喜仲未開放呀！" }),
);
async function advanceMission(req, res, next) {
  const mission = req.body.mission;
  if (!Number.isInteger(mission) || mission < 0 || mission > 4)
    return res.sendStatus(400);
  try {
    const [result] = await db.query(
      `UPDATE surprise_progress SET mission = mission + 1, recharge = NULL, approved = 0
      WHERE user_id = ? AND mission = ?`,
      [req.user.id, mission],
    );
    if (!result.affectedRows)
      return res.status(409).json({ message: "進度已更新，請重新開啟遊戲。" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
router.post("/advance", advanceMission);
// Test skipping is authorized from the authenticated account, never client flags.
router.post("/skip-test", (req, res, next) => {
  if (!req.isDaniel) return res.sendStatus(403);
  if (!Number.isInteger(req.body.mission) || req.body.mission < 1 || req.body.mission > 4)
    return res.sendStatus(400);
  return advanceMission(req, res, next);
});
router.post("/recharge", async (req, res, next) => {
  if (!["time", "restart"].includes(req.body.kind)) return res.sendStatus(400);
  try {
    const [result] = await db.query(
      `UPDATE surprise_progress SET recharge = ?, approved = 0
      WHERE user_id = ? AND mission = 1 AND recharge IS NULL`,
      [req.body.kind, req.user.id],
    );
    if (!result.affectedRows)
      return res.status(409).json({ message: "充值準備中，請返回繼續。" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router.post("/consume", async (req, res, next) => {
  try {
    const [[progress]] = await db.query(
      "SELECT recharge FROM surprise_progress WHERE user_id = ?",
      [req.user.id],
    );
    if (!progress?.recharge) return res.sendStatus(409);
    const [result] = await db.query(
      "UPDATE surprise_progress SET recharge = NULL, approved = 0 WHERE user_id = ? AND mission = 1 AND recharge = ?",
      [req.user.id, progress.recharge],
    );
    if (!result.affectedRows) return res.sendStatus(409);
    res.json({ kind: progress.recharge });
  } catch (e) {
    next(e);
  }
});
router.post("/spin", async (req, res, next) => {
  try {
    const prize = choosePrize(randomInt(TOTAL_SLICES));
    await db.query(
      "UPDATE surprise_progress SET prize = ?, mission = 6 WHERE user_id = ? AND mission = 5 AND prize IS NULL",
      [prize.id, req.user.id],
    );
    const [[progress]] = await db.query(
      "SELECT prize FROM surprise_progress WHERE user_id = ?",
      [req.user.id],
    );
    if (!progress.prize)
      return res.status(409).json({ message: "完成全部挑戰先可以抽獎！" });
    res.json({ prize: PRIZES.find((p) => p.id === progress.prize) });
  } catch (e) {
    next(e);
  }
});
// Daniel can repeat his own test without affecting the other account.
router.post("/reset-test", async (req, res, next) => {
  if (!req.isDaniel) return res.sendStatus(403);
  try {
    await db.query(
      "UPDATE surprise_progress SET mission = 0, prize = NULL, recharge = NULL, approved = 0 WHERE user_id = ?",
      [req.user.id],
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router.use((err, req, res, next) => {
  console.error("Surprise game:", err.message);
  res.status(500).json({ message: "暫時儲存唔到，請再試一次。" });
});
module.exports = router;
