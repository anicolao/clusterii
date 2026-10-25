/** Read-only renderer evidence. Never used to settle, transform or accept an image. */
export function textLayout() {
  const texts = [];
  // This telemetry diagnoses the inherited identity-paragraph raster failure.
  // Galaxy text/labels do not belong to that investigation. All-screen geometry,
  // readiness and exact pixels remain independently enforced by the story helper.
  const root = document.querySelector('section[aria-label="Your identity"]');
  const limits = { visited: 512, texts: 128, ancestors: 32 };
  let visited = 0,
    truncated = false;
  const styles = new Map<Element, CSSStyleDeclaration>();
  const styleFor = (element: Element) => {
    let style = styles.get(element);
    if (!style) {
      style = getComputedStyle(element);
      styles.set(element, style);
    }
    return style;
  };
  const boxes = new Map<Element, object>();
  const walker = root
    ? document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    : null;
  for (let node = walker?.nextNode(); node; node = walker?.nextNode()) {
    if (++visited > limits.visited || texts.length >= limits.texts) {
      truncated = true;
      break;
    }
    const element = node.parentElement;
    if (!element || !node.textContent?.trim() || !element.checkVisibility())
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    if (
      !rects.some(
        (r) =>
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < innerHeight &&
          r.left < innerWidth,
      )
    )
      continue;
    const style = styleFor(element);
    const ancestors = [];
    for (
      let ancestor: Element | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (ancestors.length >= limits.ancestors) {
        truncated = true;
        break;
      }
      let evidence = boxes.get(ancestor);
      if (!evidence) {
        const computed = styleFor(ancestor);
        evidence = {
          tag: ancestor.tagName,
          id: ancestor.id,
          class: ancestor.getAttribute("class"),
          box: ancestor.getBoundingClientRect().toJSON(),
          scroll: [ancestor.scrollLeft, ancestor.scrollTop],
          transform: computed.transform,
          zoom: computed.zoom,
          filter: computed.filter,
          backdropFilter: computed.backdropFilter,
          contain: computed.contain,
        };
        boxes.set(ancestor, evidence);
      }
      ancestors.push(evidence);
    }
    texts.push({
      text: node.textContent,
      rects: rects.map((r) => r.toJSON()),
      font: style.font,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      fontKerning: style.fontKerning,
      fontFeatureSettings: style.fontFeatureSettings,
      fontVariationSettings: style.fontVariationSettings,
      textRendering: style.textRendering,
      ancestors,
    });
  }
  return {
    scope: "identity-raster",
    applicable: root !== null,
    limits,
    visited: Math.min(visited, limits.visited),
    truncated,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    fontStatus: document.fonts.status,
    fonts: [...document.fonts].map((font) => ({
      family: font.family,
      style: font.style,
      weight: font.weight,
      status: font.status,
    })),
    texts,
  };
}
