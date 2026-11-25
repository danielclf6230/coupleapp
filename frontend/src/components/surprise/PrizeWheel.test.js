import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import PrizeWheel from "./PrizeWheel";

const prizes = [1, 2, 3, 3, 4, 4].map((slices, index) => ({
  id: `prize-${index}`,
  label: `Prize ${index + 1}`,
  slices,
}));

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("wheel has 17 equal slices with repeated prize numbers and no percentages", () => {
  const { container } = render(<PrizeWheel prizes={prizes} />);
  const labels = Array.from(container.querySelectorAll(".sg-wheel-label"));
  expect(labels).toHaveLength(17);
  prizes.forEach((prize, index) => {
    expect(labels.filter((label) => label.textContent === String(index + 1))).toHaveLength(prize.slices);
  });
  labels.forEach((label, index) => {
    const rotation = Number(label.style.transform.match(/rotate\(([^)]+)deg\)/)[1]);
    expect(rotation).toBeCloseTo((index + 0.5) * 360 / 17);
  });
  expect(container.querySelectorAll(".sg-wheel-legend p")).toHaveLength(6);
  expect(container.textContent).not.toContain("%");
});

test("spin lands on a slice of the server prize and only then reveals the result", async () => {
  jest.useFakeTimers();
  jest.spyOn(Math, "random").mockReturnValue(0.99);
  const spin = jest.fn().mockResolvedValue({ prize: prizes[4] });
  const onResult = jest.fn();
  const { container, getByRole } = render(
    <PrizeWheel prizes={prizes} spin={spin} onResult={onResult} />,
  );
  await act(async () => fireEvent.click(getByRole("button", { name: "GO" })));
  expect(spin).toHaveBeenCalledTimes(1);
  const rotation = Number(container.querySelector(".sg-wheel").style.transform.match(/rotate\(([^)]+)deg\)/)[1]);
  const landingAngle = (360 - rotation % 360) % 360;
  const index = Math.floor(landingAngle / (360 / 17));
  expect(container.querySelectorAll(".sg-wheel-label")[index].textContent).toBe("5");
  act(() => jest.advanceTimersByTime(8999));
  expect(onResult).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onResult).toHaveBeenCalledTimes(1);
});
