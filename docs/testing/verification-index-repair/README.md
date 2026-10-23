# Complete Git-index acquisition

Prompt175 / reviewer17:58. PR134 application40027473615 and stories40027473647 fail in new reuse preparation before tests. The retained application log shows `spawnSync git ENOBUFS` while reading `git ls-files --stage -z`; Node's default1MiB stdout buffer is too small for this evidence-rich repository. This is a demonstrated tooling regression introduced by the reuse gate, separate from gameplay, pixels and settlement timing.

`readVerificationIndex` now sets a bounded64MiB child-output buffer and reads the complete index. Exceeding that bound still throws rather than hashing a prefix. No path, mode, evidence file, source input or required check is omitted; the five-file reporting allowlist and provenance rules are unchanged.

The focused regression creates a real temporary Git repository/index with16,000 long evidence paths and a final symlink-mode entry. Its output exceeds1MiB; the old default acquisition demonstrably throws ENOBUFS. The corrected function returns every byte, and changing the final path changes the fingerprint. A second check reads the complete current repository index both through the production function and independently through stdout redirected to a file; bytes and digest agree. This exercises acquisition, not only synthetic digest strings. Nine reuse tests pass under established offline Nix; the full policy/path suite is recorded alongside this report.

Original failure is preserved, not retried. The next changed-source child run provides CI validation; local success does not retroactively pass134/135. Current pixel comparison and original132 RPC findings are bundled in this substantive repair, avoiding an extra report-only push. No baseline/deadline adjustment, merge or release approval.
