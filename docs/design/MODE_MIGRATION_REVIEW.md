# Development encryption migration

A seated developer pauses the campaign, chooses the other encryption mode in Development controls, and submits Change encryption and resume. Progress reports verified retained versions. Current charts remain readable while migration runs. Successful verification activates the new epoch and resumes the campaign; rejected verification preserves the previous epoch and pause so the developer can resume or retry.

Canonical and member history are transformed in pages of ten records. Every version receives a fresh object key, and every recipient receives a new epoch-bound wrapping key. The worker decrypts its new envelopes/grants and compares their authorized content before proceeding. Former-member histories are retained without granting those users current access. Mock exposure remains permanent through later switches to real encryption.

The authenticated migration inbox is separate from ordinary and pause/resume commands. Processing rechecks developer status, membership, revision and source epoch. An exclusive campaign migration marker blocks admissions and scheduled start. Each background step claims a 120-second lease and commits only under its sequence and lease token. A committed step creates its successor task atomically. Duplicate or superseded steps cannot advance the game.

Staged target epochs are inaccessible to clients. Activation publishes canonical state, current recipient views, membership metadata and the single acknowledgement in one transaction. Clients recover new keys when the committed epoch changes and wait for authoritative snapshots when an older encrypted version remains in the local cache. Old-epoch history access closes at activation; the current epoch's authorized history remains queryable.

Failed attempts reserve distinct epoch numbers. Cleanup deletes only that attempt's staged canonical, key and recipient namespaces, so a later successful epoch is isolated. The old epoch remains authoritative until activation. Managed-key outages still require the key service to recover when reading real-mode source data; the implementation never substitutes mock/plaintext processing.

## Evidence and acceptance

The ordinary migration service journey covers concurrent initiators, mutation rejection during migration, old keys and wrong epochs, former-member denial, repeated mock/real switches, an unrelated campaign, corrupted-history rollback and completed-task replay. Browser journeys use actual production controls and two independently authenticated browser contexts at phone, desktop, short desktop and 4K. Both connected clients recover after each mode change; reload retains the same campaign.

The reviewer requested additional worker-crash recovery evidence. The fault test diverts only task notifications in its own test process, while preserving actual Firestore transactions, production claim/processing functions and live KMS operations. It abandons a claimed lease, advances its expiry, runs a replacement, then invokes the stale worker's write/activate/abort paths. It also delays cleanup until a later successful epoch and compares complete retained canonical and recipient histories across page boundaries. This is controlled service-level fault injection, not a claim that a hosted process was killed or that Cloud Eventarc redelivery has been certified.

Live-key tests require explicit credentials and `CLUSTER_KMS_TEST=true`; standard CI skips them. No KMS simulator or fallback is present. Actual hosted Google login, hosted Eventarc recovery/scheduling, compromise rotation, independent visual/security acceptance and public rule approval remain separate gates. Public campaign creation remains closed.

The largest current 12-player started galaxy measures 126,004 bytes for its mock canonical envelope and 125,825 bytes for its real envelope; the measured member JSON is 44,979 bytes. Ten-version migration pages keep this implemented state well within transaction size limits. Future mechanics still require their own scale measurements.

The controlled recovery test passes in 23.1 seconds with 86 assertions; [structured evidence](../ux/reviews/migration/fault-recovery.json) records the boundaries. Exact stale-operation errors are checked after ordinary asynchronous awaits. Bun's asynchronous rejection matcher stalled on this composite service call; direct Node and Bun calls rejected correctly, and replacing only that matcher made the full fault scenario complete without changing production fencing.

Validation includes 12 unit/reducer tests (147 assertions), a full eight-case live service run (231 assertions), the strengthened partial-page rollback journey, the additional controlled recovery test, and final two-device migration journeys at all four sizes. The gallery/lab and maintenance cohort also passes. Actual final progress and recovery captures are retained under `docs/ux/reviews/migration/`.

The default unconfigured environment passes six service cases (91 assertions; four explicit live-key skips) and ten browser cases (one live-key skip). Backend functions and database access rules are deployed. The reviewer independently inspected the controlled fault test source/log; independent final rendered review and committed-head CI remain pending.
