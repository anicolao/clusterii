# Cluster E2E guide

Read this guide **before writing or changing any browser test**. [UX_DESIGN.md](UX_DESIGN.md#visual-and-end-to-end-acceptance) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#verification-and-completion-standard) require illustrated player stories. This guide makes that contract executable; it does not declare the existing procedural suite compliant.

## Required story convention

Use `TestStepHelper` from `tests/browser/story-helpers/test-step-helper.ts` and the shared fixture from `tests/browser/story-helpers/fixtures.ts`. Give each story a player goal, its UX inventory IDs, named players and an explicit starting situation. Every meaningful decision and acknowledged result is a separate named step:

1. Perform the normal player action through production controls.
2. Wait for its named outcome. A click, transport frame or optimistic selection is not an authoritative acknowledgement.
3. Assert named game facts, privacy and layout requirements.
4. Load fonts, decode visible image/background artwork and settle finite motion.
5. Capture each relevant player viewpoint and compare exact pixels.
6. Generate the ordered illustrated document from those same steps after the whole story passes.

Capture opening states, decisions, confirmation, cancellation and outcomes. Do not wrap an entire procedural test in one step. A caption must describe the pictured screen. Include the observer's view when admission, messages, transfers, combat or permissions change what another player understands. Distinct players use distinct authenticated browser contexts. Never infer player identity from faction, alias or portrait.

The helper owns counters, filenames, assertions, captures and Markdown links. Direct screenshots, hand-written screenshot walkthroughs, masks, hidden controls and pixel normalization do not satisfy this convention. Component gallery/lab scenarios and service tests remain useful, separately labeled evidence.

## Files and generated evidence

- `tests/browser/*.story.spec.ts`: illustrated journeys; import the shared story fixture.
- `tests/browser/story-helpers/`: step helper, readiness, layout, exact comparison and fixture.
- `tests/browser/story-baselines/<story>/<viewport>/<platform>/`: reviewed PNGs and renderer manifests.
- `test-results/stories/<story>/<viewport>/<platform>/`: the current run's captures, manifest and generated `README.md`/JSON sequence. Failed runs never produce a passed story document.
- `docs/testing/stories/`: committed passing illustrated documents selected for review, retaining their generated provenance. The archive verifies decoded pixels again and links the corresponding reviewed baseline images, recording actual capture hashes without duplicating image files.
- [STORY_INVENTORY.md](docs/testing/STORY_INVENTORY.md): UX-01–16 mapping, migrated coverage and remaining gaps.

Every test/viewport/platform owns a distinct directory. Multiple helper instances or player viewpoints in one test share one ordered sequence. Capture files from one test must never overwrite another test's output.

## Example: an acknowledged identity save

This is the Cluster helper API. The surrounding story must first show entry, the sign-in decision and the real Google emulator login. It must finish with reload recovery and sign-out rather than stop at this save.

```ts
import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";

test("Save and recover a commander identity", async ({ page }, info) => {
  const story = new TestStepHelper(info, {
    id: "commander-identity",
    title: "Save and recover a commander identity",
    inventory: ["UX-01", "UX-14", "UX-16"],
    description:
      "An authenticated commander saves an identity and recovers it after reload.",
  });
  // Earlier named steps reach the identity editor through ordinary sign-in UI.
  await story.step("save-identity", {
    description:
      "Étoile chooses the Deepseer portrait and saves their identity.",
    actor: "Étoile",
    action: async () => {
      await page.getByLabel("Commander name").fill("Étoile 🌌");
      await page.getByRole("radio", { name: "The deepseer" }).check();
      await page.getByRole("button", { name: "Save identity" }).click();
    },
    acknowledgement: {
      spec: "The server acknowledges the saved identity.",
      check: async () =>
        expect(page.getByRole("status")).toContainText("Identity saved"),
    },
    verifications: [
      {
        spec: "The chosen alias and portrait remain selected.",
        check: async () => {
          await expect(page.getByLabel("Commander name")).toHaveValue(
            "Étoile 🌌",
          );
          await expect(
            page.getByRole("radio", { name: "The deepseer" }),
          ).toBeChecked();
        },
      },
    ],
    views: [{ page, player: "Étoile", surface: "game" }],
  });
});
```

The fixture writes numbered images and a generated narrative containing the actor, acknowledged outcome, named checks, viewport and screenshot for this step. A second player's viewpoint belongs in `views` with that player's page and explicit checks; do not merely assert their state offscreen and omit their illustration.

## Real setup and explicit test controls

Cluster has authoritative services. Use the real UI, Firebase emulators, encrypted command ingress, reducers, canonical persistence, receipts and recipient grants. The development mock provider is the real inspectable protocol, not permission to mock services or fabricate campaigns. Real-provider coverage uses managed keys and the same authorization/envelope checks; a skipped managed-key case is a visible gap.

Create and join through ordinary UI with independent players. Fix visible names and entropy before the story. A read-only canonical/receipt check can corroborate an outcome, but must not choose moves using hidden data or replace visible acknowledgement. Never inject ready-made seats, forces, balances, ownership, messages or projections and call that a player journey.

Label test-only clock advancement, scheduler delivery, dropped frames, disconnected contexts and worker faults as **harness controls**, outside player-action steps. Describe their scope in the generated story. Clock controls invoke production start/tick semantics; they do not certify hosted Scheduler behavior. Recovery stories capture the uncertain state and the recovery action before the final once-only effect. Keep ordinary successful journeys distinct from fault journeys.

Game-scene visual fixtures need a fixed seed, ruleset, observations, command results and authoritative clock. The remaining procedural campaign tests use random catalogues and explicit service clocks; they are not exact visual stories. The waiting-campaign history story fixes catalogue entropy through the emulator-only loader described below. Seed/clock control must be established at the test boundary without changing production randomness or introducing a test fallback in the player app. Entry/profile stories have no rendered campaign clock or map entropy.

The story runner installs `emulator-catalogue-register.mjs`/`emulator-catalogue-loader.mjs` as test-only Node module instrumentation. It supplies the fixed `0123456789abcdef` × 4 catalogue seed to the unchanged `createCampaign` reducer, only inside `demo-clusterii` Functions Emulator. All unrelated modules, cryptographic entropy, command payloads, times, authorization and persistence remain untouched. Signature/environment guards fail closed. The loader is outside deployed Functions sources and never edits compiled files. Stories label fixed-catalogue setup explicitly; this fixture does not certify random-map fairness. Active-tick stories still need explicit clock boundaries; the waiting history story does not advance time or reconstruct production.

Only one local emulator cohort may own the configured ports. The story runner starts and stops its own emulator process. It must fail clearly on occupied ports, never kill unrelated processes or reset another worktree's data. Do not run destructive service cleanup alongside browser stories.

## Readiness, geometry and motion

Wait on named conditions, never fixed sleeps or `networkidle`. Pending/offline stories declare the expected pending/offline outcome; do not always wait for acceptance and skip the recovery experience. Every wait is bounded. Cluster's helper uses a bounded capture budget and explicit action/acknowledgement budgets; Pantheon's project-specific two-second rule is not silently imported.

The helper checks fonts, visible `<img>` and CSS background decoding, and all finite animation completion before capture. Decode requests are renewed for each capture. Cancelled finite animations are rechecked for successor effects. Stable screenshots use reduced motion; intentionally paused animation inspection is a distinct lab/motion case. No screenshot option may fast-forward an unacknowledged gameplay effect.

Run all four supported sizes at DPR 1:

| Name    | Size        |
| ------- | ----------- |
| phone   | 393 × 852   |
| desktop | 1440 × 1000 |
| large   | 3840 × 2160 |
| short   | 1280 × 720  |

Use Chromium, bundled project fonts, `en-US` and `UTC`. Pin the Playwright/browser version and Linux image/architecture. Platform baselines are separate; a different rendering environment fails the manifest check rather than silently choosing a looser comparison.

Before any automatic scrolling, assert primary commitment controls inside the viewport. Game surfaces must not scroll the document; reference documents declare intentional scrolling. Check target size (44 × 44), overlap, viewport/ancestor containment and bounded scrolling regions. Named journey assertions exercise first/last entries, long content, focus restoration, keyboard commands and text enlargement. Simulated short visual viewports do not certify a native software keyboard. Normal-motion tests separately verify one visible effect per confirmed action and the same final facts under reduced motion.

## Exact verification and baseline review

Verification uses `maxDiffPixels: 0`, `threshold: 0`, retries `0`, plus decoded RGBA equality. Missing baselines fail. Verification cannot create or update expected images. No masked game facts, CSS concealment, broad first/last selectors, threshold increases or retry-until-green fixes.

Baseline generation is an explicit, separate operation. Its output says **generation, not verification**. Inspect every new image against its caption, behavior and approved UX composition; record the review before comparison. Generation success is not acceptance. Keep failed actual/expected/diff evidence. A changed browser, platform image, font or intentional composition needs baseline review again.

Use the pinned Linux story workflow to generate Linux artifacts for review, then commit reviewed baselines and run comparison mode in the same image. The `Illustrated stories` workflow always verifies. The explicit `baseline-candidates` PR label enables its separate generation job; download that artifact, review it, then pass its extracted directory through `--from` to the promotion command. Remove the label after reviewed baselines are committed. Generation jobs never publish the game or merge a PR. A local macOS comparison is not Linux acceptance. Existing legacy entry baselines remain historical evidence; changing their location or wrapping their tests does not approve new pixels.

## Commands and PR checklist

From the repository root, install the locked dependencies, Node 22, Bun 1.3.10 and Java 21. The story scripts build the production static app at the fixed `/clusterii/pr4/` test path and manage their own Firebase emulator cohort.

```sh
bun run check
bun run lint
bun run test
bun run test:story-policy
bun run test:stories                 # exact comparison, never writes baselines
bun run test:stories:generate        # explicit baseline candidates for review
bun run test:stories:promote --review docs/testing/BASELINE_REVIEW.md
bun run test:stories                 # compare the reviewed candidates
bun run test:stories:promote --archive --review docs/testing/BASELINE_REVIEW.md
```

For focused diagnosis set `CLUSTER_STORY_FILTER` to a test-title pattern. A focused run is not complete PR acceptance. The generated narrative records mode and renderer. Do not label a generation run, a component fixture or an emulator-clock run as hosted acceptance.

Before accepting a browser change:

- Read the generated story from beginning to end; every material decision, outcome and relevant player viewpoint appears.
- Verify named behavior/privacy/conservation assertions and real service acknowledgement, not only pixels.
- Review phone, desktop, large and short compositions, keyboard/focus, bounded scrolling, text enlargement and motion parity.
- Confirm exact comparison passed against separately reviewed baselines in the pinned renderer.
- Retain failures, acknowledge skipped providers/hosted gaps, update the UX inventory and link evidence in the PR.
- Require current-head CI and independent visual review; never merge without human instruction.

## Migration status

The convention above is mandatory. The migration inventory is the source of implementation status. Entry, learning and identity stories are the first migration in this testing slice; the helper and guide alone do not complete gameplay acceptance. Existing campaign/construction/fleet/combat/diplomacy/recovery specs retain their assertions while they are migrated in reviewable commits. Full campaign victory and several UX branches are not implemented. Do not add another gameplay PR while the reviewer-requested helper/story migration priority is being closed.
