# Step 1 review

[Open the preview](https://anicolao.github.io/clusterii/pr4/). Select **Learn the game** to read the four chapters. **Play** opens Google sign-in and the commander identity. Save a name and portrait, reload, and reopen Play to recover that identity.

The hosted Google provider requires a project OAuth web-client ID and secret. The CLI account can configure Firebase but is denied access to Google’s client-management service. No alternate login, simulated account, or fallback storage replaces this dependency. The complete sign-in/save/reload journey passes against the Firebase emulators.

## Implementation

The UI uses independent desktop/phone scenery, semantic controls, local fonts, and eight cinematic portraits. [Asset provenance](../art/PRODUCTION_ASSETS.md) records source art and generation prompts. The entry, field guide, and identity are production components. Continue, campaigns, and the 3D renderer ship with their corresponding interactions.

A save follows Google identity → authenticated key recovery → encrypted create-only command → server validation/reducer → Firestore transaction → encrypted immutable version and owner grant → authoritative receipt → browser acknowledgement. Version checks reject concurrent stale edits. Command receipts deduplicate delivery; transient trigger failures retry. Profile documents, grants, and history are owner-readable; keys and all writes remain server-only. Mock encryption is inspectable and forgeable. The real provider fails closed.

Firebase project `clusterii-20261020` runs Node 22 functions in `us-central1`. Firestore and Realtime Database rules are deployed. The callable endpoint permits HTTP transport and independently rejects unauthenticated requests. Main and preview clients use the same account namespace. Pages publishes retained previews separately from checks, records source/workflow metadata, and removes previews thirty days after closure.

## Evidence

- Strict TypeScript/Svelte checks and Biome pass.
- Codec/reducer tests cover Unicode, escaping, wrong keys, changed metadata, recipient/version isolation, unsupported real mode, alias validation, and stale revisions.
- Firebase emulator tests exercise real command delivery, cross-user denial, direct key/state-write denial, immutable commands, concurrent compare-and-swap, and invalid-key rejection.
- Chromium journeys exercise entry/guide, Google emulator sign-in, profile save, reload recovery, and sign-out clearing. Viewport checks cover 393×852, 1440×1000, 3840×2160, and 1280×720; exact screenshot comparisons use zero pixel tolerance and no retries. Linux CI and local macOS have separate reviewed baselines.
- Hosted HTTP checks verify the preview revision, static assets, diagnostics route, anonymous database denial, and unauthenticated key-service rejection. Hosted authenticated persistence remains gated on Google provider configuration.

The step 0 rule examples and prompt-history checks remain required. Safari/Firefox device coverage, real cryptography/KMS, game roles, per-game mode controls, and campaign mechanics remain delivery gates for their associated interactions; this increment does not certify them.
