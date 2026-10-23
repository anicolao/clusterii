# Shared presentation settings journey

Reviewer Prompt112 explicitly authorizes this isolated gallery/lab family, narrowing the browser hold only for this scope. Read E2E_GUIDE before implementation. Production source baseline is5bcc774; the new test uses actual GameMenu/PresentationSettings and shared feedback, with no login, campaign, emulator setup, service response interception or state injection.

Plan before generation: keyboard open and modal Tab containment; local motion and detail changes with named immediate acknowledgements; persistence across reload; OS reduction remains effective after turning the local reduction off; Escape and explicit close restore Menu focus. Capture both controls and close action without auto-scrolling them into view; retain existing helper corner/overlap/bounded-scroll checks. Inspect the existing accepted-feedback lab frame at90ms normal and180ms reduced, requiring equal result text. Capture under the existing reduced-motion pinned environment; normal OS preference is exercised between captures, not misrepresented as a normal-motion screenshot.

One small story,120s total (existing gallery ceiling), unchanged30s step/10s action/capture limits, exact RGBA0/retries0. At most six captures per viewport across393×852,1440×1000,3840×2160,1280×720. Run only this new file once per viewport, sequential worker with max-failures1 to stop on the first failure. Commit test source before generation; preserve manifests and all failures. Initial disk9060528KiB; recheck before execution. Candidate promotion requires separate independent review. Galaxy rail fit, factual scene equivalence, authoritative actions, mounted account races and performance remain outside this gallery-only evidence.

## First execution and correction

Committed source247f7f0d6ce15c8ad290a05936153ba6fa5c47f1; spec SHA-25648420b694b27389054df2022333f7d0e5b1f18d58cd744daed8d9ca59ba264ed. Static checks passed with zero errors/warnings; story policy passed. Disk8859076KiB before execution. Command: `CLUSTER_STORY_MODE=generate bunx playwright test tests/browser/local-settings.story.spec.ts --config playwright.stories.config.ts --max-failures=1`. Serialized frontend build completed before the browser. No emulators, service mocks or campaign setup.

Phone failed in19.5s on line88: after keyboard open, heading focus and successive motion/detail/close focus assertions passed, but Tab from close did not focus Reduce motion within the unchanged10s expectation. The retained trace confirms those individual assertions; it does not record the final active element, so the precise focus destination is unknown. This is a demonstrated boundary-wrap failure, not evidence about admission/setup timeouts. Three remaining viewports did not run. Zero candidate images; all later persistence/Escape/OS/lab/geometry assertions remain unexecuted. The runner's additional max-failures stop error is orchestration, not a second product diagnosis.

Preserved full output, error context and trace under `/tmp/cluster-shared-settings-first-failure/`; original log `/tmp/cluster-shared-settings-generation.log`. No retry or baseline change.

Production correction: GameMenu handles only Tab at first/last enabled visible control boundaries (including backwards from its initially focused heading). It prevents default only at those boundaries and moves to the opposite control, retaining native modal semantics, normal interior tab order, Escape and close/opener restoration. The story and all deadlines/assertions remain unchanged. This changed production source has not been browser-executed; no changed-source candidates or rendered acceptance claimed. Required next verification is this same isolated family on the corrected clean source, separately paired from247f7f0, after the reviewer-controlled stop boundary. Do not resume failed campaign/admission families.

Correction validation: `npm run check` passes (Svelte0 errors/0 warnings and Functions TypeScript); component formatting passes. Log `/tmp/cluster-settings-correction-check.log`. This is static validation only. Remaining disk8766000KiB.

## Corrected-source verification — reviewer Prompt113

Reviewer19:50 authorized one unchanged-story verification of the concrete focus fix. Exact clean HEAD `e686e3d3d98c94d276b9255951f0faac9dabbe14`, unchanged spec SHA-256 `48420b694b27389054df2022333f7d0e5b1f18d58cd744daed8d9ca59ba264ed`. Prompt/meta were logged first, temporarily stashed only to retain the requested clean source pairing, and restored after execution. Disk8176700KiB before run. Same command/deadlines/zero tolerance/retries0/max-failures1; frontend build serialized before browser execution.

