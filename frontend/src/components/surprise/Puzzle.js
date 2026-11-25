import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import photo1 from "../../images/surprise/puzzle-1.png";
import photo2 from "../../images/surprise/puzzle-2.png";
const photos = [photo1, photo2];
const scramble = () =>
  Array.from({ length: 9 }, (_, i) => i).sort(() => Math.random() - 0.5);
function PieceImage({ photo, index }) {
  return (
    <img
      className="sg-piece-image"
      src={photo}
      alt=""
      draggable={false}
      style={{
        left: `${-(index % 3) * 100}%`,
        top: `${-Math.floor(index / 3) * 100}%`,
      }}
    />
  );
}
export default function Puzzle({ onWin, busy }) {
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState([]);
  const [order, setOrder] = useState(scramble);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState("拖動拼圖去正確位置，或者點拼圖再點格仔。");
  const [ghost, setGhost] = useState(null);
  const drag = useRef(null);
  const complete = placed.length === 9;
  const place = (piece, slot) => {
    if (piece == null || placed.includes(piece)) return;
    if (piece !== slot) {
      setHint("差少少！睇清楚相片，再試一次 💛");
      return;
    }
    setPlaced((p) => (p.includes(piece) ? p : [...p, piece]));
    setSelected(null);
    setHint("叮！放啱喇 ✨");
  };
  return (
    <div className="sg-puzzle-game">
      <div className="sg-stats">
        <span>回憶 {round + 1} / 2</span>
        <span>{placed.length} / 9 塊</span>
      </div>
      <div className={`sg-puzzle-board ${complete ? "sg-puzzle-done" : ""}`}>
        <img
          className="sg-puzzle-reference"
          src={photos[round]}
          alt=""
          draggable={false}
        />
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            data-sg-slot={i}
            className={placed.includes(i) ? "sg-placed" : "sg-empty"}
            aria-label={`第 ${i + 1} 格${placed.includes(i) ? "，已完成" : ""}`}
            onClick={() => place(selected, i)}
          >
            {placed.includes(i) && (
              <PieceImage photo={photos[round]} index={i} />
            )}
            {!placed.includes(i) && <span>{i + 1}</span>}
          </button>
        ))}
      </div>
      <p className="sg-hint" role="status">
        {complete ? "一齊嘅回憶，拼埋最完美 💗" : hint}
      </p>
      {/* Reserve tray cells so FittedPage does not rescale after each placement. */}
      <div className="sg-puzzle-tray">
        {order.map((i) => (
          <button
            key={i}
            disabled={placed.includes(i)}
            aria-hidden={placed.includes(i)}
            aria-label={`拼圖 ${i + 1}`}
            aria-pressed={selected === i}
            className={
              placed.includes(i)
                ? "sg-piece-used"
                : selected === i
                  ? "sg-selected"
                  : ""
            }
            onClick={() => setSelected(i)}
            onPointerDown={(e) => {
              setSelected(i);
              drag.current = { i, x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (
                drag.current &&
                Math.hypot(
                  e.clientX - drag.current.x,
                  e.clientY - drag.current.y,
                ) > 6
              )
                setGhost({ i, x: e.clientX, y: e.clientY });
            }}
            onPointerCancel={() => {
              drag.current = null;
              setGhost(null);
            }}
            onPointerUp={(e) => {
              if (drag.current) {
                const target = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest("[data-sg-slot]");
                if (target) place(i, Number(target.dataset.sgSlot));
              }
              drag.current = null;
              setGhost(null);
            }}
          >
            <PieceImage photo={photos[round]} index={i} />
          </button>
        ))}
      </div>
      {ghost &&
        createPortal(
          <div
            className="sg-puzzle-ghost"
            style={{
              left: ghost.x,
              top: ghost.y,
            }}
          >
            <PieceImage photo={photos[round]} index={ghost.i} />
          </div>,
          document.body,
        )}
      {/* Reserve the completion action's height throughout the round too. */}
      <button
        className={`sg-puzzle-next ${complete ? "" : "sg-puzzle-next-hidden"}`}
        aria-hidden={!complete}
        disabled={busy || !complete}
        onClick={() => {
          if (round === 1) onWin();
          else {
            setRound(1);
            setPlaced([]);
            setOrder(scramble());
            setSelected(null);
            setHint("第二張回憶，繼續加油！");
          }
        }}
      >
        {round === 0 ? "✨ 第一張完成！下一張回憶" : "完成拼圖挑戰 ✨"}
      </button>
    </div>
  );
}
