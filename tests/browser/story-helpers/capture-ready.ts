/** Executed in the page for each capture, after the step's own acknowledgement. */
export async function captureReady() {
  await document.fonts.ready;
  const visible = (element: Element) => {
    const b = element.getBoundingClientRect(),
      style = getComputedStyle(element);
    return (
      b.width > 0 &&
      b.height > 0 &&
      b.right > 0 &&
      b.bottom > 0 &&
      b.left < innerWidth &&
      b.top < innerHeight &&
      style.visibility === "visible" &&
      style.display !== "none"
    );
  };
  const decoded = new Map<string, Promise<void>>();
  function decode(image: HTMLImageElement) {
    const source = image.currentSrc || image.src;
    if (!image.complete || !image.naturalWidth || !decoded.has(source))
      decoded.set(source, image.decode());
    return decoded.get(source)!;
  }
  const images = [...document.images].filter(visible),
    backgrounds = new Set<string>();
  for (const element of document.querySelectorAll("*")) {
    if (!visible(element)) continue;
    for (const pseudo of [null, "::before", "::after"]) {
      for (const match of getComputedStyle(
        element,
        pseudo,
      ).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))
        backgrounds.add(match[1]);
    }
  }
  await Promise.all([
    ...images.map(decode),
    ...[...backgrounds].map((source) => {
      if (decoded.has(source)) return decoded.get(source)!;
      const image = new Image();
      image.src = source;
      return decode(image);
    }),
  ]);
  // A completion callback may schedule another finite effect. Reinspect rather
  // than assuming the first animation list represents the entire transition.
  while (true) {
    const active = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState !== "finished" && animation.playState !== "idle",
      );
    if (
      active.some(
        (animation) =>
          !Number.isFinite(
            Number(animation.effect?.getComputedTiming().endTime),
          ),
      )
    )
      throw new Error(
        "Stable capture has an active infinite animation. Reduced motion must settle decorative animation.",
      );
    if (active.some((animation) => animation.playState === "paused"))
      throw new Error(
        "Stable capture has a paused animation; use a separate explicit animation inspection test.",
      );
    if (!active.length) break;
    await Promise.all(
      active.map((animation) => animation.finished.catch(() => undefined)),
    );
  }
}
