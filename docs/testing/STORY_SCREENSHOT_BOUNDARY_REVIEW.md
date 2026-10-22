# Story-tool screenshot boundary

Prompt102 concerns PR100 run39851970103, verify job120080240930. Retained `/tmp/cluster100-stories-failure-1710.log` reports13 passing tools,1 failure/31 assertions. The first page.screenshot at story-tools.test.ts228 fails with Page.captureScreenshot Unable to capture screenshot after fonts loaded. textLayout has not run yet. This is neither a baseline mismatch nor the prior large10s story capture deadline.

## Source and sibling evidence

The fixture launches Chromium once, creates a fresh page/context at393×852 per fixture, awaits setContent, then awaits the test callback before closing the page. Bun tests here are sequential; no concurrent modifier exists. The identity fixture places a fixed identity section above2000 galaxy labels. It uses viewport screenshots, not full-page captures. Source cannot establish the actual failed document dimensions, page lifecycle or native compositor state. The following geometry test passed, so a permanently disconnected browser is not established.

The workflow uses Ubuntu24.04 ARM and Playwright1.61.1 noble image digest824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321 with host IPC. Tooling launches default Chromium; it does not import the illustrated-story renderer flags. This is an observed configuration difference, not evidence those flags caused the failure or permission to change rendering. There are no external fonts/images in this synthetic fixture. Waiting for fonts does not prove the native screenshot surface exists.

Sibling job120080241153 in the same workflow run passed the identical identity tooling case in266ms; all14 tools/42 assertions passed in2.78s. Log: `/tmp/cluster100-story-tools-sibling-1710.log`. Its explicit baseline-candidates step was skipped. This is a same-source Linux negative reproduction, not candidate evidence or a raster fix. The failing case lasted65ms, not a screenshot timeout.

## Minimal discriminating evidence

No source defect is demonstrated. Keep both existing screenshot calls and byte-equality assertion untouched. Optional fixture diagnostics attach bounded crash/close/disconnect listeners only for the identity fixture; after failure they record phase, elapsed times, viewport, page/browser status, browser version, platform, configured container and launch overrides. A250ms failure-only geometry query records ready/visibility/font state, DPR, viewport, document/body bounds and scroll, or an explicit unavailable reason. It never reads identity text, keys or player data; this is a synthetic tooling fixture. Events cap at16 and error text at2000 characters. Diagnostic failure does not substitute success; the original test error is rethrown. There is no screenshot retry, extra pre-screenshot layout/readiness wait, skipped diagnostic, changed deadline/tolerance, renderer switch or baseline update.

JSON evidence is retained under test-results/story-tools/PID/ and uploaded even when the CI tooling step fails. The deliberate closed-page probe verifies original-error identity, close-event recording and unavailable geometry; it is explicitly a tooling fault, not player acceptance. The diagnostic distinguishes a closed/crashed/disconnected target or invalid document geometry from failure with a live target and valid bounds. It cannot itself establish GPU/native-surface or resource-exhaustion causes. Small listener overhead exists, so a future pass must not be called a fix.

One local bounded suite passed15 tests/46 assertions in6.06s, including the unchanged before/after screenshot equality check. Log: `/tmp/cluster-story-tools-boundary-local.log`; local browser149.0.7827.55 on Darwin ARM64. This is a negative reproduction, not the pinned Linux renderer. No browser campaign, emulator, image generation or CI rerun was launched. Next evidence is the normal successor CI tooling run; if it fails, inspect its retained JSON alongside the original log. No broad retry is authorized by this result.

Builds/type-check emission must finish before emulator service cases start; do not rebuild watched functions/lib during a running cohort. The previous Scanning first-run failure retains its reload confound and unresolved cause.

Based on #1023705cd5; local mock Scanning684 assertions remains scoped. PR98 failed404 publication, original admission/settlement/capture/raster issues, and all Queue/recovery/shared/feedback/Linux/KMS/hosted/release gates remain open. No merge or promotion.
