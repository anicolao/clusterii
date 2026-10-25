import { registerHooks } from "node:module";
import { instrumentContactSource } from "./contact-inputs.mjs";
export function installContactEntropy() {
  const target = new URL(
    "../../../functions/lib/functions/src/production.js?illustrated-fleet-contacts",
    import.meta.url,
  ).href;
  return registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (url !== target) return result;
      return {
        ...result,
        source: instrumentContactSource(String(result.source), process.env),
      };
    },
  });
}
