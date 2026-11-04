# Evidence lifetime

Direct human Prompts389–390 clarify that retaining a failed log means keeping useful diagnostic evidence, not accepting a failing check or accumulating arbitrary disk usage. The delivery objective remains a green top PR.

The four old candidate transport ZIPs were redundant after complete extraction and verification. Before removal, each original archive was rehashed against its verified artifact digest and size; every extracted entry was rehashed against the CRC-verified entry inventory, and lsof confirmed no active archive user. Exactly6515348935bytes of duplicate archives were removed. All unique originals, traces, manifests and approval decisions remain in the owned extraction directories. duplicate-archive-reclamation.json records exact paths, hashes, retained counterparts and byte counts. No repository, user files, dependencies, Nix store, unrelated cache or unique review image was deleted.

Useful-lifetime rules for this recovery:

- Download each needed artifact once. Verify it, then remove a redundant transport copy when complete verified originals or immutable approved Git blobs remain available.
- Keep a failed trace while its behavior is unresolved or needed to validate the correction. Keep compact compressed failure summaries/provenance in Git; do not keep large diagnostic duplicates merely to chronicle progress.
- Keep candidate originals while actual image review and current-source comparison are outstanding. Once exact approved images are committed and the required current-head checks pass, reclaim superseded task-owned extraction/archive copies after verifying their retained Git or remote counterparts. Do not delete unique unreviewed material prematurely.
- Reuse byte-identical approved images and retained metadata instead of downloading or rendering duplicates. Existing remote90-day artifact retention is not extended by this task.

The current large market transfer is still needed for a new completed result; it is not duplicated. Future cleanup is limited to explicitly owned, verified redundant material and will record actual reclaimed bytes. Local source fixes and required CI failures remain actionable regardless of whether their transport archive still exists.
