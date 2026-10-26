# Identity text raster investigation

The inherited Linux short-viewport failure remains open. No application style, expected image, renderer flags or comparison tolerance changed in this investigation.

## Retained failure

Run [39652714597](https://github.com/anicolao/clusterii/actions/runs/39652714597), job 119404921165, rejects `session-interrupted-recovery/short/linux-arm64/012-fresh-sign-in-1-commander-first-device.png`: 1,994 differing pixels in “The face your allies trust. The name your rivals remember.” The paragraph glyphs move vertically by one pixel. The other image pixels match. The actual, expected, diff and trace remain under `/tmp/cluster-navigation-recovery-failure`; later occurrences remain separately retained, including `/tmp/cluster-start-current-failures`.

The relevant fresh-sign-in capture is in **1-trace.trace**, calls `call@5173`/`call@5175`, frame `frame@20611c9603b3d6b6349cc81a031d675b`. The last screenshot in `0-trace` is the other device's signed-out entry, not this failing identity. Reconstructed snapshot 159 contains the saved alias `Retained commander`, selected Envoy portrait and original paragraph. `/tmp/cluster-retained-snapshot.py` reconstructs its referenced DOM; `/tmp/cluster-retained-render.mjs` replays retained CSS/fonts/art without live application services. This is a renderer investigation, not a player story or authentication evidence.

## Local evidence and its limits

A macOS replay of the retained DOM has paragraph box `(583.40625, 283.40625, 574, 28.046875)` and text range `(583.40625, 286.40625, 429.625, 21)`, using `17px / 28.05px Atkinson Hyperlegible`. Its full screenshot differs from both Linux images, so it cannot substitute for pinned Linux verification.

Earlier local ready/loading/resized/hidden/font-delivery probes did not reproduce the failure. The new fractional-layout probe varies preceding-heading margin by sixteen sixteenth-pixel increments and restores it before capture; all 17 final screenshots are identical. The final probe loads the production CSS/fonts and artwork; an earlier unstyled attempt was discarded as invalid evidence. These negative results **do not establish fractional positioning, font loading or layout caching as the cause**. No local Linux container runtime is installed. A reproducible Linux cause is still required.

## Read-only capture evidence

The shared story helper now writes a sibling `.layout.json` after each settled PNG, before comparison. It records visible text ranges, computed font properties, ancestor geometry/scroll/transform/paint properties and font loading status. Passing and failing captures both retain it in the workflow artifact. It is observed after the screenshot and is never an input to settling, expected-image selection or acceptance. It cannot alter the captured image. The existing two-identical-actual-frame rule and zero-pixel comparison remain unchanged.

Compare the failing paragraph's range and ancestor coordinates with a passing short recovery capture in the same pinned Linux renderer. Different coordinates establish a layout discrepancy; matching coordinates with differing pixels isolates painting/rasterization more narrowly. Existing traces do not contain these computed range coordinates, so neither conclusion is claimed yet.

Current-head Linux comparison, reproducible cause, independent visual acceptance and exact-head hosted previews remain open. This diagnostic addition is not a fix for the inherited failure.

## Verification of the diagnostic addition

All eight cancelled/interrupted recovery stories pass unchanged exact images across phone, desktop, large and short in the local renderer (`/tmp/cluster-raster-layout-session-exact.log`). The run retains both-device acknowledgement, once-only saved identity and geometry assertions. [Local layout excerpts](identity-raster-local-layout.json) include the eight fresh-sign-in paragraph measurements and captured-image hashes. Type checks report zero errors/warnings; lint, twelve story-tool tests and nine policy/clock/catalogue guards pass. No baseline was generated or promoted.
