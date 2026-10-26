import { appendFileSync, mkdirSync } from "node:fs";
export const phases = Object.freeze(["before-escape", "after-escape", "after-acknowledgement", "before-front", "after-front", "before-pointer", "after-pointer", "before-readiness", "after-readiness", "before-screen-fit", "after-screen-fit", "before-renderer-check", "after-renderer-check", "before-png", "after-png"]);
let count = 0;
/** Read-only diagnostic; no element mutation, focus call, input event or page text.
 * @param {import("@playwright/test").Page} page @param {string} phase @param {string} player */
export async function recordArrivalFocus(page, phase, player) {
  if (process.env.CLUSTER_ARRIVAL_FOCUS !== "1") return;
  if (!phases.includes(phase) || !["owner", "peer"].includes(player)) throw Error("Unapproved focus observation category");
  if (++count > 96) throw Error("Focus observation cap exceeded");
  const observation = await page.evaluate(() => {
    const target = document.querySelector('[data-focus="arrivals"]');
    const active = document.activeElement;
    /** @param {Element | null} element */
    const describe = (element) => {
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return {tag: element.tagName.toLowerCase(), isOpener: element === target, inArrivalPanel: !!element.closest('[aria-label="Arrival reports panel"]'), focusVisible: element.matches(":focus-visible"), outline: {style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, offset: style.outlineOffset}, bounds: {x:box.x,y:box.y,width:box.width,height:box.height}};
    };
    return {documentHasFocus: document.hasFocus(), visibility: document.visibilityState, openerFocused: active === target, activeElement: describe(active), opener: describe(target)};
  });
  mkdirSync("ci-evidence/arrival-focus", {recursive:true});
  appendFileSync("ci-evidence/arrival-focus/observations.ndjson", JSON.stringify({sequence:count, phase, player, ...observation}) + "\n");
}
