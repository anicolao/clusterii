import { basename, join, relative, sep } from "node:path";
/** @type {Readonly<Record<string, {root: string, spec: string} | undefined>>} */
const features = Object.freeze({
  "live-construction-ordinary": { root: "tests/e2e/010-construction", spec: "construction.spec.ts" },
  "live-construction-recovery": { root: "tests/e2e/010-construction", spec: "construction.spec.ts" },
  "live-fleet-travel": { root: "tests/e2e/008-fleet-travel", spec: "fleet-travel.spec.ts" },
  "selected-history-consent": { root: "tests/e2e/009-selected-history", spec: "selected-history.spec.ts" },
});
/** @param {string} id */
export function featureRoot(id) { return features[id]?.root; }
/** @param {string} id */
export function featureSpec(id) { const feature = features[id]; return feature ? join(feature.root, feature.spec) : undefined; }
/** @param {string} id @param {string} project @param {string} platform */
export function baselineDirectory(id, project, platform) {
  const feature = featureRoot(id);
  return feature
    ? join(feature, "screenshots", id, project, platform)
    : join("tests/browser/story-baselines", id, project, platform);
}
/** @param {string} id @param {string} project @param {string} platform */
export function outputDirectory(id, project, platform) {
  const feature = featureRoot(id);
  return feature
    ? join(
        "test-results/stories",
        basename(feature),
        "stories",
        id,
        project,
        platform,
      )
    : join("test-results/stories", id, project, platform);
}
/** @param {string} id @param {string} project @param {string} platform */
export function archiveDirectory(id, project, platform) {
  const feature = featureRoot(id);
  return feature
    ? join(feature, "stories", id, project, platform)
    : join("docs/testing/stories", id, project, platform);
}

/** @param {string} id @param {string} project @param {string} platform @param {string} image */
export function storySnapshotName(id, project, platform, image) {
  return [
    ...relative("tests", baselineDirectory(id, project, platform)).split(sep),
    image,
  ];
}