Phone failed after38.7s at `page.reload()` (line163), unchanged10000ms navigation deadline waiting for load. Three sizes did not run. The first two named steps completed their assertions/readiness/geometry and produced two settled images: forward/backward boundary wrapping, full labelled-control containment, OS precedence before local selection, both persisted local toggle acknowledgements, and then Escape/opener restoration before reload. Persistence after reload, OS precedence after disabling the override, explicit close, lab comparison and other sizes remain unexecuted. No complete passed story or approved family exists.

Evidence: `/tmp/cluster-shared-settings-corrected-failure/` contains the log, trace/error context, FAILED.json, two PNG/layout pairs and `evidence-sha256.json`; source capture directory `stories/local-presentation-settings/phone/darwin-arm64/`. Exact images: `001-open-and-contain-1-developer-local-settings.png` and `002-choose-local-reduction-1-developer-local-settings.png`. The implementation agent inspected002: full toggle labels, explanations and close action are visible. This is sample inspection, not independent baseline approval. Original pre-fix failure remains separately under `/tmp/cluster-shared-settings-first-failure/`.

Bounded trace diagnosis: reload call174 starts at55071.183ms, ends65151.502ms with timeout; final gallery document response HTTP200 at23:53:24.161Z takes24.191ms. The retained trace has no completed reload after-snapshot or explicit document-load/initialization marker identifying the subsequent blocked phase. Fast document delivery does not certify script processing, asset completion or UI initialization. Initial asset entries include CSS-relative404s and successful root-art requests, but these predate reload and do not establish its cause. No supported production cause or further source correction is identified. No retry, deadline/readiness weakening, instrumentation change, new feature or baseline promotion.

Next review boundary: the focus correction has scoped phone execution evidence; reload readiness remains unresolved, and the family remains held. Any future discriminating run needs to distinguish document commit/DOMContentLoaded/load and production preference initialization under the original budget, rather than treating this result as an unchanged-retry permission or claiming post-reload persistence passed. All galaxy/authoritative/account/concurrency/Linux/KMS/hosted/performance/release holds remain.

## Asset resolution audit — reviewer Prompt114

Reviewer20:00 independently sampled both original phone PNGs: readable complete labels/explanations, checked states, focus and close action without clipping. This is two-image scope only, not family/baseline approval.

A concrete production resolution defect exists in CreditOffers and ReturnBriefing. Prerendered `build/gallery/index.html` at e402833 emitted `--exchange-art:url(../art/construction-market.webp)` and `--briefing-scene:url(../art/galaxy-dust.webp)` in inline custom properties, while external CSS under `_app/immutable/assets/` consumed those values in background declarations. Resolving `../art/` against that stylesheet location produces the exact `_app/immutable/art/`404 paths in the retained trace. These are component background URLs, not a test preload/probe list. Hydration/root-art successes do not make the initial requests correct. Before-build references retained in `/tmp/cluster-settings-asset-before.json`; original trace unchanged.

Small correction: move the complete existing background declarations (unchanged gradients, art and center/cover positioning) inline on the same production sections, so the relative prerendered base resolves against the document. Remove only the corresponding CSS background declarations. No new asset, visual substitution or readiness relaxation. This does not establish the cause of the reload10s failure.

