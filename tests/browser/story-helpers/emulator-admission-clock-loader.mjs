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
      "Admission clock is confined to demo-clusterii Functions Emulator",
    );
  let source = String(result.source);
  const replacements = [
    [
      "export function createCampaign(id, input, seed, now) {",
      "now = __admissionTime(input, now);",
    ],
    [
      "export function joinOrLeave(current, input, uid, profile, now) {",
      "now = __admissionTime(current, now);",
    ],
    [
      "export function startCampaign(current, now) {",
      "now = __admissionTime(current, now, true);",
    ],
  ];
  for (const [signature, injection] of replacements) {
    if (source.split(signature).length !== 2)
      throw new Error(
        "Admission clock reducer signature changed; review the test boundary",
      );
    source = source.replace(signature, signature + "\n" + injection);
  }
  return {
    ...result,
    source:
      `import { admissionTime as __admissionTime } from ${JSON.stringify(new URL("./admission-clock.mjs", import.meta.url).href)};\n` +
      source,
  };
}
