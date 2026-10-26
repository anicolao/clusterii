import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function storyViolations(source, fixture = "./story-helpers/fixtures") {
  const errors = [];
  if (
    !new RegExp(
      "from\\s+[\"']" +
        fixture.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "[\"']",
    ).test(source)
  )
    errors.push("Import the illustrated story fixture");
  if (!source.includes("TestStepHelper")) errors.push("Use TestStepHelper");
  for (const [pattern, message] of [
    [/\.screenshot\s*\(/, "Direct screenshot bypass"],
    [/\.toHaveScreenshot\s*\(/, "Direct screenshot comparison bypass"],
    [/\.toMatchSnapshot\s*\(/, "Direct snapshot bypass"],
    [/\.waitForTimeout\s*\(/, "Fixed sleep"],
    [/["']networkidle["']/, "Network idle is not acknowledged readiness"],
    [/\.(first|last)\s*\(/, "Ambiguous first/last selector"],
    [/\bmask\s*:/, "Masked capture"],
    [/updateSnapshots\s*:/, "Snapshot updates belong to explicit generation"],
  ])
    if (pattern.test(source)) errors.push(message);
  return errors;
}
export function helperViolations(source) {
  return [
    ["maxDiffPixels: 0", "Zero differing pixels"],
    ["threshold: 0", "Zero threshold"],
    ["a.data.equals(b.data)", "Exact decoded RGBA equality"],
    ["captureReady", "Readiness guard"],
    ["assertScreenFit", "Geometry guard"],
    ["Missing reviewed baseline/renderer", "Missing baseline fails"],
    ["Pinned renderer must match", "Renderer manifest guard"],
    ["CAPTURE_BUDGET = 10000", "Bounded capture deadline"],
    ['info.config.updateSnapshots !== "none"', "Separate generation guard"],
  ]
    .filter(([needle]) => !source.includes(needle))
    .map(([, message]) => message);
}
export function checkPolicy(root = process.cwd()) {
  const errors = [],
    folder = resolve(root, "tests/browser"),
    manifest = JSON.parse(
      readFileSync(
        resolve(root, "docs/testing/legacy-browser-tests.json"),
        "utf8",
      ),
    );
  for (const name of readdirSync(folder).filter((name) =>
    name.endsWith(".spec.ts"),
  )) {
    const source = readFileSync(resolve(folder, name), "utf8");
    if (name.endsWith(".story.spec.ts"))
      for (const error of storyViolations(source))
        errors.push(`${name}: ${error}`);
    else if (
      manifest[name]?.sha256 !==
      createHash("sha256").update(source).digest("hex")
    )
      errors.push(
        `${name}: new/changed procedural spec must migrate to illustrated stories; do not silently extend legacy exceptions`,
      );
  }
  for (const error of helperViolations(
    readFileSync(
      resolve(root, "tests/e2e/helpers/test-step-helper.ts"),
      "utf8",
    ),
  ))
    errors.push(`TestStepHelper: ${error}`);
  const features = resolve(root, "tests/e2e");
  if (existsSync(features))
    for (const feature of readdirSync(features).filter((name) =>
      /^\d{3}-/.test(name),
    )) {
      const directory = resolve(features, feature);
      for (const required of ["README.md", "FIDELITY.md"])
        if (!existsSync(resolve(directory, required)))
          errors.push(`${feature}: missing ${required}`);
      for (const name of readdirSync(directory).filter((name) =>
        name.endsWith(".spec.ts"),
      ))
        for (const error of storyViolations(
          readFileSync(resolve(directory, name), "utf8"),
          "../helpers/fixtures",
        ))
          errors.push(`${feature}/${name}: ${error}`);
    }
  for (const name of ["fixtures", "test-step-helper"]) {
    const expected = `// Compatibility import for unmigrated stories; implementation lives in e2e/helpers.\nexport * from "../../e2e/helpers/${name}";\n`;
    if (
      readFileSync(resolve(folder, `story-helpers/${name}.ts`), "utf8") !==
      expected
    )
      errors.push(
        `${name}: legacy import must delegate to the single e2e implementation`,
      );
  }
  const config = readFileSync(
    resolve(root, "playwright.stories.config.ts"),
    "utf8",
  );
  for (const needle of [
    "retries: 0",
    'updateSnapshots: "none"',
    "threshold: 0",
    "maxDiffPixels: 0",
    "workers: 1",
  ])
    if (!config.includes(needle))
      errors.push(`Story config must retain ${needle}`);
  for (const file of ["AGENTS.md", "README.md", "IMPLEMENTATION_PLAN.md"])
    if (
      !readFileSync(resolve(root, file), "utf8").includes(
        "[E2E_GUIDE.md](E2E_GUIDE.md)",
      )
    )
      errors.push(`${file}: link the mandatory guide`);
  if (!existsSync(resolve(root, "E2E_GUIDE.md")))
    errors.push("Missing E2E_GUIDE.md");
  return errors;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const errors = checkPolicy();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Illustrated-story policy passed; legacy migration gaps remain inventoried.",
    );
}
