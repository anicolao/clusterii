import { join } from "node:path";
/** @param {string} id */
export function featureRoot(id) {
  return id === "live-fleet-travel" ? "tests/e2e/008-fleet-travel" : undefined;
}
/** @param {string} id @param {string} project @param {string} platform */
export function baselineDirectory(id, project, platform) {
  const feature = featureRoot(id);
  return feature
    ? join(feature, "screenshots", id, project, platform)
    : join("tests/browser/story-baselines", id, project, platform);
}
/** @param {string} id @param {string} project @param {string} platform */
export function outputDirectory(id, project, platform) {
  return featureRoot(id)
    ? join(
        "test-results/stories/008-fleet-travel/stories",
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
