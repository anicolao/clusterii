# Managed encryption for development campaigns

New development campaigns choose the mock codec or AES-256-GCM. Public creation remains closed while rules, migration and independent security acceptance are unfinished. Existing campaigns retain their mode; paused mode migration is a separate increment. Mock exposure remains part of a game's permanent identity.

Real mode encrypts ingress commands, each immutable canonical version and each recipient projection. Fresh object keys protect canonical and member versions. Recipient grants use independent per-user/per-game keys. A separate real ingress key protects account commands; it never reuses the inspectable development-profile key. Server wrapping material is protected by Cloud KMS with authenticated purpose strings. No real key is stored in client-readable documents, localStorage, URLs or static configuration.

The backend runtime receives encrypt/decrypt permission on the campaign wrapping key only. The key rotates every 90 days. Calls verify Castagnoli CRC32C transport checksums in addition to the cryptographic authentication supplied by KMS. Browser envelopes use random 96-bit nonces, 128-bit tags and authenticated format/mode/algorithm/game/object/revision/epoch/key-version metadata. Recipient identity is bound through the grant context. Unsupported modes, altered ciphertext, wrong keys and substituted metadata fail closed.

Firestore transaction retries reuse prepared ciphertext and canonical key wrapping for an unchanged transition. A committed receipt prevents reapplying the command. Each immutable canonical version retains its protected object key; the service can read legacy mock versions without changing their format. Authorization and entitlement projection remain required in both modes.

## Evidence and gates

Unit tests cover an independent OpenSSL interoperability vector, Unicode/JSON round trips, nonce variation, wrong-key rejection, grant recipient substitution, altered tag/nonce/ciphertext and authenticated metadata changes. The CRC32C check uses the standard 123456789 vector. Live Cloud KMS wrapping, integrity verification and wrong-purpose rejection have been exercised from the authorized CLI account.

Live-key service and browser tests require `CLUSTER_KMS_TEST=true` and explicit local application-default credentials. They use the Firebase emulators for game state and the actual managed KMS key; there is no KMS mock or software fallback. Default CI runs codec tests and mock-mode service/browser coverage, and reports the live-key tests as skipped. Local live-key results, retained UI captures, deployed endpoint checks and independent security review are required before accepting this slice.

The development profile interaction still uses the explicit mock codec. Real campaign ingress keys are independent of that profile key. Public identities and public-game admission are not enabled by this change. Existing-mode migration, compromise recovery/rotation, bounded encrypted-history recovery and hosted Google/scheduler acceptance remain open.

API details were checked against Google's Cloud KMS v1 discovery schema, including authenticated data and request/response checksum fields. Real provider interoperability uses the platform Web Crypto API and Node/OpenSSL reference encryption; no application-written cipher is introduced.

Local validation: 10 unit/reducer tests (129 assertions), five service tests (151 assertions), and five affected browser journeys passed. Real-mode service coverage includes four independent members, concurrent scheduled-start delivery, exactly one transition and private distinct home assignments. The final copy correction passed its real-mode browser rerun. The service tests use live KMS and emulated state; the scheduled worker is invoked directly, not by hosted Cloud Scheduler. Type and formatting checks pass.

Retained actual renders: [encryption selection](../ux/reviews/secure-campaigns/real-encryption-create.png) and [recovered galaxy](../ux/reviews/secure-campaigns/real-encryption-recovered.png). Independent visual/security review remains pending.

The default environment also passes three service tests (65 assertions) and the browser check that unavailable managed encryption is disabled. Its two live-key service cases and one live-key browser case are explicitly skipped. No live credentials are needed by standard CI.

The five campaign functions and Realtime Database envelope rules are deployed to `clusterii-20261020`. Both new callable endpoints return HTTP 401 without authentication. This checks deployment and unauthenticated denial; it does not certify a hosted Google sign-in, hosted user key delivery or hosted scheduled start.

The final creation control uses the existing fixed commitment rail. Four-size `encryption-settings-*.png` captures record that final layout with the default emulator; the earlier live-key capture records the real-mode selection before that layout correction. Browser geometry checks require Create galaxy to remain in the viewport before scrolling.
