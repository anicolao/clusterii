# Illustrated device sign-out recovery

Two illustrated journeys separate cancelled Google confirmation from an interrupted account-wide sign-out. Each uses two independent authenticated browser contexts at phone, desktop, large and short sizes. Both devices appear when cancellation preserves a draft, completion ends their sessions and a fresh sign-in recovers the saved identity. Closing the device panel restores its opening control; cancellation focuses the error; completion focuses Play on both devices.

The interruption harness verifies the browser's actual bearer token and invokes the real credential-revocation service. It stops after the authoritative fence transaction, confirms the pending fence and expires only that stopped worker's lease. Reload recovers the persisted operation; ordinary Google confirmation resumes service completion. Transport restoration and Firebase's whole-second authentication boundary are explicitly labeled harness controls. No session result or saved identity is fabricated.

Read-only profile checks require exactly one revision, version and acknowledged receipt throughout cancellation, completion, fresh authentication and reload. The unsaved second-device draft survives cancelled confirmation and is discarded only when that session ends. The procedural test is removed after its replacement passes all four sizes with the original assertions preserved.

Candidate inspection also exposed prior-session “Identity saved” feedback after fresh authentication. The account observer clears profile feedback with the rest of account-scoped state, and the fresh-sign-in step asserts that recovery never claims a new save. The retained pre-fix captures demonstrate the stale message; the interrupted flow had hidden it through reload.

Base: `feat/maintenance-stories` (#39). Pinned Linux generation/comparison, current-head application CI, independent composition/motion review and hosted Google acceptance remain open. This migration does not approve proposed gameplay rules or certify production provider revocation. No PR is merged.

Exact local verification passes 12 journeys/124 captures: eight device journeys/104 captures and four unchanged identity journeys/20 captures. See the [generated stories](../testing/STORY_INVENTORY.md#device-recovery-narratives). Type checks, lint and story policy pass; pinned Linux/current-head CI remain separate gates.
