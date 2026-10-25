import { registerHooks } from "node:module";
import { instrumentObservationSource } from "./route-observation-inputs.mjs";
// Installed only by the illustrated interrupted-route story before loading the real service.
// The hook never edits deployed sources or bypasses encrypted ingress/grants.
export function installObservationEntropy() {
  const target = new URL(
    "../../../functions/lib/functions/src/production.js?illustrated-route-recovery",
    import.meta.url,
  ).href;
  return registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (url !== target) return result;
      return {
        ...result,
        source: instrumentObservationSource(String(result.source), process.env),
      };
    },
  });
}
