import React, { useCallback, useEffect, useRef, useState } from "react";
import { FALL_INTERVAL, newGame, move } from "./tetrisEngine";

export default function Tetris({
  onWin,
  progress,
  requestRecharge,
  consumeRecharge,
  busy,
}) {
  const [game, setGame] = useState(newGame);
  const [deadline, setDeadline] = useState(() => Date.now() + 180000);
  const [remaining, setRemaining] = useState(180);
  const won = useRef(false);
  const expired = remaining <= 0;
  const ended = expired || game.over;
  const waiting = !!progress.recharge;
  const [rechargeCountdown, setRechargeCountdown] = useState(3);
  useEffect(() => {
    if (!progress.recharge) return;
    const readyAt = Date.now() + 3000;
    setRechargeCountdown(3);
    const tick = () =>
      setRechargeCountdown(
        Math.max(0, Math.ceil((readyAt - Date.now()) / 1000)),
      );
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [progress.recharge]);
  const act = useCallback(
    (action) => {
      if (!ended && !waiting && !won.current) setGame((g) => move(g, action));
    },
    [ended, waiting],
  );
  useEffect(() => {
    const id = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      200,
    );
    return () => clearInterval(id);
  }, [deadline]);
  useEffect(() => {
    const id = setInterval(() => act("tick"), FALL_INTERVAL);
    return () => clearInterval(id);
  }, [act]);
  useEffect(() => {
    if (game.score > 915 && !won.current) {
      won.current = true;
      onWin();
    }
  }, [game.score, onWin]);
  useEffect(() => {
    const listener = (e) => {
      if (e.key === " " && e.target.closest?.("button")) return;
      const actions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "rotate",
        ArrowDown: "down",
        " ": "drop",
      };
      if (actions[e.key]) {
        e.preventDefault();
        act(actions[e.key]);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [act]);
  const recharge = async () => {
    if (rechargeCountdown > 0) return;
    const result = await consumeRecharge();
    if (!result) return;
    if (result.kind === "restart") setGame(newGame());
    const seconds =
      result.kind === "restart"
        ? 180
        : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) + 60;
    setDeadline(Date.now() + seconds * 1000);
    setRemaining(seconds);
  };
  const cells = game.board.map((row) => [...row]);
  game.piece.shape.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell && cells[game.piece.y + y])
        cells[game.piece.y + y][game.piece.x + x] = cell;
    }),
  );
  return (
    <div className="sg-tetris-game">
      <div className="sg-stats">
        <span>
          分數 <b>{game.score}</b> / 0915
        </span>
        <span>⏱ {remaining}s</span>
      </div>
      <div className="sg-meter">
        <i style={{ width: `${Math.min(100, (game.score / 916) * 100)}%` }} />
      </div>
      {!waiting && !ended && (
        <div className="sg-tetris" aria-label="俄羅斯方塊遊戲區">
          {cells.flat().map((cell, i) => (
            <i key={i} className={`sg-block sg-color-${cell}`} />
          ))}
        </div>
      )}
      {game.score > 915 ? (
        <p>
          挑戰成功！{!busy && <button onClick={onWin}>儲存過關進度</button>}
        </p>
      ) : waiting ? (
        <div className="sg-card" role="status">
          <h3>
            {progress.recharge === "restart"
              ? "💋 重新挑戰充值站"
              : "💋 加時充值站"}
          </h3>
          <p>錫 Daniel {progress.recharge === "time" ? "3" : "5"} 啖！</p>
          <p>
            {rechargeCountdown > 0
              ? `${rechargeCountdown} 秒後就可以撳下面個掣…`
              : "愛心已到帳，可以開始喇！"}
          </p>
          <button disabled={rechargeCountdown > 0 || busy} onClick={recharge}>
            {progress.recharge === "restart" ? "重新挑戰" : "繼續挑戰"}
          </button>
        </div>
      ) : game.over ? (
        <div className="sg-card" role="status">
          <div className="sg-large-icon">💋</div>
          <h3>你輸咗！方塊堆滿咗 💗</h3>
          <p>錫 Daniel 5 啖，充值後等 3 秒就可以由頭再挑戰！</p>
          <button disabled={busy} onClick={() => requestRecharge("restart")}>
            錫 5 啖 · 重新挑戰
          </button>
        </div>
      ) : expired ? (
        <div className="sg-card">
          <div className="sg-large-icon">💋</div>
          <h3>時間到！愛心充值再挑戰 💗</h3>
          <p>仲差少少！加時會保留方塊同分數。</p>
          <button disabled={busy} onClick={() => requestRecharge("time")}>
            錫 3 啖 · 加 60 秒
          </button>
          <button
            className="sg-secondary"
            disabled={busy}
            onClick={() => requestRecharge("restart")}
          >
            錫 5 啖 · 重新挑戰
          </button>
        </div>
      ) : (
        <>
          <div className="sg-controls">
            {[
              ["left", "◀", "向左"],
              ["rotate", "↻", "旋轉"],
              ["right", "▶", "向右"],
              ["down", "↓", "向下"],
              ["drop", "⤓", "直接落下"],
            ].map(([action, icon, label]) => (
              <button
                key={action}
                aria-label={label}
                onClick={() => act(action)}
              >
                {icon}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
