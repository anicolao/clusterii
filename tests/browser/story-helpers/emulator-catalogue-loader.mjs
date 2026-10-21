// Test-only module instrumentation, installed by the story runner. The shipped
// reducer and functions build remain untouched. Only catalogue entropy changes;
// cryptographic keys/nonces and command/service authorization remain real.
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
      "Fixed story catalogue is confined to demo-clusterii Functions Emulator",
    );
  const source = String(result.source),
    signature = "export function createCampaign(id, input, seed, now) {";
  if (source.split(signature).length !== 2)
    throw new Error(
      "Campaign test-boundary signature changed; review the catalogue instrumentation",
    );
  return {
    ...result,
    source: source.replace(
      signature,
      signature +
        '\n seed = "0123456789abcdef".repeat(4); // Explicit story catalogue input only.\n',
    ),
  };
}
