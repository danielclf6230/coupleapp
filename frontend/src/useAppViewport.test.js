import { trackAppViewport } from "./useAppViewport";

test("tracks visible viewport changes and blocks Safari zoom gestures until cleanup", () => {
  const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
  const viewport = new EventTarget();
  viewport.height = 844;
  viewport.offsetTop = 0;
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  const stop = trackAppViewport();
  try {
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--app-viewport-height")).toBe("844px");
    viewport.height = 500;
    viewport.offsetTop = 24;
    viewport.dispatchEvent(new Event("resize"));
    expect(style.getPropertyValue("--app-viewport-height")).toBe("500px");
    expect(style.getPropertyValue("--app-viewport-top")).toBe("24px");
    const gesture = new Event("gesturestart", { cancelable: true });
    document.dispatchEvent(gesture);
    expect(gesture.defaultPrevented).toBe(true);
    stop();
    viewport.height = 700;
    viewport.dispatchEvent(new Event("resize"));
    expect(style.getPropertyValue("--app-viewport-height")).toBe("500px");
    const after = new Event("gesturestart", { cancelable: true });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  } finally {
    stop();
    if (original) Object.defineProperty(window, "visualViewport", original);
    else delete window.visualViewport;
    document.documentElement.style.removeProperty("--app-viewport-height");
    document.documentElement.style.removeProperty("--app-viewport-top");
  }
});

test("falls back to window height when VisualViewport is unavailable", () => {
  const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  const stop = trackAppViewport();
  try {
    expect(document.documentElement.style.getPropertyValue("--app-viewport-height")).toBe(`${window.innerHeight}px`);
  } finally {
    stop();
    if (original) Object.defineProperty(window, "visualViewport", original);
    else delete window.visualViewport;
    document.documentElement.style.removeProperty("--app-viewport-height");
    document.documentElement.style.removeProperty("--app-viewport-top");
  }
});
