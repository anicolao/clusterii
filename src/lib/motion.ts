export const feedbackDuration = 180;
export interface MotionInspection {
  time: number;
  reduced: boolean;
}
export function feedbackMotion(
  node: HTMLElement,
  options: { key: string; inspect?: MotionInspection },
) {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let animation: Animation | undefined;
  let key: string | undefined;
  function update(next: typeof options) {
    options = next;
    if (key !== options.key) {
      animation?.cancel();
      key = options.key;
      animation = node.animate(
        [
          { opacity: 0.5, transform: "translateY(4px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: feedbackDuration, easing: "ease-out", fill: "both" },
      );
    }
    if (!animation) return;
    const current = animation;
    animation.onfinish = () => {
      if (!options.inspect) current.cancel();
    };
    if (options.inspect) {
      animation.pause();
      animation.currentTime = options.inspect.reduced
        ? feedbackDuration
        : Math.max(0, Math.min(feedbackDuration, options.inspect.time));
    } else if (preference.matches) animation.cancel();
  }
  const changed = () => update(options);
  preference.addEventListener("change", changed);
  update(options);
  return {
    update,
    destroy() {
      animation?.cancel();
      preference.removeEventListener("change", changed);
    },
  };
}
