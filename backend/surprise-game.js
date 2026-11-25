const RELEASE_AT = "2027-01-29T00:00:00+09:00";
const PRIZES = [
  { id: "yen20000", label: "¥20,000 日圓現金獎", short: "¥20,000", weight: 3 },
  { id: "yen10000", label: "¥10,000 日圓現金獎", short: "¥10,000", weight: 7 },
  { id: "donki", label: "Donki 任買一次", short: "Donki 任買", weight: 20 },
  {
    id: "shopping30",
    label: "30 mins 任買一次",
    short: "30 分鐘任買",
    weight: 20,
  },
  { id: "oneShop", label: "同一間店任買一次", short: "一間店任買", weight: 25 },
  {
    id: "convenience",
    label: "便利店任買全個旅程",
    short: "便利店全旅程",
    weight: 25,
  },
];
function choosePrize(ticket) {
  let cumulative = 0;
  return PRIZES.find((p) => (cumulative += p.weight) > ticket);
}
function isReleased(manual, now = Date.now()) {
  return !!manual || now >= Date.parse(RELEASE_AT);
}
module.exports = { RELEASE_AT, PRIZES, choosePrize, isReleased };
