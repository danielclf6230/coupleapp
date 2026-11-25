import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import api from "../api";
import SurpriseGame from "./SurpriseGame";

jest.mock("../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });

const originalObserver = global.ResizeObserver;
const originalScrollTo = HTMLElement.prototype.scrollTo;
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  HTMLElement.prototype.scrollTo = jest.fn();
});
afterAll(() => {
  global.ResizeObserver = originalObserver;
  HTMLElement.prototype.scrollTo = originalScrollTo;
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

function mockAccount(isDaniel) {
  let progress = { mission: 1, prize: null, recharge: null, approved: 0 };
  api.get.mockImplementation(async () => ({
    data: {
      visible: true,
      released: true,
      isDaniel,
      progress,
      prizes: [{ id: "test", label: "Test prize", slices: 1 }],
    },
  }));
  api.post.mockImplementation(async () => {
    progress = { ...progress, mission: progress.mission + 1 };
    return { data: { ok: true } };
  });
}

test("Daniel can skip every mission from its rules and reach the wheel", async () => {
  mockAccount(true);
  render(<SurpriseGame />);
  fireEvent.click(await screen.findByRole("button", { name: "開啟甜蜜挑戰禮物" }));
  for (let mission = 1; mission <= 4; mission++) {
    const skip = await screen.findByRole("button", {
      name: `Daniel 試玩：跳過第 ${mission} 關 →`,
    });
    fireEvent.click(skip);
    expect(api.post).toHaveBeenLastCalledWith(
      expect.stringContaining("/skip-test"),
      { mission },
    );
  }
  expect(await screen.findByRole("button", { name: "GO" })).toBeTruthy();
  expect(api.post).toHaveBeenCalledTimes(4);
});

test("other accounts have no skip control even if local storage claims to be Daniel", async () => {
  mockAccount(false);
  localStorage.setItem("user", JSON.stringify({ name: "Daniel" }));
  render(<SurpriseGame />);
  fireEvent.click(await screen.findByRole("button", { name: "開啟甜蜜挑戰禮物" }));
  await screen.findByRole("button", { name: "準備好！開始挑戰 ▶" });
  expect(screen.queryByRole("button", { name: /Daniel 試玩：跳過/ })).toBeNull();
});
