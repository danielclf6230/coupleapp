const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PRIZES,
  TOTAL_SLICES,
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
test("each equal wheel slice has one ticket, with fewer slices for cash prizes", () => {
  const counts = Object.fromEntries(PRIZES.map((p) => [p.id, 0]));
  for (let ticket = 0; ticket < TOTAL_SLICES; ticket++) counts[choosePrize(ticket).id]++;
  assert.equal(TOTAL_SLICES, 17);
  assert.deepEqual(counts, {
    yen20000: 1,
    yen10000: 2,
    donki: 3,
    shopping30: 3,
    oneShop: 4,
    convenience: 4,
  });
  for (const prize of PRIZES) assert.equal(counts[prize.id], prize.slices);
});
