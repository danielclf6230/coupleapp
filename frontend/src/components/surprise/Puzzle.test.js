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
