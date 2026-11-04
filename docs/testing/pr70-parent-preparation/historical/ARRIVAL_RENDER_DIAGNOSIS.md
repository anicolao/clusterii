# Arrival stellar-core diagnosis and restart

Prompt 67 requests bounded diagnosis while disk headroom blocks new captures. This is an investigation, not an accepted cause or fix. Original seven-pixel failure, candidate images, exact log and trace remain in the locations recorded by [arrival review](../design/ARRIVAL_ARCHIVE_STORIES_REVIEW.md). No pixels, tolerances, production code or tests changed.

## Retained evidence

Reading trace.zip in memory (without extracting large resources) identifies the uninvolved player's `1-trace.trace`: Escape at30076.579ms; screenshots at30385.725ms and30483.945ms. The helper reached exact comparison after its stable-image check, which failed seven pixels. These captures start309.146ms and407.366ms after Escape. Two stable screenshots do not establish that a WebGL frame reflects the latest scene, but they argue against merely extending a fixed delay.

`Galaxy.svelte` keeps the on-demand Canvas mounted while the arrival panel opens/closes. `closeArrivals` changes panel/history flags, awaits Svelte tick and restores focus; it does not change cameraRequest. `Scene.svelte` applies camera requests through OrbitControls.update and invalidate, disables damping, and builds deterministic glow bytes. Closing the archive is not itself a camera-reset or canvas-remount path. Existing isolated repeated-camera-update evidence was negative and did not exercise the live renderer.

Concrete hypothesis H1: a tiny stellar glow/core is depth-occluded differently after scene reconstruction on reload, rather than the entire camera moving visibly. The transparent orbital-ring MeshBasicMaterials retain default depthWrite=true; glow sprites use depthWrite=false but retain depth testing. Ring/core/sprite depth and render-list ordering are therefore relevant to the localized dark-versus-bright difference. This is a source-supported mechanism to investigate, not evidence that a ring actually intersects these seven pixels. H2: a stable stale on-demand framebuffer after scene/material readiness. Existing traces lack camera matrices, render counters and depth values, so neither hypothesis is established. The unchanged surrounding image and stable captures do not prove either one.

## Smallest future verification

After adequate headroom exists, instrument only a development/test diagnostic path for the existing short journey, without changing scene behavior. Record at reload, last archive capture, Escape and each final capture: camera world/projection matrices, controls target, canvas dimensions/DPR, selected star, renderer frame count, projected core/sprite bounds and depth for stars near x364–366/y251–253, and intersecting ring geometry/material depth settings. Record scene object order and readiness/invalidation timing. Keep instrumentation bounded and exclude keys/private unrelated state.

First compare expected/actual candidate geometry and stellar identity from those facts. If matrices/state match but frames do not advance after relevant invalidation, test H2 with a separately labeled single explicit diagnostic render. If matching geometry places a ring in front of the affected glow, inspect the depth/order mechanism for H1; do not disable depth or alter materials merely to match the expected image. A diagnostic render/material experiment is not production acceptance. Preserve before/after artifacts and require the unmodified zero-tolerance verifier after any justified production correction. Do not choose screenshots by similarity to the baseline.

Exact narrow restart command (run from the active worktree after instrumenting/reviewing the bounded telemetry, with no other owned emulators running):

```sh
export PATH="/nix/store/vnycnlns50zkb0pns9rd7vhpv3m0fxc4-zulu-ca-jdk-21.0.8/bin:$PATH"
export FIREBASE_EMULATORS_PATH=/tmp/cluster-route-emulator-cache
bun run --cwd functions build
CLUSTER_STORY_MODE=verify NODE_OPTIONS="--import=$PWD/tests/browser/story-helpers/emulator-catalogue-register.mjs" bunx firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bunx playwright test --config playwright.stories.config.ts tests/browser/fleet-travel.story.spec.ts --project=short --output=/tmp/cluster-arrival-render-diagnostic-results' > /tmp/cluster-arrival-render-diagnostic.log 2>&1
```

Use a fresh output path if either restart path already exists; preserve existing evidence before executing. Do not run generation. Required evidence: all named authoritative/privacy/conservation/keyboard assertions, all40 exact short captures, telemetry correlated with capture times, unchanged112 predecessor baselines, actual/expected/diff and trace on failure. Only after a cause and correction are demonstrated broaden to affected viewports and independent/Linux review. This command has not been executed during the resource block. Reserve several GiB for build/emulator logs and failure retention before restarting;460MiB is insufficient. No large downloads or duplicate CI were started.

## Plan acceptance audit

This audit follows IMPLEMENTATION_PLAN milestones and the delivery/story inventory; it is not a new gameplay approval.

