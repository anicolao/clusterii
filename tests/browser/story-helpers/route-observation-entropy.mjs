import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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

// Passed line-reporter runs do not persist body-only attachments. Retain the
// small redacted acquisition summary in the owned test output before attaching.
/**
 * @param {Pick<import("@playwright/test").TestInfo, "outputPath" | "attach">} info
 * @param {{tick: number, entropyNamespace: string, seats: Array<{ordinal: number, reportCount: number, verifiedDrawCount: number, fingerprint: string}>}} facts
 */
export async function retainObservationFacts(info, facts) {
  const path = info.outputPath("route-observation-facts.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(facts) + "\n");
  await info.attach("route-observation-facts", {
    path,
    contentType: "application/json",
  });
}
