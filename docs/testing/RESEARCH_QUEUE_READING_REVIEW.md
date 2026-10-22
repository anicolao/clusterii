# Research Queue reading correction

Reviewer14:39 handoff (Prompt95) prioritizes application job119981777933. Original log: `/tmp/cluster92-application-completed.log` (35 pass,3 skipped,1 failure). Artifact12448952602 is preserved as `/tmp/cluster92-browser-evidence.zip`; only construction-feedback evidence was extracted to `/tmp/cluster92-construction-feedback-failure`.

The failure is phone393×852, first ArrowDown from Investing to Formations after the real investing order settles at tick1. Radio corner checks pass; Queue corner checks fail. Retained before/after snapshots were rendered offline using the installed Playwright SnapshotStorage and archived CSS/fonts, with all network intercepted to trace resources. This reconstruction is diagnostic, not a new Linux visual acceptance or baseline. Scripts/data: `/tmp/cluster92-snapshot-diagnose.cjs`, `/tmp/cluster92-before-arrow-geometry.json`, `/tmp/cluster92-failure-geometry.json`.

Before ArrowDown, the form is419.39px tall and Queue investing ends at709.39. After the new description renders, the form is443.39px tall and Queue formations ends at733.39. Economy remains scrollTop668 with bottom721. The lower-right test point hits Return to galaxy. This is actual ancestor clipping/occlusion after the selected description grows24px, not an out-of-document coordinate or unsupported claim of flakiness. Source showChoice scrolls synchronously before Svelte commits the new selection's layout.

Correction: await the Svelte DOM update before scrolling the selected label and containing form. Preserve focus, native keyboard selection, command behavior and all existing corner assertions. Strengthen the real guidance story with native ArrowDown transitions, complete ancestor containment and both-corner hit tests before any test-driven scroll. Keep the legacy construction-feedback regression unchanged.

Focused before/after and four-size illustrated evidence remain pending. Changed candidates require separate independent review and strict comparison; no baseline is approved by this diagnosis. Recovery, other shared/feedback families, historical profile delivery, Linux/hosted and release gates remain separate. No gameplay rule change.

The local unchanged procedural run stopped earlier at campaign admission (Choose your faction absent after5s), so it supplies no local Queue reproduction. Preserve `/tmp/cluster-queue-before.log` and `/tmp/cluster-queue-local-before-failure`; the causal evidence above is the retained CI snapshot pair, not this setup failure.

The post-fix procedural run also stopped at the same5s admission assertion, before Queue. Retain `/tmp/cluster-queue-after.log` and `/tmp/cluster-queue-local-after-result`; its final frame says Order acknowledged. Saving recovery state. No Queue acceptance follows.

First strengthened live generation on clean59fa299 passes phone31.4s, desktop37.8s and large1.1m; short fails Queue scanning containment. Preserve `/tmp/cluster-queue-first-guidance-candidates` and `/tmp/cluster-queue-guidance-generation.log`. Short trace reconstruction shows the393px form is taller than the378px scrolling region; nearest-form alignment leaves Queue ending608 against clip605. This is a separate demonstrated short-layout limit. After positioning the updated form, explicitly position its actual commitment region with native nearest scrolling; retain full selected-radio and Queue checks. No deadline, corner or pixel assertion changes. Matching-source corrected evidence remains required.

## Corrected matching-source execution

Clean46f2f8f3ef35b1b8a9315f7c1b2c56e204453070, spec SHA256 d5acbec24bca9f7ef638ed556786b08bf07b5b07b6dfb4d0be971a723d3e0179: phone45.7s, desktop2.1m and short53.0s pass,12 captures each. Large fails at the unchanged10s settled-capture budget during melee: trace step10111.5ms, recent screenshots4365.2/3746.6ms. Its prior Formations action/acknowledgement/geometry and capture complete; this is partial evidence, not a passed large story. No Queue geometry failure is reported on this source. Retain `/tmp/cluster-queue-corrected-guidance-candidates`, `/tmp/cluster-queue-corrected-guidance-generation.log`, and `/tmp/cluster-queue-corrected-firestore.log`.

At15:06 the read-only host sample showed load averages158.45/185.64/155.82 and44% free memory; this observation does not establish the capture deadline's cause. No deadline relaxation or automatic repeat is authorized by a negative result. The next bounded verification is the same guidance story on project large after reviewing runtime capacity, followed by unchanged procedural acceptance when its admission path can be observed.

Rendered review samples (not promoted baselines): [original CI phone frame](../ux/reviews/research-queue/ci-phone-before.jpeg), [phone](../ux/reviews/research-queue/formations-phone.png), [desktop](../ux/reviews/research-queue/formations-desktop.png), [large partial story](../ux/reviews/research-queue/formations-large.png), [short](../ux/reviews/research-queue/formations-short.png). The original is a retained CI screencast frame, not a new screenshot. Implementer inspected corrected Formations across sizes: selected radio, effect and full Queue are readable above the footer. Independent visual review and strict comparisons remain pending; no candidate was promoted.

Reviewer14:49/14:59 source-scoped checkpoints are carried in meta-prompts.md. #94 remains draft on #93. Unchanged construction-feedback post-settlement acceptance, completed large story, normal-motion and Linux evidence, and all predecessor gates remain open.

Exact bounded large restart (preserve the current evidence directory first; do not run concurrently with another emulator cohort):

```sh
PATH=/nix/store/vnycnlns50zkb0pns9rd7vhpv3m0fxc4-zulu-ca-jdk-21.0.8/bin:$PATH \
FIREBASE_EMULATORS_PATH=/tmp/cluster-route-emulator-cache \
CLUSTER_STORY_MODE=generate CLUSTER_STORY_FILTER='Live research guidance follows' \
NODE_OPTIONS='--import=file:///Users/anicolao/projects/games/clusterii-conversation-history/tests/browser/story-helpers/emulator-catalogue-register.mjs' \
bunx firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions \
  'bunx playwright test --config playwright.stories.config.ts --project=large'
```
