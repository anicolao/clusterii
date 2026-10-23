import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// Exercise the installed pinned resolver, rather than a parallel alias resolver.
const { transform } = require(
  join(dirname(require.resolve("playwright")), "lib/common/index.js"),
);

test("generated Svelte aliases must precede Playwright's first configuration read", () => {
  const root = mkdtempSync(join(tmpdir(), "cluster-story-bootstrap-"));
  const config = readFileSync(
    new URL("../tsconfig.json", import.meta.url),
    "utf8",
  );
  function fixture(name) {
    const dir = join(root, name);
    mkdirSync(join(dir, "shared"), { recursive: true });
    writeFileSync(join(dir, "tsconfig.json"), config);
    writeFileSync(
      join(dir, "shared/crypto.ts"),
      "export const fixture = true;\n",
    );
    writeFileSync(join(dir, "story.ts"), "import '@shared/crypto';\n");
    return dir;
  }
  function generate(dir) {
    mkdirSync(join(dir, ".svelte-kit"));
    writeFileSync(
      join(dir, ".svelte-kit/tsconfig.json"),
      JSON.stringify({
        compilerOptions: { paths: { "@shared/*": ["../shared/*"] } },
      }),
    );
  }
  const resolve = (dir) =>
    transform.resolveHook(join(dir, "story.ts"), "@shared/crypto");
  try {
    const cold = fixture("cold");
    assert.equal(resolve(cold), undefined);
    generate(cold);
    assert.equal(
      resolve(cold),
      undefined,
      "late web-server generation cannot repair the cached resolver",
    );
    const ready = fixture("ready");
    generate(ready);
    assert.equal(resolve(ready), join(ready, "shared/crypto.ts"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("story runner awaits alias generation before building and launching any cohort", () => {
  const runner = readFileSync(
    new URL("./run-stories.mjs", import.meta.url),
    "utf8",
  );
  const sync = runner.indexOf('await run(["x", "svelte-kit", "sync"]);');
  const build = runner.indexOf(
    'await run(["run", "--cwd", "functions", "build"]);',
  );
  const launch = runner.indexOf('"emulators:exec"');
  assert.ok(
    sync >= 0 && sync < build && build < launch,
    "sync must finish before the first Playwright process",
  );
});
