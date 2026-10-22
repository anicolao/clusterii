let target;
export function initialize(data) {
  target = data.target;
}
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (url !== target) return result;
  if (
    process.env.FUNCTIONS_EMULATOR !== "true" ||
    process.env.GCLOUD_PROJECT !== "demo-clusterii"
  )
    throw new Error(
      "Construction clock is confined to demo-clusterii Functions Emulator",
    );
  const source = String(result.source);
  let transformed = source;
  for (const name of ["orderConstruction", "selectMarketFocus"]) {
    const signature = `export function ${name}(current, input, uid, commandId, now) {`;
    if (source.split(signature).length !== 2)
      throw new Error(
        "Construction/focus clock reducer signature changed; review the test boundary",
      );
    transformed = transformed.replace(
      signature,
      signature + "\nnow = __constructionTime(current, now);",
    );
  }
  return {
    ...result,
    source:
      `import { constructionTime as __constructionTime } from ${JSON.stringify(new URL("./construction-clock.mjs", import.meta.url).href)};\n` +
      transformed,
  };
}
