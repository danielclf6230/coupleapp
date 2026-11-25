const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PRIZES,
  choosePrize,
  isReleased,
  RELEASE_AT,
} = require("./surprise-game");
test("release happens at midnight Japan time, with a persistent manual override", () => {
  const release = Date.parse(RELEASE_AT);
  assert.equal(new Date(release).toISOString(), "2027-01-28T15:00:00.000Z");
  assert.equal(isReleased(false, release - 1), false);
  assert.equal(isReleased(false, release), true);
  assert.equal(isReleased(true, release - 1), true);
});
test("all 100 tickets have exactly the configured prize distribution", () => {
  const counts = Object.fromEntries(PRIZES.map((p) => [p.id, 0]));
  for (let ticket = 0; ticket < 100; ticket++) counts[choosePrize(ticket).id]++;
  assert.equal(
    PRIZES.reduce((n, p) => n + p.weight, 0),
    100,
  );
  for (const prize of PRIZES) assert.equal(counts[prize.id], prize.weight);
});
