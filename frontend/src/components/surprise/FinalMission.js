import React, { useEffect, useState } from "react";
export default function FinalMission({ onWin, busy }) {
  const [deadline, setDeadline] = useState(null);
  const [left, setLeft] = useState(1800);
  useEffect(() => {
    if (!deadline) return;
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <div className="sg-final">
      <div className="sg-large-icon">⏳</div>
      <p>你同終極大獎，只差呢一步！</p>
      <div className={`sg-timer ${left < 60 ? "sg-urgent" : ""}`}>
        {String(Math.floor(left / 60)).padStart(2, "0")}
        <span>:</span>
        {String(left % 60).padStart(2, "0")}
      </div>
      <p>
        {!deadline
          ? "搵 Daniel 領取任務，準備好先開始。"
          : left
            ? "計時中！加油，我等你完成 💗"
            : "時間到！再準備一次，重新挑戰。"}
      </p>
      <button
        disabled={busy}
        onClick={() => {
          if (!deadline || !left) {
            setLeft(1800);
            setDeadline(Date.now() + 1800000);
          } else if (Date.now() < deadline) onWin();
        }}
      >
        {!deadline ? "開始任務 ▶" : !left ? "重新挑戰" : "完成任務 ✓"}
      </button>
    </div>
  );
}