| Plan scope | Outstanding acceptance |
| --- | --- |
| 0 design contract | Proposed rules, map fairness/geometry and unresolved victory/alliance choices still require review; development behavior is not owner approval. |
| 1–3 foundation/service/admission | Local slices exist; hosted Google, scheduler, managed-provider/account/key lifecycle and complete authorization/fault matrices remain gates. Emulator delivery is not hosted certification. |
| 4–5 economy/research/intelligence | Construction/production/research and observation slices exist. Complete market speculation, split-control escrow, every reviewed technology interaction and intelligence matrix require full integrated acceptance. |
| 6 travel | Formation/cargo/routes/recovery/pause-catch-up stories exist. #70 short arrival return fails; Linux, full independent composition and remaining travel branch coverage are not complete. |
| 7 combat | Uncontested arrival archive does not prove contested orbital/ground losses, split occupation, escrow and multi-party outcome matrices. |
| 8 diplomacy | Chat, consent and credit-offer slices do not complete alliances, all permitted exchanges or membership/privacy transitions. |
| 9 victory | No full multiplayer win/results/rematch/repeated-alliance journey; terminal behavior and incentives remain incomplete. |
| 10 UX | Story inventory UX-01–16 retains branch/accessibility gaps; full independent review, short seven-pixel failure and inherited1994-pixel identity raster remain open. |
| 11–12 endurance/release | Full-loop simulations, real-cadence soak, measured operating limits, backup/restore/rollback, alerts and hosted multiplayer smoke remain required. Current-head preview checks are independent gates. |

Generation evidence is step/artifact-specific: #64 and #65 green generation jobs skipped candidate generation. #65's only artifact is failed verification output, ineligible for promotion. Other green jobs require equivalent provenance inspection before claiming candidates. Separate generation plus rendered review precedes strict Linux verification. Served revisions for #61/#65/#66 passed the recorded read-only checks; that does not certify later heads, hosted services or release. No merge.

## Instrumented short run

After disk recovered to17GiB, the first isolated telemetry run passed40 exact captures in32.1s. It is diagnostic evidence, not a fix or replacement of the original failure. `/tmp/cluster-arrival-render-telemetry-pass1` preserves every capture and bounded before/after screenshot render sample; `/tmp/cluster-arrival-render-diagnostic.log` preserves execution. The build-only plugin activates solely with `CLUSTER_RENDER_TELEMETRY=1` and `PUBLIC_EMULATORS=true`; normal builds contain no sample hook. It reads matrices/depth/material state without updating matrices, invalidating frames or rendering. Five runtime/anchor guards passed; type checks and story policy pass.

The final peer capture samples all show renderer frame3,1024×662 canvas at(0,58), target(0,0,0), unchanged overview camera and map texture version1. Ray/plane calculation at the changed pixel centers intersects the orbital-ring plane at radii8.8673,8.8187,8.7703; none lies in the3–3.008,6–6.008 or9–9.008 orbital rings. That rejects the specific orbital-ring occlusion hypothesis for this recorded camera, not every possible depth/lifecycle mechanism. Existing failed trace did not record its matrices. No production/baseline change is justified by this passing run. Next bounded comparison seeks a failing telemetry sample against this passing sample; stable passes alone cannot close the cause gate.

#68's retained publication log reports HTTP404 for a6f04e9. Read-only Pages inspection now reports built244a65377d7328392a63e3f007637d24bc948a0c; served source/build and current PR head both equala6f04e9ce2f96080d81788dbe1788427b1dade2a. The unchanged verifier passes26 static references (`/tmp/cluster68-served-telemetry-review.log`). No duplicate publish; original failed job remains failed, and hosted authentication/scheduler are not certified.

The second isolated diagnostic at3afecf5 passed40 exact captures in30.6s (`/tmp/cluster-arrival-render-diagnostic-second.log`, `/tmp/cluster-arrival-render-telemetry-pass2`). Final camera/projection/target/canvas and bounded object/material state match pass1 after excluding timestamps, frame counts and allocation IDs. This is negative reproduction evidence; it does not resolve the original seven-pixel failure. Both runs keep original authoritative/privacy/geometry checks and zero tolerance. Original failure and baseline bytes remain untouched.

The current evidence cannot distinguish a transient WebGL framebuffer difference from DOM/compositor damage using a previously captured image alone. The next diagnostic should sample the affected3×3 framebuffer region immediately after a real render (bounded read-only callback, no extra render) and correlate it with capture samples and modal lifecycle. Only a failing sample can discriminate this from the passing matrices; no further identical reruns are justified merely to accumulate green results. The cause gate stays open and #70 stays draft. Current-head application/story jobs are queued; no eligible generated candidate artifact has been established for this head.
