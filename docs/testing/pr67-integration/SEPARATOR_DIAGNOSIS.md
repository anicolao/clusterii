# Exact structural separator reconciliation

Incoming original67 archive is byte-identical c4a5cac2. Its Travel catch-up record60 ends in2LF; canonical retained record127 ends in4LF. Existing Git-verified parent archives056a2f85,64f680f2,bb54c315 also retain4LF; original archives0666727d,757d423c,9050d65e,a26324cb retain2LF. These are structural copies, not rewritten user bodies. The previously declared1LF separator did not describe this inherited copy. Change only explicit archive separator metadata to2LF, already supported by unchanged checker. Preserve all canonical and archived request bytes; let the existing checker validate exact original/append-transition variants for every other record. No newline-normalized data used for acceptance.

Validation: unchanged node scripts/check-prompts.mjs PASS after metadata-only2LF correction; exact canonical body bytes and archives preserved. PR66 bounded40242503554 briefing/session jobs bothin_progress; no duplicate request.
