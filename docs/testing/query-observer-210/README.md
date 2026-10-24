# Query/listener observation — Prompt210

Target PR140 remains d0804122: application SUCCESS; strict FAILURE (176 missing references,72 pixel differences,8 timeouts). This recovery-only observation does not update that target or references.

## Hypothesis and discriminating outcomes, before execution

The retained strict208 commits spend512–597ms after their storage marker, with substantial JFR listener-query/rules samples. Hypothesis: synchronous notification re-evaluates active queries and their rules before the commit response. A commit whose notification/query/rules durations approach its RPC post-marker delay supports that location; large delay outside these measured regions rejects that explanation for that commit. High actual active counts alongside increased per-commit query work supports investigating listener population; low counts and fast commits are another isolated non-reproduction, not a historical fix. No preceding cohort is reconstructed without measured need. Do not repeat the earlier1→33 directory experiment.

Pinned emulator1.22.0 SHA9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c: javap shows CloudFirestoreV1.commit/snapshotQuery, synchronized ListenStreamManager.notifyListeners and DefaultEmulatorRulesAuthorizer.checkQuery/checkLookup. Existing EmulatorRequestsListener exposes permission traces/context, not safe per-commit active counts. Existing JFR samples cannot measure individual elapsed calls. Therefore the smallest selected observer wraps those five methods only, in an opt-in test JVM agent using JDK21's bundled ASM. No dependencies/install, service code, test assertions or required workflows change.

## Measurement and limits

CloudFirestoreV1.commit allocates a process-local sequence; synchronous nested query/notification/rules calls inherit it through a ThreadLocal. Outside-commit work has sequence0. Start epoch milliseconds connect server windows to retained client timing; sequence is not a document/command ID. Notification reads actual query-target and stream map sizes under the existing synchronized method lock. Stream count is connections, not document-target count. Rules duration is nested within query/notification and must not be summed as additional wall time. All method arguments/return/throw identities and original synchronization are preserved. No request, document, identity, path, query expression, key or exception text is exported.

Rows are buffered in memory (cap50,000), written only on JVM shutdown. No file IO inside commits. Explicit activation/transformation/unavailable rows distinguish absent instrumentation. Jar hash checked at class transformation. Demo opt-in and exact Firestore main command exclude the database JVM. Source changes do not enter production bundles. The local run uses the established offline Nix shell, actual emulator, four ordinary authenticated admissions and unchanged feature010 phone strict verification:240s story,30s steps,10s assertions,220tick ceiling, retries0/max-failures1. It may fail at an unapproved reference after settlement; that remains a failure, not story acceptance. Darwin execution is not pinned-Linux reproduction.

## Validation before the one run

Nix Java21.0.11/Node24.18.0/Bun1.3.13 verified. Node24 differs from declared Functions22. `build-check.sh /tmp/cluster-query-observer-210` passed return/exception identity, query/stream counts, failed nested sequence and context retirement fixture; `-Xverify:all` successfully loaded all five transformed methods from the actual hash-guarded emulator. Fixtures are tooling checks, not player-service evidence. No browser execution yet.

Exact run source is committed before execution and recorded by observe-feature010.sh with spec/observer SHA256. Output /tmp/cluster-query-observer-210; no prior evidence overwritten. Only this one case is authorized here. Existing JFR/profiles and strict208 artifacts remain retained unchanged. No baseline promotion or deadline changes.
