import { useEffect } from "react";

// Safari's visible area changes with its toolbars, keyboard and orientation.
export function trackAppViewport() {
  const viewport = window.visualViewport;
  const update = () => {
    const style = document.documentElement.style;
    style.setProperty("--app-viewport-height", `${viewport?.height || window.innerHeight}px`);
    style.setProperty("--app-viewport-top", `${viewport?.offsetTop || 0}px`);
  };
  const preventZoom = (event) => event.preventDefault();
  update();
  window.addEventListener("resize", update);
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  // Safari can ignore viewport scaling limits; cancel its page zoom gestures.
  document.addEventListener("gesturestart", preventZoom, { passive: false });
  document.addEventListener("gesturechange", preventZoom, { passive: false });
  return () => {
    window.removeEventListener("resize", update);
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
    document.removeEventListener("gesturestart", preventZoom);
    document.removeEventListener("gesturechange", preventZoom);
  };
}

export default function useAppViewport() {
  useEffect(trackAppViewport, []);
}
