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
      "Travel clock is confined to demo-clusterii Functions Emulator",
    );
  const source = String(result.source);
  const signature = "export function orderRoute(current, raw, uid, id, now) {";
  if (source.split(signature).length !== 2)
    throw new Error(
      "Travel clock reducer signature changed; review the test boundary",
    );
  return {
    ...result,
    source:
      `import { fleetTime as __fleetTime } from ${JSON.stringify(new URL("./fleet-clock.mjs", import.meta.url).href)};\n` +
      source.replace(
        signature,
        signature + "\nnow = __fleetTime(current, now);",
      ),
  };
}
