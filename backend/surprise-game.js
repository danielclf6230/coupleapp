const RELEASE_AT = "2027-01-29T00:00:00+09:00";
const PRIZES = [
  { id: "yen20000", label: "¥20,000 日圓現金獎", short: "¥20,000", slices: 1 },
  { id: "yen10000", label: "¥10,000 日圓現金獎", short: "¥10,000", slices: 2 },
  { id: "donki", label: "Donki 任買一次", short: "Donki 任買", slices: 3 },
  {
    id: "shopping30",
    label: "30 mins 任買一次",
    short: "30 分鐘任買",
    slices: 3,
  },
  { id: "oneShop", label: "同一間店任買一次", short: "一間店任買", slices: 4 },
  {
    id: "convenience",
    label: "便利店任買全個旅程",
    short: "便利店全旅程",
    slices: 4,
  },
];
const TOTAL_SLICES = PRIZES.reduce((total, prize) => total + prize.slices, 0);
function choosePrize(ticket) {
  let cumulative = 0;
  return PRIZES.find((p) => (cumulative += p.slices) > ticket);
}
function isReleased(manual, now = Date.now()) {
  return !!manual || now >= Date.parse(RELEASE_AT);
}
module.exports = { RELEASE_AT, PRIZES, TOTAL_SLICES, choosePrize, isReleased };
