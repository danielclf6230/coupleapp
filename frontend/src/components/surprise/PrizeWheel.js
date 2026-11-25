import React, { useEffect, useRef, useState } from "react";
const SPIN_DURATION_MS = 9000;
const COLORS = [
  "#ffca65",
  "#ff9db3",
  "#b7dcd1",
  "#ffe8a3",
  "#cfbef0",
  "#f6b98d",
];
export default function PrizeWheel({ prizes, spin, onResult, busy }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timeout = useRef();
  useEffect(() => () => clearTimeout(timeout.current), []);
  let cursor = 0;
  const segments = prizes.map((p, i) => {
    const start = cursor;
    cursor += p.weight * 3.6;
    return { ...p, start, end: cursor, color: COLORS[i] };
  });
  const go = async () => {
    if (spinning || busy) return;
    setSpinning(true);
    const result = await spin();
    if (!result) {
      setSpinning(false);
      return;
    }
    const segment = segments.find((s) => s.id === result.prize.id);
    setRotation(360 * 10 + 360 - (segment.start + segment.end) / 2);
    timeout.current = setTimeout(onResult, SPIN_DURATION_MS);
  };
  return (
    <div className="sg-wheel-scene">
      <p className="sg-eyebrow">THE GRAND PRIZE</p>
      <h2>幸福幸運大轉盤</h2>
      <p>四關全破！你嘅專屬獎品即將揭曉 ✨</p>
      <div className="sg-wheel-wrap">
        <div className="sg-pointer">▼</div>
        <div
          className="sg-wheel"
          style={{
            "--sg-spin-duration": `${SPIN_DURATION_MS}ms`,
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(${segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(",")})`,
          }}
        >
          {segments.map((s, i) => (
            <span
              key={s.id}
              className="sg-wheel-label"
              style={{
                transform: `rotate(${(s.start + s.end) / 2}deg) translateY(calc(var(--sg-wheel-size) * -0.375))`,
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="sg-wheel-hub">
          <button
            className="sg-wheel-center"
            disabled={spinning || busy}
            onClick={go}
          >
            {spinning ? "♡" : "GO"}
          </button>
        </div>
      </div>
      <p role="status">
        {spinning
          ? "好緊張呀…會係邊份大獎呢？"
          : "撳 GO 或下面按鈕，抽你嘅幸福大獎！"}
      </p>
      <button disabled={spinning || busy} onClick={go}>
        {spinning ? "幸運轉動中…" : "轉出我嘅大獎 ✨"}
      </button>
      <div className="sg-wheel-legend">
        {segments.map((s, i) => (
          <p key={s.id}>
            <i style={{ background: s.color }} />
            {i + 1}. {s.label}
            <small>{s.weight}%</small>
          </p>
        ))}
      </div>
    </div>
  );
}
