# Cluster II technical contract

This step 0 contract defines deployment, identity, state, encryption, and client boundaries for the MVP. It is design for review; it provisions no services and imports no predecessor data. Gameplay is specified in [RULES_SPEC.md](RULES_SPEC.md); screen and input behavior remain in [UX_DESIGN.md](UX_DESIGN.md).

## 1. Runtime and environments

Use Node.js 22 for Cloud Functions, TypeScript for shared/server/client code, Bun for installation and developer commands, SvelteKit static output, and Threlte/three.js for the galaxy. Node 22 is a supported Firebase function runtime in the current [official runtime configuration](https://firebase.google.com/docs/functions/manage-functions). Exact Bun, frontend, Firebase SDK, and emulator patch versions are locked together by milestone 1's clean-install/build/emulator compatibility check; no unresolved package version is allowed into a deployment.

Use a **new Firebase project for Cluster II**, distinct from `cluster-7c384`. Its repository alias is `clusterii`; the globally unique project ID is assigned and recorded during milestone 1 provisioning. Region is `us-central1` for Functions and Firestore; locate the Realtime Database in the corresponding supported US location. Production and retained previews use this project and the same canonical `/games/{id}` identity. Do not use PR number or URL base path in storage keys. A developer-only game flag and membership/roles separate test games from public campaigns. Mock games are never publicly joinable.

Do not migrate live Cluster I games, keys, users' game history, or test fixtures. Preserve that project untouched as an archive. Reuse selected source/art with provenance. Google account authentication supplies a fresh identity in the new Firebase project; no cross-project UID continuity is assumed.

Local development uses `demo-clusterii` and explicit Auth, Realtime Database, Firestore, and Functions emulator endpoints. An emulator-mode process fails if any endpoint or project ID points at hosted production. A base-path-aware static server models Pages; there is no Firebase Hosting deployment. CI has no live application-data credentials for routine tests.

## 2. Pages publication and compatibility

Build `/clusterii/` from reviewed main and `/clusterii/prN/` from each same-repository PR, including stacked PRs. Prerender entry routes with trailing slashes; `/game/?id=...` loads the game in the browser. `$app/paths` supplies the build base to every link, asset, invitation and sign-in destination. Unknown routes show a bounded recovery scene. A direct refresh needs an actual static route file, not a rewrite to index.

Publish through a retained `gh-pages` tree. Serialize publishing writes across destinations; verify the source head is still current immediately before writing. Replace files only inside the destination, removing obsolete files there while retaining sibling previews. Exclude `.git`, test fixtures, source-only art, private keys and credentials. Record source SHA, build source SHA and workflow URL in `revision.json`; diagnostics display them, ordinary player UI does not.

Publication and verification are independent workflows on all PRs. Post/update the preview link when served and verify its revision/asset paths. CI passing is required for approval but never blocks a buildable review preview from being published. Fork PRs receive build/test artifacts only, not repository-write or backend-deployment credentials. Retain closed PR previews for 30 days, then remove that destination only. Public campaigns cannot rely on an expired preview URL to exist; their canonical identity remains accessible from production.

Functions, indexes, security rules and schedules deploy separately with additive compatibility. Each game has `rulesetVersion`, `schemaVersion`, `commandProtocolVersion` and `encryptionEpoch`. Publish backend support first, then dependent clients. Old compatible clients keep playing; unsupported clients become read-only with a game-language recovery route. Never migrate a campaign just because the user visits another build. Test Google authorized domains/redirects on the Pages origin and preserve the intended game across sign-in.

## 3. Identity and roles

Use Google sign-in; gameplay has no anonymous seats. Profile contains alias and portrait ID, never tokens. Display aliases and faction portraits in rosters; never expose raw UIDs as player names. Account changes clear private state/drafts before loading another account.

Roles are `player`, `operator`, and `developer`, stored as server-controlled claims and checked again on privileged operations. Operators create/archive/pause public games and mark a corrupt game no-contest. Developers create dev games, seed fixtures in emulator environments, and migrate dev encryption modes. Neither role silently bypasses membership to read player messages through the ordinary client. Support tools are separate, access-audited server operations. The backend is trusted and technically able to process private state; this is not end-to-end secrecy from operators.

A public lobby exposes its supported configuration, faction slots, alias/portrait roster, objective and fixed pair-history penalty table. Members can access public star catalogue and entitled game objects. Nonmembers cannot read gameplay objects, snapshots or activity by guessing a game ID. Former players retain only their previously authorized observations and reports, plus public results. An invitation conveys game/room choice, never another player's authentication or seat.

## 4. State, ingestion, and ordering

Retain Realtime Database command ingress and Cloud Functions processing, with Firestore as the authoritative state/history store. Client commands are create-only at `/commands/{gameId}/{uid}/{commandId}`; rules require authenticated path UID, bounded payload, allowed client command kind, and no overwrite/delete. Body actor IDs are ignored/rejected. Scheduler/admin commands use a separate server-only channel.

Admission occurs in a Firestore transaction that authenticates membership, validates schema, assigns sequence/effective tick, and writes receipt plus resource reservations. A Realtime Database trigger delay does not backdate the authoritative admission time. The UI's Sending state ends only on the server receipt. `commandId` is stable across retries; a repeated ID with a different body is rejected.

Use one leased transition writer per game, with fencing tokens and compare-and-swap on the current revision. The canonical head references an immutable revision manifest, public summary, outcome receipts, and encrypted object versions. For a large transition, write encrypted immutable chunks into an inaccessible staging namespace first; atomically commit the manifest/head and receipt references only after all chunks validate. Readers follow committed manifests only. Failed or superseded staging writes have no game effect and are garbage-collected. No query assembles a mixed revision.

Commands apply according to RULES_SPEC tick phases. Reservations are explicit state, not additional spendable balances. Successful tick publication acknowledges every due command, releases failures, and settles resource changes together. Transactions retry against a stable input batch and persisted random outcomes, not fresh dice rolls. Late/duplicated trigger delivery returns the existing receipt. A replayed action cannot issue another dividend, spawn another lobby, or advance another tick.

The reducer receives time, IDs and random draws as explicit inputs. Full hidden game seed and private outcomes stay server-side. Persist authoritative patches with numeric monotonic revisions, snapshots every 96 ticks, and a checkpoint before schema/encryption migration. Client-visible history is made from authorized object/report versions, not a complete secret command replay. Chunk manifests enforce bounded size below Firestore document limits; exact byte/chunk budgets are performance parameters fixed in milestone 2 before scale testing.

## 5. Object visibility and cryptographic providers

Keep `seal/open` and `wrap/unwrap` behind a provider interface selected by the game's server-owned mode. Envelope fields are format version, mode, game ID, object ID, object revision, encryption epoch, key version, algorithm, nonce, ciphertext, and authentication tag where applicable. The envelope schema never treats a mock payload as real ciphertext. The codec serializes arbitrary JSON/Unicode/newlines without loss.

Use an **object key per immutable object version**. The trusted backend encrypts that version once, then issues recipient grants only when rules permit observation. Observations of enemy objects are immutable report objects; possessing an old report key never reveals a future authoritative version. Current own-state grants are private to that owner. Shared reports/message-history admissions explicitly add grants to those exact versions.

Real provider: AES-256-GCM with a unique random 96-bit nonce per encryption key and a 128-bit tag. Authenticate canonical game/object/revision/epoch metadata as additional data. The [Web Cryptography specification](https://www.w3.org/TR/WebCryptoAPI/) defines AES-GCM's authenticated-data and tag behavior; tests must reject changed ciphertext or metadata. Persist the encrypted result for retry instead of regenerating keys/nonces in a retried commit.

Recipient grants use a per-user, per-game key-encryption key (KEK), also AES-256-GCM, authenticating recipient UID plus object/version/epoch. KEKs are generated randomly by the backend; never derive them from an email, UID, or password. Root server wrapping keys are protected through managed KMS; server-only wrapped key material is outside all client-readable trees. KEKs are delivered through an authenticated membership-checked endpoint over TLS and held in client memory, not public documents, bundle config, URLs, logs, or localStorage. Wrapped object grants live in recipient-readable paths enforced by database rules. The browser must be authenticated to receive both the KEK and grants; ciphertext alone confers no access.

Sign-in on a new device recovers currently entitled keys through the trusted endpoint after membership checks; there is no user-managed recovery phrase. Reauthentication is required for key recovery after a reported compromise. Rotate the user's KEK, revoke delivery of the old one, and rewrap current entitled grants; future object versions use fresh object keys. Previously downloaded data remains disclosed. Tampered envelopes, missing keys, epoch mismatch, and unsupported versions fail explicitly, never fall back to plaintext/mock. Real-provider implementation and independent security review are milestone 2 release gates, not evidence supplied by choosing an algorithm here.

Mock provider: preserve reversible prefix-style fake encryption as a development codec, with explicit framing/escaping so any JSON content round-trips. It implements the same envelope/context/grant interfaces and normal wrong-key failure paths. It is inspectable and forgeable and claims no cryptographic authenticity. Backend permissions, command validation, recipient paths and production rules are identical in both modes; tests must not bypass them when using mock.

Each new dev game chooses `mock` or `real`; public creation always chooses real. Mode controls live in developer diagnostics. For an existing dev game: acquire exclusive migration lease, pause, reject new mutation admission, finish or roll back the in-flight transition, snapshot, transform all retained ciphertext/grants into a new epoch, verify replay/recipient equivalence, atomically activate the epoch, then resume. Existing reservations and accepted pending commands retain their identities and relative effective ticks. Clients discard old keys and rehydrate. Failure leaves the prior epoch authoritative and resumable. Keep old epochs inaccessible until their verified retention deletion; a game remembers forever that mock data was exposed and cannot be promoted to a confidential public campaign.

## 6. Access and retention

Firestore defaults to deny. Clients read public lobby information and their member-authorized encrypted views/grants only. They never read the canonical plaintext/reducer state, seed, KMS wrapping keys, other users' KEKs/grants, ingress inboxes, or staging chunks. Server-only state at rest is encrypted too; selected searchable metadata contains no hidden force, message, queue, or research values. Do not expose plaintext in summaries, logs, errors, telemetry, accessibility properties, or notifications.

Chat membership, alliance membership and observation grants are independent. Future-only admission receives no earlier key; selected-history admission receives only selected versions. Revocation stops future keys. New message versions use fresh object keys so old grants cannot decrypt new content. Sender identity and timestamps come from authenticated admission, not a trusted message body. Surrender, elimination and completion never create an omniscient reader.

Retain active campaign state and recoverable history throughout the game. Retain finished encrypted history for 90 days, then delete private content and grants together. Retain minimal public result records—campaign ID/ruleset, participant identities, public faction/alias snapshots, end status and winners—for the repeat-partner rule. Retain command deduplication receipts at least as long as their campaign can mutate; terminal campaign state prevents old commands from reopening it. Before launch, publish the player-facing retention explanation and account-deletion behavior; the latter is a milestone 12 operational/legal review dependency, not an authorization to silently retain deleted private content forever.

## 7. Client/UX binding

The cinematic concept plates establish composition, not data or extra mechanics. In particular, mineral/water icons and planet counts do not create mineable resources. The public map catalogue makes every star selectable; an unknown layer remains Unknown rather than Unclaimed. Normal game UI never exposes the crypto toggle, revision numbers, or raw IDs.

Use the following bindings to remove conditional UX promises:

| UX family/stories | Version 0.1.0 behavior |
| --- | --- |
| 01–03 / UX-01–02 | Google sign-in when joining/resuming; supported 4/8/12-seat briefing; faction seat quota; automatic full-lobby start, no ready/start button. |
| 04–05 / UX-03–04 | Public names/classes/positions; exact own layer state; timestamped enemy reports; separate owners; held credits are never spendable. |
| 06–07 / UX-05–06 | Four-tick serial layer queues; exact quoted cost, cancel refund and completion; 100 focus points and bounded completion dividends. |
| 08–09 / UX-06–07 | Eight tracks, retained research progress, next-tick level effects; passive scans, no manual Scan action. |
| 10–12 / UX-08–09 | Fighters carry ten infantry each; no mid-flight edits; automatic assault after orbital victory; no manual Attack confirmation. |
| 13–14 / UX-10–11 | Explicit history scope; consented alliance admission/departure notice; credits and observation offers only, no troop/star transfers. |
| 15–16 / UX-12,14 | Retry one command ID; preserve in-memory drafts only while entitled; show catch-up without old animation bursts. |
| 17–18 / UX-13,15 | Shared territorial result or deadline draw; eligible winners equally prominent; no individual winner or ranked reward in this ruleset. |
| All / UX-16 | Desktop and separate phone composition; 44px targets, 16px body/14px secondary text; contrast/focus, bounded scrolling, input alternatives and safe areas. |

Support desktop Chrome, Firefox, and Safari, Android Chrome, and iOS Safari in their current and immediately preceding major versions at milestone 1's recorded support freeze. Automated geometry/visual targets remain 393×852, 1440×1000, 3840×2160, and 1280×720 at DPR 1; manual Safari/phone sign-in and keyboard tests supplement pinned screenshot rendering. Browser zoom/text enlargement must fall back to the phone task composition. No shared-table mode, native app, audio dependency, or external push/email notification is added to the MVP. In-game activity is sufficient notification; external channels require a separate scope decision.

## 8. Dependencies that must close before implementation gates

| Decision remaining | Owner and deadline | Evidence needed |
| --- | --- | --- |
| Unique Firebase project ID, billing, KMS binding, role bootstrap | Repository owners + milestone 1 | Recorded project metadata and least-privilege deployment identity; no provisioning in this PR. |
| Exact compatible package/runtime patch pins | Milestone 1 | Frozen lockfile and reproducible clean build, Pages routing, sign-in/emulator smoke checks. Node runtime family is 22. |
| Storage chunk sizes, bounded replay budgets and rate limits | Milestone 2 | Concurrent command/recovery tests and maximum-map measurements; reject oversize input before staging. |
| Real provider/key service correctness | Milestone 2 | Known-answer crypto tests, unauthorized/tamper/replay/substitution cases, rotation/recovery/migration review. Mock does not satisfy this gate. |
| Balance acceptance | Milestone 11 | Cross-faction/map/coalition simulations and real-cadence campaigns; change versions rather than modifying active rules. |
| Account deletion/public retention disclosure | Milestone 12 | Documented player flow and operator deletion/retention procedure. |

These dependencies do not leave hidden gameplay defaults. The review resolves the architecture and numeric rules now; implementation-specific compatibility, provisioning and measured budgets close at their explicit gates.
