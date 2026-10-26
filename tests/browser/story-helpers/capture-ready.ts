export interface MotionFrame {
  selector: string;
  count: number;
  time: number;
  duration: number;
}
/** Executed in the page for each capture, after the step's own acknowledgement. */
export async function captureReady(inspection: MotionFrame[] = []) {
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
    const declared = new Set<Animation>();
    for (const frame of inspection) {
      if (
        !Number.isInteger(frame.count) ||
        frame.count < 1 ||
        !Number.isFinite(frame.time) ||
        frame.time < 0 ||
        !Number.isFinite(frame.duration) ||
        frame.duration <= 0 ||
        frame.time > frame.duration
      )
        throw new Error("Invalid explicit motion frame");
      const roots = [...document.querySelectorAll(frame.selector)];
      const matches = document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element &&
          roots.some((root) => root.contains(target))
        );
      });
      if (matches.length !== frame.count)
        throw new Error("Explicit motion animation count differs");
      for (const animation of matches) {
        const timing = animation.effect!.getTiming();
        if (
          declared.has(animation) ||
          animation.playState !== "paused" ||
          animation.currentTime !== frame.time ||
          timing.duration !== frame.duration ||
          timing.iterations !== 1
        )
          throw new Error(
            "Explicit motion frame differs from declared paused time/duration",
          );
        declared.add(animation);
      }
    }
    const ordinary = active.filter((animation) => !declared.has(animation));
    if (ordinary.some((animation) => animation.playState === "paused"))
      throw new Error(
        "Stable capture has an undeclared paused animation; use a separate explicit animation inspection test.",
      );
    if (!ordinary.length) break;
    await Promise.all(
      ordinary.map((animation) => animation.finished.catch(() => undefined)),
    );
  }
}