Validation: serialized `npm run check` passes0 errors/0 warnings; `PUBLIC_BASE_PATH=/clusterii/pr4 PUBLIC_EMULATORS=true bun run build` passes. A bounded HTMLParser check of the emitted component sections finds16 actual sections with inline backgrounds, resolves both art paths under `/clusterii/pr4/art/`, confirms files exist and match static originals byte-for-byte, and verifies no external CSS still consumes the two removed variables. Construction-market SHA256 `d38dc97677e8506d4a5951f50d302ea7ba41d99f1aa963433287517e3d2e4d25`; galaxy-dust `2f3233750712cc2733aa29a031ae9bc514a0c1ac977b1b35531ddb1e8c975956`. Logs `/tmp/cluster-settings-assets-check.log`, `/tmp/cluster-settings-assets-build.log`, `/tmp/cluster-settings-assets-emitted-check.log`. Initial audit selector also matched a gallery wrapper with the same accessible label and failed its inline-style assertion; corrected selection uses the actual component class tokens, with no production change between these audit attempts.

No browser execution this turn: the authorized remaining desktop/large/short generation is held for source review because production changed. Original e686e3d/spec provenance stays separate; no new candidates, phone retry or promotion. Corrected emitted URLs are static evidence, not rendered-equivalence, reload-cause or complete asset-runtime certification. All prior holds remain.

## Three remaining sizes — reviewer Prompt115

Clean source `7d43510d6d859d01cad5b76b025170099d6f87b8`, unchanged spec SHA-256 `48420b694b27389054df2022333f7d0e5b1f18d58cd744daed8d9ca59ba264ed`. Reviewer20:10 explicitly approved this pairing after independent source/emitted-path inspection. Prompt/meta logged before work, temporarily stashed for exact clean source execution, then restored. Disk8161744KiB. Serialized production build followed by only desktop/large/short, one worker, retries0/max-failures1, unchanged deadlines/exact RGBA0.

Command: `CLUSTER_STORY_MODE=generate bunx playwright test tests/browser/local-settings.story.spec.ts --config playwright.stories.config.ts --project=desktop --project=large --project=short --max-failures=1`. All3 journeys pass in22.8s,18 generated candidates. These cases execute all named keyboard containment, local persistence/reload, OS precedence, Escape/explicit close restoration, label/primary containment and shared paused normal/reduced feedback outcomes. Generation is not strict baseline comparison or independent acceptance. No phone, campaign, admission or probe execution.

Retained root `/tmp/cluster-settings-remaining-candidates/` contains full log,18 original PNG/layout pairs, three generated README/story/renderer manifests and evidence-sha256.json. The passing configuration retains traces only on failure: no network trace exists for these three runs. Therefore no runtime claim about disappearance of the earlier404s is made from absent network evidence. Prior emitted-path verification remains distinct; this pass does not explain the earlier phone reload timeout. Implementation-agent sample inspection of003 at all three sizes and short005 found readable controls/outcomes; independent review remains required.

Exact original image paths for review:

- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/001-open-and-contain-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/002-choose-local-reduction-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/003-reload-and-respect-device-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/004-close-explicitly-1-developer-restored-opener.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/005-compare-shared-feedback-1-developer-standard-feedback.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/desktop/darwin-arm64/005-compare-shared-feedback-2-developer-reduced-feedback.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/001-open-and-contain-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/002-choose-local-reduction-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/003-reload-and-respect-device-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/004-close-explicitly-1-developer-restored-opener.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/005-compare-shared-feedback-1-developer-standard-feedback.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/large/darwin-arm64/005-compare-shared-feedback-2-developer-reduced-feedback.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/001-open-and-contain-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/002-choose-local-reduction-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/003-reload-and-respect-device-1-developer-local-settings.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/004-close-explicitly-1-developer-restored-opener.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/005-compare-shared-feedback-1-developer-standard-feedback.png`
- `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/short/darwin-arm64/005-compare-shared-feedback-2-developer-reduced-feedback.png`

All candidates remain unpromoted. Older phone images are from e686e3d and cannot complete this source-matched family. Full-family/phone reload, actual galaxy rail/scene equivalence, authoritative actions/account/concurrency, Linux/KMS/hosted/performance/release holds stay open. No further run or source change this turn.

## Corrected-source phone — reviewer Prompt116

Reviewer20:20 sampled six originals from the other three sizes (003 settings and005 standard feedback), with large composition viewed scaled only; full image/native-resolution review and baseline approval remain outstanding. Authorized one phone verification after the concrete asset correction.

Exact clean HEAD `9d0a837e62ef2fe3f76cea735f63fbe94c4a8de8`; `git diff 7d43510 -- src tests/browser/local-settings.story.spec.ts` is empty. Unchanged spec SHA-256 `48420b694b27389054df2022333f7d0e5b1f18d58cd744daed8d9ca59ba264ed`. Prompt/meta logged first, temporarily stashed to preserve requested clean pairing, then restored. Disk7167656KiB. Serialized build, then `CLUSTER_STORY_MODE=generate bunx playwright test tests/browser/local-settings.story.spec.ts --config playwright.stories.config.ts --project=phone --max-failures=1`; original budgets, exactRGBA0/retries0 unchanged.

One phone journey passes8.7s (12.1s overall), six original captures with all local-setting/reload/OS/focus/containment/shared-feedback assertions. Retained root `/tmp/cluster-settings-phone-corrected-candidates/` includes full log, generated README/story/renderer manifests, PNG/layout pairs and evidence-sha256.json. Implementation-agent inspection of003 and005 reduced confirms contained settings and readable named feedback; independent review remains pending. Older phone failures/partials are preserved separately and excluded.

Original phone paths:

- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/001-open-and-contain-1-developer-local-settings.png`
- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/002-choose-local-reduction-1-developer-local-settings.png`
- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/003-reload-and-respect-device-1-developer-local-settings.png`
- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/004-close-explicitly-1-developer-restored-opener.png`
- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/005-compare-shared-feedback-1-developer-standard-feedback.png`
- `/tmp/cluster-settings-phone-corrected-candidates/stories/local-presentation-settings/phone/darwin-arm64/005-compare-shared-feedback-2-developer-reduced-feedback.png`

Combined review set is these six plus18 at `/tmp/cluster-settings-remaining-candidates/stories/local-presentation-settings/` on7d43510: identical production/spec, distinct exact clean commit provenance. No files promoted or baselines changed; generation is not strict comparison. Passing traces are not retained, so no network404 claim. A later passing phone run does not prove the prior reload failure’s cause. Full independent24-image/native-resolution review, exact baseline verification/Linux and actual galaxy/scene/authoritative/concurrency/KMS/hosted/performance/release gates remain open. No other browser family or feature work executed.

## Lab label semantics — reviewer Prompt117

Reviewer20:32 inspected all24 prior originals across two reviews: readable settings, opener and equal feedback outcomes; large text was viewed scaled, not native pixel audited. No family/baseline approval. The repeated `Same outcome · none` incorrectly described feedback.remedy as an outcome.

Small correction before generation: label the existing metadata `Feedback recovery`, rendering `none`/absent as `No action indicated`; retain all other category values rather than inventing success or recovery actions. Reviewed the complete scenario frame list and shared conditional render branches: pending/accepted/research applied can all have remedy none, network/validation/conflict/receipt/retry describe recovery, and specialized draft/history/research components also own their internal states. The label explicitly describes frame feedback metadata rather than asserting those components have no outcome. Actual status/error messages and callbacks are untouched. The existing local-settings lab step now requires the accurate phrase and successful Identity saved status in both panels, retaining every other assertion/deadline.

All24 prior originals remain in their existing separate paths. Commit changed source/spec before one focused four-size generation with max-failures1/retries0, serialized build and disk gate. No baseline promotion or other families.

### Corrected-label candidate result

Clean committed source `fd74e91a409139b9816c35b4fe2996dbae8699a6`; updated spec SHA-256 `d9a3f6c1b340debc42c60af4591cfa561040b0cf84d204e5768987a4874e8ff6`. Static checks0 errors/0 warnings and story policy pass. Disk6941548KiB before execution. Serialized build followed by the same targeted file/all four projects, original deadlines, retries0/max-failures1/exactRGBA0. Four journeys pass32.3s (phone8.7, desktop6.2, large7.0, short6.0);24 originals, no failure or repeat.

