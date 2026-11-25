import React from "react";
import { fireEvent, render } from "@testing-library/react";
import Puzzle from "./Puzzle";

test("both rounds keep tray positions and the next button reserved as pieces are placed", () => {
  const onWin = jest.fn();
  const { container } = render(<Puzzle onWin={onWin} busy={false} />);
  const tray = container.querySelector(".sg-puzzle-tray");
  const next = container.querySelector(".sg-puzzle-next");
  const pieces = Array.from(tray.children);
  const labels = pieces.map((piece) => piece.getAttribute("aria-label"));
  const firstPhoto = container.querySelector(".sg-puzzle-reference").src;

  for (let round = 0; round < 2; round++) {
    expect(next.disabled).toBe(true);
    expect(next.getAttribute("aria-hidden")).toBe("true");
    const reference = container.querySelector(".sg-puzzle-reference");
    if (round === 1) expect(reference.src).not.toBe(firstPhoto);
    const roundPieces = Array.from(tray.children);
    const positions = roundPieces.map((piece) => piece.getAttribute("style"));

    // A wrong slot leaves the piece available.
    fireEvent.click(roundPieces[0]);
    const firstIndex = Number(roundPieces[0].getAttribute("aria-label").match(/\d+/)[0]) - 1;
    fireEvent.click(container.querySelector(`[data-sg-slot="${(firstIndex + 1) % 9}"]`));
    expect(container.querySelectorAll(".sg-placed")).toHaveLength(0);

    for (const piece of roundPieces) {
      const index = Number(piece.getAttribute("aria-label").match(/\d+/)[0]) - 1;
      fireEvent.click(piece);
      fireEvent.click(container.querySelector(`[data-sg-slot="${index}"]`));
      expect(piece.disabled).toBe(true);
      expect(piece.classList.contains("sg-piece-used")).toBe(true);
      expect(Array.from(tray.children)).toEqual(roundPieces);
      expect(roundPieces.map((item) => item.getAttribute("style"))).toEqual(positions);
      expect(container.querySelector(`[data-sg-slot="${index}"] img`).src).toBe(reference.src);
    }

    expect(container.querySelectorAll(".sg-placed")).toHaveLength(9);
    expect(next.disabled).toBe(false);
    expect(next.getAttribute("aria-hidden")).toBe("false");
    if (round === 0) {
      expect(Array.from(tray.children).map((piece) => piece.getAttribute("aria-label"))).toEqual(labels);
    }
    fireEvent.click(next);
  }
  expect(onWin).toHaveBeenCalledTimes(1);
});

test("dragging lifts a scattered piece at board-cell size and returns it after a wrong drop", () => {
  const { container } = render(<Puzzle onWin={jest.fn()} busy={false} />);
  const piece = container.querySelector(".sg-puzzle-tray button");
  const index = Number(piece.getAttribute("aria-label").match(/\d+/)[0]) - 1;
  const slot = container.querySelector(`[data-sg-slot="${index}"]`);
  const wrongSlot = container.querySelector(`[data-sg-slot="${(index + 1) % 9}"]`);
  const originalStyle = piece.getAttribute("style");
  piece.setPointerCapture = jest.fn();
  const originalHitTest = document.elementFromPoint;
  document.elementFromPoint = jest.fn().mockReturnValue(wrongSlot);
  const measurement = jest.spyOn(container.querySelector("[data-sg-slot]"), "getBoundingClientRect").mockReturnValue({ width: 96 });
  const pointer = (type, x, y) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true } });
    fireEvent(piece, event);
  };
  try {
    for (const target of [wrongSlot, slot]) {
      document.elementFromPoint.mockReturnValue(target);
      pointer("pointerdown", 100, 100);
      pointer("pointermove", 150, 150);
      expect(document.querySelector(".sg-puzzle-ghost").style.width).toBe("96px");
      expect(piece.classList.contains("sg-piece-lifted")).toBe(true);
      expect(target.classList.contains("sg-drop-target")).toBe(true);
      pointer("pointerup", 150, 150);
      expect(document.querySelector(".sg-puzzle-ghost")).toBeNull();
      expect(piece.classList.contains("sg-piece-lifted")).toBe(false);
      expect(piece.getAttribute("style")).toBe(originalStyle);
      expect(slot.classList.contains("sg-placed")).toBe(target === slot);
    }
  } finally {
    document.elementFromPoint = originalHitTest;
    measurement.mockRestore();
  }
});
