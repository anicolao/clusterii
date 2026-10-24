# Bounded task-owned reclaim audit

Prompt200 / reviewer01:54, main01:44/01:54 reconciled. Inventory and SHA256 comparisons ran under cached offline Nix. No build, browser, emulator, artifact download or deletion. No unrelated files/global caches/Nix store/dependencies inspected for reclaim.

Fresh free space before inventory1,939,044KiB; after1,938,984KiB. Reclaimed bytes: **0**. Changes in free space are not attributed to cleanup. Required contact minimum2,359,296KiB floor plus200,000KiB reserve =2,559,296KiB; shortfall620,312KiB. Avoid deleting a token amount when that cannot permit a stable run.

## Actual task outputs

- Current worktree build10,708KiB and .svelte-kit12,720KiB: generated outputs, preserved. Ignored/generated status alone does not authorize deletion; small even if separately authorized.
- Current test-results230,664KiB allocated /235,601,885 logical bytes across271 files. Audited against tracked docs/testing and numbered-feature evidence by basename, exact length and SHA256;43 files /2,572,697bytes have matching tracked working-tree copies, listed in test-results-copy-audit.json. No deletion: too small to materially close the gap, and Git blob integrity/active-use verification would still be required before reclaim. Other files are unverified, not assumed expendable.
- /tmp/cluster-failed-gates-1951,775,564KiB: principally retained original strict ZIP1,766,190,057bytes. Selected strict extraction240KiB. Original archive preserved.
- /tmp/cluster131-artifact-125319890211,861,132KiB: original ZIP1,723,906,172bytes plus177,592KiB pixel originals. These are retained actual/expected/diff review evidence, preserved.
- /tmp/cluster132-artifact-12533846891: original ZIP1,723,763,985bytes, selected extraction280KiB; preserved.
- /tmp/cluster124-artifact-12520550251: original ZIP1,658,663,863bytes, selected18,740KiB; preserved.
- /tmp/cluster128-artifact-12527980871 selected164KiB; preserved.
- /tmp/cluster-heading-194741,468KiB: principally original571,529,048byte application archive, two smaller original science archives, partial failed families and traces. Preserve all; candidate/failure extracts are not selected for reclaim.
- /tmp/cluster34-failure-artifact includes1,127,963,895byte emulator log and failure/test evidence. No verified intact local archive located in this bounded search. No deletion, compression or inferred redundancy.
- /tmp/cluster-capture-recovery-186427,848KiB: principally original417,351,582byte archive; preserve.

`inventory.json` records size-only inventory of task-named artifact/recovery directories; names and size do not establish ownership/duplication or deletion authority. No large tree was removed. Since no deletion candidate sufficient for headroom was established, no process-use check is asserted and no archive-byte equivalence is claimed. Original review-set science24 and contact families remain intact. Required140 application passed, strict failed; no target update/rerun.

## Restart boundary

Resume the already documented contact feature012 only after a fresh measurement exceeds2,559,296KiB with owned-port/process preflight, serialized Nix Functions build and monitored run. Preserve existing first failures and all original assertions. This audit does not justify deleting archives or lowering the gate. Lightweight source/reference review remains possible; captures stay blocked.
