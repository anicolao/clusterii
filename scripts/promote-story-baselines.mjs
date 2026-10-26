import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  featureRoot,
  baselineDirectory,
  archiveDirectory,
} from "../tests/e2e/helpers/story-paths.mjs";
import { featureNarratives } from "../tests/e2e/helpers/feature-narrative.mjs";
const args = process.argv.slice(2),
  value = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
const source = resolve(value("--from") ?? "test-results/stories"),
  review = value("--review"),
  archive = args.includes("--archive");
if (
  !review ||
  !existsSync(review) ||
  readFileSync(review, "utf8").trim().length < 100
)
  throw new Error(
    "Provide --review with the explicit visual review document before promoting or archiving stories.",
  );
function* stories(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = join(folder, entry.name);
    if (entry.isDirectory()) yield* stories(file);
    else if (entry.name === "story.json") yield file;
  }
}
const files = [...stories(source)];
const featureStories = files
  .map((file) => JSON.parse(readFileSync(file, "utf8")))
  .filter(
    (s) =>
      featureRoot(s.id) &&
      s.status === "passed" &&
      s.mode === (archive ? "verify" : "generate"),
  );
const narratives = archive ? featureNarratives(featureStories) : [];
let count = 0;
for (const file of files) {
  const story = JSON.parse(readFileSync(file, "utf8"));
  if (
    story.status !== "passed" ||
    story.mode !== (archive ? "verify" : "generate")
  )
    continue;
  for (const part of [story.id, story.project, story.platform])
    if (!/^[a-z0-9-]+$/.test(part)) throw new Error("Invalid story path");
  if (!story.renderer || !story.steps.length)
    throw new Error("Missing renderer or ordered story steps");
  const destination = resolve(
    (archive ? archiveDirectory : baselineDirectory)(
      story.id,
      story.project,
      story.platform,
    ),
  );
  mkdirSync(destination, { recursive: true });
  let markdown = readFileSync(join(dirname(file), "README.md"), "utf8");
  const captured = [];
  for (const step of story.steps)
    for (const view of step.views) {
      if (!/^\d{3}-[a-z0-9-]+\.png$/.test(view.image))
        throw new Error("Invalid capture filename");
      const actual = readFileSync(join(dirname(file), view.image));
      if (archive) {
        const baseline = resolve(
          baselineDirectory(story.id, story.project, story.platform),
          view.image,
        );
        const [a, b] = await Promise.all(
          [actual, readFileSync(baseline)].map((bytes) =>
            sharp(bytes)
              .ensureAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true }),
          ),
        );
        if (
          a.info.width !== b.info.width ||
          a.info.height !== b.info.height ||
          !a.data.equals(b.data)
        )
          throw new Error(
            "Archived story must match its reviewed baseline exactly",
          );
        const link = relative(destination, baseline);
        markdown = markdown.replaceAll(`](${view.image})`, `](${link})`);
        captured.push({
          image: view.image,
          baseline: link,
          actualSha256: createHash("sha256").update(actual).digest("hex"),
        });
      } else
        copyFileSync(
          join(dirname(file), view.image),
          join(destination, view.image),
        );
    }
  copyFileSync(
    join(dirname(file), "renderer.json"),
    join(destination, "renderer.json"),
  );
  if (archive) {
    writeFileSync(
      join(destination, "README.md"),
      markdown.replace(/[ \t]+$/gm, ""),
    );
    copyFileSync(file, join(destination, "story.json"));
    writeFileSync(
      join(destination, "captures.json"),
      JSON.stringify(captured, null, 2) + "\n",
    );
  }
  writeFileSync(
    join(destination, "review.json"),
    JSON.stringify(
      {
        review,
        mode: archive
          ? "archived-exact-verification"
          : "reviewed-baseline-candidates",
        story: story.id,
        renderer: story.renderer,
      },
      null,
      2,
    ) + "\n",
  );
  count++;
}
for (const {id, narrative} of narratives) {
  const directory = resolve(featureRoot(id), "stories", id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "README.md"), narrative);
}
if (!count)
  throw new Error(
    "No passing stories in the required mode; generation cannot be archived as verification.",
  );
console.log(
  `${archive ? "Archived verified stories" : "Promoted reviewed baseline candidates"}: ${count}`,
);
