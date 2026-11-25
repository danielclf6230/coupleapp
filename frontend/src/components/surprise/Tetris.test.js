import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import Tetris from "./Tetris";
import * as engine from "./tetrisEngine";

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("timeout offers separate actions and time recharge unlocks after three seconds without approval", async () => {
  jest.useFakeTimers();
  jest.spyOn(engine, "move").mockImplementation((game) => game);
  const requestRecharge = jest.fn();
  const consumeRecharge = jest.fn().mockResolvedValue({ kind: "time" });
  const { unmount, rerender } = render(
    <Tetris
      onWin={jest.fn()}
      progress={{}}
      busy={false}
      requestRecharge={requestRecharge}
      consumeRecharge={consumeRecharge}
    />,
  );
  expect(screen.queryByText(/充值/)).toBeNull();
  act(() => jest.advanceTimersByTime(179000));
  expect(screen.queryByText("錫 3 啖 · 加 60 秒")).toBeNull();
  act(() => jest.advanceTimersByTime(1000));
  const addTime = screen.getByRole("button", { name: "錫 3 啖 · 加 60 秒" });
  expect(
    screen.getByRole("button", { name: "錫 5 啖 · 重新挑戰" }),
  ).toBeTruthy();
  expect(screen.queryByText(/每啖|3 秒/)).toBeNull();
  fireEvent.click(addTime);
  expect(requestRecharge).toHaveBeenCalledWith("time");
  const props = {
    onWin: jest.fn(),
    progress: { recharge: "time", approved: 0 },
    busy: false,
    requestRecharge,
    consumeRecharge,
  };
  rerender(<Tetris {...props} />);
  expect(screen.getByRole("button", { name: "繼續挑戰" }).disabled).toBe(true);
  act(() => jest.advanceTimersByTime(2999));
  expect(screen.getByRole("button", { name: "繼續挑戰" }).disabled).toBe(true);
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByRole("button", { name: "繼續挑戰" }).disabled).toBe(false);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "繼續挑戰" })),
  );
  expect(consumeRecharge).toHaveBeenCalledTimes(1);
  rerender(<Tetris {...props} progress={{}} />);
  expect(screen.getByText("⏱ 60s")).toBeTruthy();
  expect(screen.getByRole("button", { name: "直接落下" })).toBeTruthy();
  unmount();
  jest.useRealTimers();
});

test("loss immediately offers only a five-kiss restart, unlocking without approval after three seconds", async () => {
  jest.useFakeTimers();
  jest.spyOn(Math, "random").mockReturnValue(0.2);
  const requestRecharge = jest.fn();
  const props = {
    onWin: jest.fn(),
    progress: {},
    busy: false,
    requestRecharge,
    consumeRecharge: jest.fn().mockResolvedValue({ kind: "restart" }),
  };
  const { rerender } = render(<Tetris {...props} />);
  expect(screen.getByLabelText("俄羅斯方塊遊戲區").children).toHaveLength(180);
  for (let i = 0; i < 9; i++)
    fireEvent.click(screen.getByRole("button", { name: "直接落下" }));
  expect(screen.getByText("你輸咗！方塊堆滿咗 💗")).toBeTruthy();
  expect(screen.getByText("⏱ 180s")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "錫 3 啖 · 加 60 秒" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "錫 5 啖 · 重新挑戰" }));
  expect(requestRecharge).toHaveBeenCalledWith("restart");
  rerender(
    <Tetris {...props} progress={{ recharge: "restart", approved: 0 }} />,
  );
  expect(screen.queryByRole("button", { name: "繼續挑戰" })).toBeNull();
  expect(screen.getByRole("button", { name: "重新挑戰" }).disabled).toBe(true);
  act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByRole("button", { name: "重新挑戰" }).disabled).toBe(false);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "重新挑戰" })),
  );
  rerender(<Tetris {...props} />);
  expect(screen.getByRole("button", { name: "直接落下" })).toBeTruthy();
  expect(screen.getByText("⏱ 180s")).toBeTruthy();
});

test("automatic falling waits 1100ms between moves", () => {
  jest.useFakeTimers();
  const move = jest.spyOn(engine, "move").mockImplementation((game) => game);
  render(
    <Tetris
      onWin={jest.fn()}
      progress={{}}
      busy={false}
      requestRecharge={jest.fn()}
      consumeRecharge={jest.fn()}
    />,
  );
  act(() => jest.advanceTimersByTime(1099));
  expect(move).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(move).toHaveBeenCalledWith(expect.any(Object), "tick");
});
