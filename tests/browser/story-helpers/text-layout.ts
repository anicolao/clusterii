/** Read-only renderer evidence. Never used to settle, transform or accept an image. */
export function textLayout() {
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
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
    const style = getComputedStyle(element);
    const ancestors = [];
    for (
      let ancestor: Element | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const computed = getComputedStyle(ancestor);
      ancestors.push({
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
      });
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
