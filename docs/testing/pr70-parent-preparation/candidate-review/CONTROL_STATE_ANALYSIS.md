# Empty archive controls and keyboard styling evidence

Target52856f40 production files are unchanged in current preparation. No source repair or rerun follows this read-only diagnosis.

## Refresh reports

ArrivalReports.svelte renders Refresh reports only when `newer` is true. Galaxy.svelte supplies `!!records.length && records[0].revision < view.revision`; these are loaded campaign-history revisions, not the count of arrival reports. Arrival records separately derive from current view, received arrivals and loaded history, filtered to actual recipient reports. Thus an empty arrival list can still legitimately offer a newer-history refresh.

The initial archive opens after real formation/route/arrival revisions. The component auto-loads history when fleet contacts are active and records empty. openPanel only fetches history if its cache is empty; a pre-existing older cache remains and newer=true exposes Refresh. Reload recreates records=[] and requests fresh history. The observed empty peer archive after reload still proves no reports, but its missing Refresh means the rendered `newer` condition is false. This supports cached-versus-refreshed revision state; no exact revision numbers or request timing were retained in the screenshot sidecar, so we do not invent them or claim proof of a specific transport race. This is not an entitlement-dependent control or evidence of private reports becoming visible. The story asserts empty recipient outcomes, not identical control availability across reload.

## Phone peer Escape focus

closeArrivals closes the panel, awaits Svelte tick, and invokes focus() on `[data-focus="arrivals"]`. Step032 asserts both panels absent and both Arrival reports openers toBeFocused BEFORE capture. Global app.css paints the3px gold outline only for `button:focus-visible`, not every focused button. DOM focus alone therefore does not establish visible keyboard styling. The shared screenshot helper subsequently brings each page to front and moves its pointer to(0,0), then performs settled capture. Assertions do not recheck :focus-visible/computed outline after this activation/pointer sequence.

Reviewer observes owner ring visible, peer phone ring absent; desktop both visible. This is a proven styling/capture-state difference, not disproven by toBeFocused. CSS/sequence explain the distinction between focus and modality-sensitive paint, but retained identity-only layout sidecars contain no activeElement/:focus-visible/computed-outline snapshot at PNG time. Do not assert that mouse.move alone caused it, that the peer lost DOM focus, or that keyboard styling parity passed. Exact browser modality transition remains unproven. Full keyboard/Tab/style certification stays open; no baseline promotion or speculative CSS alteration is justified by this read alone. Phone inspection is retained as inspection, not silently upgraded to desktop-style explicit approval.

## Provenance and outcomes

Desktop twelve exact new hashes explicitly approved by reviewer; rehashed again against retained originals. Phone inspection record copied verbatim, including focus question. Short artifact12621116857 SHA25651cd490df653ed98f409300a859b3bf7aaf0a571971ebc5909d7b18ea7e906ba size30799443, fullCRC/source/spec/renderer/40images verified;28inherited identical12new. No short approval claimed. Large retention in progress, one memory download, no duplicate desktop retrieval. Reviewer confirms sole40250936534 allfourSUCCESS; generation success is not strict or design approval.

Reviewer independently confirms PR67 allfiveSUCCESS: forward frontier52–67.68strict and69application/strict remain separate live required checks.

Reviewer short-only approval now copied verbatim as reviewer-short-approval.json: eight distinct new images cover twelve; both Escape rings visible. Reviewer independently agrees Refresh condition is consistent with cached history revision, not new access defect. Phone record remains inspection with focus-paint question; no parity claim. Passing phoneZIP has no trace entries because pinned config uses retain-on-failure; no retained DOM/computed-style trace can resolve screenshot-time modality retrospectively.

Large first memory transfer hit its local240second bounded transport timeout; exact failure provenance retained. Fresh planned retry stopped before download at2534864KiB below2559296reserve. No large downloader remains active; no duplicate desktop transfer, CI rerun or baseline update. Remote large artifact12620518604 size205464241 SHA256f3ad0609551251ed66ca12d7282a22764b5bed1165d702bbe8144b2b7429c5a5 remains unverified locally and retained remotely until2026-11-25T01:02:36Z. Resume one bounded retry only after sufficient reserve; source/budgets remain unchanged.
