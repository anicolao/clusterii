import { relative, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { featureRoot, baselineDirectory } from "./story-paths.mjs";
export function featureNarrative(stories) {
  const projects = ["phone", "desktop", "large", "short"];
  if (
    stories.length !== 4 ||
    new Set(stories.map((s) => s.project)).size !== 4 ||
    stories.some(
      (s) =>
        !projects.includes(s.project) ||
        s.status !== "passed" ||
        s.mode !== "verify" ||
        s.id !== "live-fleet-travel",
    )
  )
    throw Error(
      "Complete four-size passed verification required for feature narrative",
    );
  for (const story of stories) {
    const source = story.source;
    if (
      !source ||
      !/^[a-f0-9]{40}$/.test(source.commit) ||
      !/^[a-f0-9]{64}$/.test(source.specSha256) ||
      source.spec !== "tests/e2e/008-fleet-travel/fleet-travel.spec.ts" ||
      typeof source.dirty !== "boolean"
    )
      throw Error(
        "Explicit source commit, spec hash/path and dirty provenance required",
      );
    if (
      !Array.isArray(story.steps) ||
      !story.steps.length ||
      story.steps.some(
        (e) =>
          !Array.isArray(e.views) ||
          e.views.some((v) => !/^\d{3}-[a-z0-9-]+\.png$/.test(v.image)),
      )
    )
      throw Error("Ordered steps and valid viewport image names required");
  }
  const ordered = projects.map((p) => stories.find((s) => s.project === p)),
    first = ordered[0];
  // Preserve every assertion/caption and ordered viewpoint claim. Only image
  // filenames may differ between viewport records; no phone-only semantics.
  const semantics = (story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    inventory: story.inventory,
    platform: story.platform,
    source: story.source,
    steps: story.steps.map((e) => ({
      ...e,
      views: e.views.map(({ image, ...claims }) => claims),
    })),
  });
  if (stories.some((s) => !isDeepStrictEqual(semantics(s), semantics(first))))
    throw Error(
      "Feature narrative cannot combine mixed source/spec or step/view semantics",
    );
  const directory = join(featureRoot(first.id), "stories", first.id);
  const parts = [
    `# ${first.title}`,
    "Generated from complete four-size exact verification; regression evidence, not full design or release acceptance.",
    first.description,
    ...ordered.map(
      (s) =>
        `${s.project}: source ${s.source.commit}; dirty:${s.source.dirty}; spec ${s.source.spec}; spec SHA256 ${s.source.specSha256}; platform ${s.platform}.`,
    ),
  ];
  for (let i = 0; i < first.steps.length; i++) {
    const entry = first.steps[i];
    parts.push(
      `## ${i + 1}. ${entry.description}`,
      `Actor: **${entry.actor}**. ${entry.kind === "harness" ? "Harness control; not a player action." : ""}`,
      `Acknowledged outcome: ${entry.acknowledgement}`,
      ...entry.verifications.map((v) => `- [x] ${v}`),
    );
    for (const s of ordered) {
      const e = s.steps[i];
      for (const v of e.views) {
        const image = relative(
          directory,
          join(baselineDirectory(s.id, s.project, s.platform), v.image),
        );
        parts.push(
          `### ${s.project} — ${v.player}`,
          ...v.verifications.map((v) => `- [x] ${v}`),
          `[![${entry.description} — ${v.player}](${image})](${image})`,
        );
      }
    }
  }
  return parts.filter(Boolean).join("\n\n") + "\n";
}