Retained root `/tmp/cluster-settings-label-corrected-candidates/` contains original log, evidence-sha256.json and all four generated story/renderer manifests, README narratives, PNG/layout pairs. Exact original image directory template: `/tmp/cluster-settings-label-corrected-candidates/stories/local-presentation-settings/{phone,desktop,large,short}/darwin-arm64/`. Each contains:

- `001-open-and-contain-1-developer-local-settings.png`
- `002-choose-local-reduction-1-developer-local-settings.png`
- `003-reload-and-respect-device-1-developer-local-settings.png`
- `004-close-explicitly-1-developer-restored-opener.png`
- `005-compare-shared-feedback-1-developer-standard-feedback.png`
- `005-compare-shared-feedback-2-developer-reduced-feedback.png`

Implementation-agent sample inspection of phone/short005 standard shows accurate recovery metadata separately above the unchanged accepted status, both readable. The same semantic assertion passes in both comparisons at every size. Independent corrected-image/native-resolution review and baseline permission remain pending; none promoted or strictly compared yet. Prior24 originals and older failures remain intact in their original paths. No campaign/admission/probe or feature expansion. Historical timeout causality and actual galaxy/scene/authoritative/concurrency/Linux/KMS/hosted/performance/release holds unchanged.

## Scoped baseline approval — reviewer Prompt118

Reviewer20:42 explicitly approves promotion ONLY of the24 local-presentation-settings Darwin candidates from cleanfd74e91, specd9a3f6c1b340debc42c60af4591cfa561040b0cf84d204e5768987a4874e8ff6, under `/tmp/cluster-settings-label-corrected-candidates/stories/local-presentation-settings/`. Reviewer byte-compared all24 with the earlier set (16 unchanged settings/opener, eight changed005), and independently viewed all eight corrected comparisons. Large composition was downscaled, not native-pixel typography measurement. Approval covers this family only, not other lab/gallery baselines or broader acceptance.

Before promotion, verified every retained evidence-sha256 entry, all four passed generation manifests with exact clean source/spec and matching renderer.json, six PNGs each, and no production/shared/browser-tooling/config/dependency diff fromfd74e91. Use existing promotion tool with this review document; then one isolated strict run with unchanged budgets/zero tolerance/retries0, serialized build and disk gate. Archive only after strict success. Historical failures and original candidates remain untouched.

### Scoped strict result

Promotion used `node scripts/promote-story-baselines.mjs --from /tmp/cluster-settings-label-corrected-candidates/stories/local-presentation-settings --review docs/testing/SHARED_SETTINGS_REVIEW.md`; exactly four approved Darwin stories/24 originals. Baselines committed at clean `15877816b074cd4e711e0210b9736f4e61f5c48c`, production/spec unchanged fromfd74e91. Disk5976248KiB before strict execution.

`CLUSTER_STORY_MODE=verify bunx playwright test tests/browser/local-settings.story.spec.ts --config playwright.stories.config.ts --max-failures=1` passes4 journeys/24 exact captures in31.1s (phone8.3, desktop5.8, large7.2, short5.7). Serialized build, original deadlines, retries0, threshold0/maxDiffPixels0 and decodedRGBA equality unchanged. No retries/failures or other families executed.

Full strict output retained at `/tmp/cluster-settings-strict-evidence/`, including story/renderer/PNG/layout files, original log and evidence-sha256.json. Existing tooling then archived only this passing verify family to `docs/testing/stories/local-presentation-settings/{phone,desktop,large,short}/darwin-arm64/`, rechecking decoded equality and linking approved baselines. Originals and historical failures remain untouched.

This completes scoped local settings gallery/lab baseline comparison, not actual galaxy rail/scene equivalence, authoritative actions/privacy/concurrency, other gallery families, Linux/KMS/hosted/performance or release acceptance. Large native-pixel typography measurement was not claimed by the reviewer. Prior phone timeout cause remains unresolved despite later passes. No merge.
