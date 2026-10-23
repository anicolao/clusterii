# Publication source review —13:02 checkpoint

Reviewer-directed bounded read-only review on PR126. No builds, browsers, emulators, downloads, large copies, cleanup, workflow reruns or monitor changes. Science originals remain `/tmp/cluster-science-clearance-0077be54`; reviewer13:02 sampled desktop010 clearance only, not full24-family approval.

## Existing controls and limits

`.github/workflows/publish.yml` and cleanup share `pages-tree`, cancel-in-progress:false. `publish-pages.mjs` reads the live PR head before mutation and skips superseded source. It fetches gh-pages, replaces only the addressed preview directory (main preserves prN directories), and writes source/build identity. Cleanup only removes previews closed for30 days. The publisher requests a Pages build and retains the exact-source verifier. Source review found no demonstrated omitted-build-asset or cross-preview deletion defect explaining the prior failures; no speculative production change is made.

`verify-pages.mjs` waits for exact sourceSha/buildSourceSha, then separately fetches entry HTML and its referenced assets plus named routes/art. These separate requests do not constitute an atomic deployment snapshot. Asset failure reports omit HTTP status/cache headers, and fetch exceptions abort rather than recording response context. This is a diagnosis limitation, not proof of cache, concurrency, deployment or transport cause. Any future evidence improvement must retain the exact identity/asset assertion, original failure and deadlines; no retry wrapper or relaxed acceptance is proposed here.

Prior124fb70cc33 evidence remains [separately retained](publication-124-1142/README.md): failed CSS reference existed in the committed publication tree and later unchanged verifier passed. It does not certify a different head or explain the original response.

## Bounded remote status

At this review, source9a3de84a06990aa1851173a5a251dce70aae6ec5 application39987470646 and stories39987470893 both remain in_progress, empty conclusion (API updatedAt16:31:31Z/16:31:33Z). No completed retention/timing outcome exists to inspect. Documentation/publication pass; generation status alone is not candidate evidence. Inspect completed outcomes at the next meaningful work boundary, without polling loops or large artifact downloads below gate.

Pages builds metadata returned publication commitf408617fcb907d53defaa6043067408ffce40839 as errored16:57:56Z→16:57:57Z, then built16:57:57Z→16:59:14Z; earlier4e73e26d93e6ee3929cdf6d96719e61855287f25 built16:51:49Z→16:53:10Z. This establishes those reported build states only. No inference of their trigger/cause, preview-specific asset consistency or historical-failure equivalence. No request to deploy again was made.

## Concrete disk blocker

Local measurements507,844KiB then466,644KiB free, below required2,359,296KiB. Further captures/builds/emulators, large archive copies/downloads remain blocked. Retained originals/manifests/failures are untouched. No claim of release completion; no baseline promotion or merge. Once headroom returns, remeasure first and verify existing science hashes before independent review/archival; no rerun merely for packaging. PR124 retained runtime/upload proof, historical tick/ingress evidence, full visual/Linux/hosted/KMS gates remain open.
