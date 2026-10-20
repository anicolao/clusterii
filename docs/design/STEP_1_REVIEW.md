# Step 1 review

[Open the preview](https://anicolao.github.io/clusterii/pr4/). Select **Learn the game** to read the four chapters. **Play** opens Google sign-in and the commander identity. Save a name and portrait, reload, and reopen Play to recover that identity.

The hosted Google provider is enabled through `firebase deploy --only auth`. Firebase provisions its managed OAuth client from the brand, support email, and callback URI in `firebase.json`. Live API checks confirm the enabled provider, authorized Pages domain, and Google authorization URL with the correct client and callback. The complete sign-in/save/reload journey passes against the Firebase emulators; a real Google account session has not been exercised on the hosted preview.

## Implementation

The UI uses independent desktop/phone scenery, semantic controls, local fonts, and eight cinematic portraits. [Asset provenance](../art/PRODUCTION_ASSETS.md) records source art and generation prompts. The entry, field guide, and identity are production components. Continue, campaigns, and the 3D renderer ship with their corresponding interactions.

A save follows Google identity → authenticated key recovery → encrypted create-only command → server validation/reducer → Firestore transaction → encrypted immutable version and owner grant → authoritative receipt → browser acknowledgement. Version checks reject concurrent stale edits. Command receipts deduplicate delivery; transient trigger failures retry. Profile documents, grants, and history are owner-readable; keys and all writes remain server-only. Mock encryption is inspectable and forgeable. The real provider fails closed.

Firebase project `clusterii-20261020` runs Node 22 functions in `us-central1`. Firestore and Realtime Database rules are deployed. The callable endpoint permits HTTP transport and independently rejects unauthenticated requests. Main and preview clients use the same account namespace. Pages publishes retained previews separately from checks, records source/workflow metadata, and removes previews thirty days after closure.

## Evidence

- Strict TypeScript/Svelte checks and Biome pass.
- Codec/reducer tests cover Unicode, escaping, wrong keys, changed metadata, recipient/version isolation, unsupported real mode, alias validation, and stale revisions.
- Firebase emulator tests exercise real command delivery, cross-user denial, direct key/state-write denial, immutable commands, concurrent compare-and-swap, and invalid-key rejection.
- Chromium journeys exercise entry/guide, Google emulator sign-in, profile save, reload recovery, and sign-out clearing. Viewport checks cover 393×852, 1440×1000, 3840×2160, and 1280×720; exact screenshot comparisons use zero pixel tolerance and no retries. Linux CI and local macOS have separate reviewed baselines.
- Hosted HTTP checks verify the preview revision, static assets, diagnostics route, anonymous database denial, and unauthenticated key-service rejection. Hosted authenticated persistence awaits a real Google account session; provider configuration is deployed and verified.

The step 0 rule examples and prompt-history checks remain required. Safari/Firefox device coverage, real cryptography/KMS, game roles, per-game mode controls, and campaign mechanics remain delivery gates for their associated interactions; this increment does not certify them.

## Supervisory foundation corrections

Profile recovery resubscribes in place and retains drafts and pending command identity. Validation focuses the name field; a conflict requires an explicit **Replace saved identity** action; network recovery reconnects or reattaches the existing receipt. A pending command is dispatched once per live session, including offline retry. Returning from the field guide or identity restores focus to its opening control.

Browser evidence covers two independent sessions conflicting on the same identity, an offline save/retry/reconnect with exactly one observed transport write, keyboard restoration, explicit reduced-motion preference, and phone/desktop/4K/short identity and validation states. Geometry checks include radio targets, overlap, viewport containment, occlusion and bounded document scroll. Fresh entry captures show illustrated planet/observatory controls with real labels; phone identity rendering is unchanged. Implementer visual inspection is complete; independent supervisor review remains outstanding. Baselines alone do not establish that acceptance.

[Delivery dependencies and acceptance](DELIVERY_REVIEW.md) tracks the stacked successors and unresolved rule decisions.

CLI verification on 2026-10-20 attempted Google sign-in with the existing authorized Firebase CLI account token. Identity Toolkit rejected it with `INVALID_IDP_RESPONSE` because its OAuth audience belongs to the CLI rather than this Firebase application. No audience exception was added. This neither proves nor disproves the application popup/return flow; actual hosted Google sign-in and persistence remain unverified.
