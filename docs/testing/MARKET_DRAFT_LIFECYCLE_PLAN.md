# Market draft account and access lifecycle story plan

Status: **account-wide sign-out story implemented, not executed** in a successor to #82 (`test/market-draft-lifecycle-plan`). Membership-fault, different-account reuse and new accepted-order steps remain planned. UX-06/14/16 and E2E_GUIDE govern this work. The production fix has scoped source/helper evidence and navigation stories; those do not prove live account/access-loss acceptance. The implemented story changes no production code, gameplay rule or baseline; existing assertions remain intact.

## Real player journey

Implemented `tests/browser/market-draft-lifecycle.story.spec.ts`, using the existing TestStepHelper fixture, named steps and ordered owner/control-device/other-player viewpoints. Reuse the actual authenticated admission pattern in construction.story.spec.ts and device confirmation in session-recovery.story.spec.ts. Do not copy the long construction story or substitute a component specimen for a campaign.

Create a new development campaign through ordinary UI with four independent saved identities. Admit/start using the existing explicitly labelled fixed catalogue/domain-clock and real scheduler delivery. A second authenticated browser context belongs to the owner; a third belongs to another actual seat. Save identity once and retain its revision. Start from canonical/private snapshots and record each account's authoritative allocation, receipt set, wallets and systems.

| Named step | Player action and acknowledgement | Named facts and viewpoints |
| --- | --- | --- |
| inspect-owned-focus | Owner opens Economy → Market focus with keyboard; named heading receives focus. | Fields equal that owner's latest accepted/configured allocation; other player's private allocation is separate. Capture owner and other player. |
| edit-partial-allocation | Owner blanks Market and sets Camp to73. Native fields acknowledge those exact values; invalid-total remedy disables Apply. | No `market.focus` write, receipt, revision, wallet/system or private-view change. Capture partial intent and observer. |
| navigate-with-intent | Back to economy → Return to galaxy → Economy → Market focus. | Blank/73 restored, keyboard focus contained, commitment visible before any scrolling. Run the same navigation under normal motion, return to reduced motion for pinned captures. |
| open-session-control | Owner's second device opens Your devices from entry. First device stays on its existing campaign page. | Actual Confirm with Google control; first device still shows its draft. Capture both. This avoids confusing route unmount with live auth revocation. |
| confirm-session-end | Second device completes ordinary Google reauthentication and account-wide sign-out. | Real revocation service/fence acknowledges completion; first device loses protected market/campaign UI without reload or navigation. No new market command. Unrelated player's session/view stays authorized and unchanged. Capture all three viewpoints. |
| other-account-same-browser | After the real auth-time boundary, sign into the first browser as the other saved seat and open its campaign through Play. | No identity resave; fields equal this seat's authoritative allocation, never the prior blank/73. Canonical gameplay state/receipts unchanged. Capture both accounts' views as applicable. |
| return-original-account | Use ordinary Sign out, sign back in as the original owner and recover the exact campaign. | Original saved identity revision unchanged. Unsent blank/73 does not resurrect; authoritative allocation loads. No automatic Apply or generated replacement command. |
| acknowledge-one-order | Make a valid allocation and Apply once through keyboard. | Exact logical command ID/payload, one accepted receipt and one revision; owner/other-player projections and wallets remain properly scoped. |
| reload-accepted-order | Reload the campaign and reopen Market focus. | Same authoritative order/receipt recovered, duplicate Apply disabled, no second logical command. This contrasts durable submitted-order recovery with cleared memory-only intent. |

Match sign-out acknowledgements to the actual surface. Entry currently reports “Your session ended. Sign in to continue.”; the campaign route may show a different signed-out remedy. Inspect the rendered outcome rather than imposing the entry selector or broad `getByRole('status')`. Validate no residual protected inputs/text, proper focus and no console error.

## Membership/subscription boundary, separately labelled

Active campaigns reject `campaign.leave` in the current reducer. Do not invent active withdrawal/surrender or claim a waiting-campaign departure proves active market draft clearing. A session-end journey proves real account access loss; it does not alone exercise the separate membership callback fence.

