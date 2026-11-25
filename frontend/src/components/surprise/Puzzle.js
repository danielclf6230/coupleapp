import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import photo1 from "../../images/surprise/puzzle-1.png";
import photo2 from "../../images/surprise/puzzle-2.png";
const photos = [photo1, photo2];
const scramble = () =>
  Array.from({ length: 9 }, (_, i) => i).sort(() => Math.random() - 0.5);
const scatter = () => {
  const positions = [];
  for (let i = 0; i < 9; i++) {
    // Choose a random spot with room around it, allowing a little natural overlap.
    const candidates = Array.from({ length: 36 }, () => ({
      x: 4 + Math.random() * 67,
      y: 6 + Math.random() * 60,
    }));
    const distance = (point) => Math.min(...positions.map((other) =>
      (point.x - other.x) ** 2 + ((point.y - other.y) / 1.15) ** 2,
    ));
    const point = candidates.reduce((best, next) => distance(next) > distance(best) ? next : best);
    positions.push({
      ...point,
      angle: (5 + Math.random() * 10) * (Math.random() < 0.5 ? -1 : 1),
    });
  }
  return positions;
};
function slotAt(x, y, board) {
  const slot = document.elementFromPoint(x, y)?.closest("[data-sg-slot]");
  return slot && board?.contains(slot) ? Number(slot.dataset.sgSlot) : null;
}
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
  const [layout, setLayout] = useState(scatter);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState("拖動拼圖去正確位置，或者點拼圖再點格仔。");
  const [ghost, setGhost] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const board = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const dragging = ghost !== null;
  // Keep a large board usable on short phones while a finger holds a piece.
  useEffect(() => {
    if (!dragging) return;
    const viewport = board.current?.closest(".sg-page-scrollable");
    if (!viewport) return;
    let frame;
    const scroll = () => {
      if (drag.current) {
        const bounds = viewport.getBoundingClientRect();
        const y = drag.current.y;
        if (y < bounds.top + 56) viewport.scrollTop -= 8;
        else if (y > bounds.bottom - 56) viewport.scrollTop += 8;
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);
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
      <div ref={board} className={`sg-puzzle-board ${complete ? "sg-puzzle-done" : ""}`}>
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
            className={`${placed.includes(i) ? "sg-placed" : "sg-empty"} ${hoverSlot === i ? "sg-drop-target" : ""}`}
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
      {/* Positions stay fixed until the next photo, even as pieces are used. */}
      <div className="sg-puzzle-tray" aria-label="拼圖小桌">
        {order.map((i, position) => (
          <button
            key={i}
            disabled={placed.includes(i)}
            aria-hidden={placed.includes(i)}
            aria-label={`拼圖 ${i + 1}`}
            aria-pressed={selected === i}
            style={{
              "--sg-piece-x": `${layout[position].x}%`,
              "--sg-piece-y": `${layout[position].y}%`,
              "--sg-piece-angle": `${layout[position].angle}deg`,
            }}
            className={`${
              placed.includes(i)
                ? "sg-piece-used"
                : selected === i
                  ? "sg-selected"
                  : ""
            } ${ghost?.i === i ? "sg-piece-lifted" : ""}`}
            onClick={() => {
              if (suppressClick.current) suppressClick.current = false;
              else setSelected(i);
            }}
            onPointerDown={(e) => {
              if (!e.isPrimary || e.button !== 0) return;
              suppressClick.current = false;
              setSelected(i);
              const size = board.current.querySelector("button").getBoundingClientRect().width;
              drag.current = { i, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, size, moved: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const current = drag.current;
              if (!current || current.pointerId !== e.pointerId) return;
              current.x = e.clientX;
              current.y = e.clientY;
              if (Math.hypot(e.clientX - current.startX, e.clientY - current.startY) > 6) current.moved = true;
              if (current.moved) {
                setGhost({ i, x: e.clientX, y: e.clientY, size: current.size, angle: layout[position].angle });
                setHoverSlot(slotAt(e.clientX, e.clientY, board.current));
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
              setGhost(null);
              setSelected(null);
              setHoverSlot(null);
            }}
            onPointerUp={(e) => {
              if (!drag.current || drag.current.pointerId !== e.pointerId) return;
              const moved = drag.current.moved;
              if (moved) {
                suppressClick.current = true;
                const slot = slotAt(e.clientX, e.clientY, board.current);
                if (slot !== null) place(i, slot);
                setSelected(null);
              }
              drag.current = null;
              setGhost(null);
              setHoverSlot(null);
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
              width: ghost.size,
              height: ghost.size,
              "--sg-piece-angle": `${ghost.angle}deg`,
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
            setLayout(scatter());
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
