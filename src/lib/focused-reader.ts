import { tick } from "svelte";

// Keep the complete focused control and outline inside its bounded reader.
// This never changes focus or the outer document position.
export function keepFocusedControlVisible(region: HTMLDivElement) {
  let connected = true;
  const reveal = () => {
    const control = document.activeElement;
    if (
      !connected ||
      !region.clientHeight ||
      !(control instanceof HTMLElement) ||
      control === region ||
      !region.contains(control)
    )
      return;
    const bounds = control.getBoundingClientRect();
    const viewport = region.getBoundingClientRect();
    const style = getComputedStyle(control);
    const ring = control.matches(":focus-visible")
      ? Math.max(
          0,
          parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
        )
      : 0;
    const top = viewport.top + region.clientTop;
    const bottom = top + region.clientHeight;
    // Only adjust this bounded reader; preserve keyboard focus and page position.
    if (bounds.top - ring < top)
      region.scrollTop += Math.floor(bounds.top - ring - top);
    else if (bounds.bottom + ring > bottom)
      region.scrollTop += Math.ceil(bounds.bottom + ring - bottom);
  };
  const afterUpdate = () => {
    void tick().then(reveal);
  };
  const observer = new ResizeObserver(reveal);
  observer.observe(region);
  region.addEventListener("focusin", afterUpdate);
  region.addEventListener("input", afterUpdate);
  return {
    destroy() {
      connected = false;
      observer.disconnect();
      region.removeEventListener("focusin", afterUpdate);
      region.removeEventListener("input", afterUpdate);
    },
  };
}