For that remaining boundary, design a separate guarded emulator authorization-fault case. Use a real started campaign and credentials. If testing removal of authorization projection metadata (`campaignStates.memberUids` and the matching membership document), label it an administrative fault, never a player move or a production migration. Preserve original encrypted state/history, all resource data and receipts; use compare-and-set restoration of only the exact fault-owned metadata. Firestore's actual member rule must deny the old private-view read. Deleting only the membership list document is insufficient: read authorization checks memberUids.

Hold a real in-flight view delivery/decryption at a test-only boundary, revoke access, observe the production remedy/cleared UI, then release the original unchanged delivery. Assert it cannot re-open the view or recreate the draft. Restore authority only through an explicitly reviewed harness and recover through normal UI; the old unsent draft must remain absent. Keep this case separate from ordinary session revocation and do not describe it as approved active-game membership gameplay. Implement fail-closed demo/runtime/signature controls before running such a fault; this document does not provide or claim those controls exist.

## Evidence and execution gate

Require phone393×852, desktop1440×1000, large3840×2160 and short1280×720, real keyboard actions/focus restoration, fixed action rail, bounded panels and no document overflow. TestStepHelper owns font/image/finite-motion readiness, named authoritative assertions and ordered captures. Normal/reduced motion must preserve outcomes. Keep all existing navigation, privacy, conservation and recovery regressions.

No new baseline family exists yet. Once the story is implemented and disk headroom restored, run a clean-source bounded generation, review each viewpoint independently, then strict verification. The title filter discovers four viewport cases. Commands are ready after the disk gate, but neither generation nor verification has run:

```sh
export PATH=/nix/store/vnycnlns50zkb0pns9rd7vhpv3m0fxc4-zulu-ca-jdk-21.0.8/bin:$PATH
export FIREBASE_EMULATORS_PATH=/tmp/cluster-route-emulator-cache
CLUSTER_STORY_FILTER='Live market allocation clears' bun run test:stories:generate
# Preserve candidates; review source/renderer/ordered stories before promotion.
CLUSTER_STORY_FILTER='Live market allocation clears' bun run test:stories
```

Known existing navigation regression, runnable after storage recovery: `CLUSTER_STORY_FILTER='Live construction' bun run test:stories` with the same Java/emulator environment. Never present a zero-test filter as acceptance. No new run, capture, candidate promotion or test pass is claimed by this plan.

## Concrete disk blocker

Data volume measured602MiB, then564MiB, then358MiB free during this low-output audit. The continuing decline is not explained by this text-only change. Existing retained draft failure evidence is262MiB, candidate evidence414MiB, full strict evidence582MiB and final targeted evidence46MiB. A comparable candidate-plus-strict cohort alone uses about996MiB before build, traces, git operations or safety margin. The inspected disposable `.svelte-kit`, `build` and `functions/lib` total about22MiB; removing them would not restore adequate headroom. No cleanup was performed. Failure traces, captures, sources, worktrees and credentials remain intact.

Resume sustained capture work only after additional headroom is available; target at least2GiB free for a bounded cohort and its failure margin, then remeasure between runs. Do not download the4.44GB Linux artifact. This is a storage blocker, not completed implementation or release acceptance.

## Account-wide session implementation — 2026-10-22 08:29

The new story implements inspect-owned-focus, edit-partial-allocation, navigate-with-intent, open-session-control and confirm-session-end, followed by fresh authentication of the original owner and recovery of authoritative allocation. It uses actual Google confirmation and the real session service. The first campaign device remains mounted: URL, main-frame navigation count and document time origin must remain unchanged during revocation. Its signed-out remedy is distinct from the control device's entry acknowledgement. Other-player views, complete canonical/private state, saved identity revision and receipt sets must remain unchanged; transport observation starts before login so existing sockets cannot escape the no-market-write assertion.

Static type checking,28 policy/loader tests and four-case discovery pass; discovery is not execution. Seven named player steps define16 viewpoints per viewport, with explicit keyboard/fixed-rail and normal/reduced-motion checks. No generated narrative, capture, baseline or runtime pass exists yet. Different-account same-browser reuse, new accepted/uncertain order recovery and the membership callback fault remain separate plan items. [Source-review and failure classification](../design/MARKET_SESSION_STORY_REVIEW.md).
