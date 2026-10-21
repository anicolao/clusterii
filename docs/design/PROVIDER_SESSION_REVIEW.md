# Firebase credential revocation

Your devices now revokes Firebase refresh credentials as well as Cluster access. Google reauthentication identifies the account; the server derives its UID. Saved identity, memberships and authorized campaign keys remain intact. The shared production control explains the effect and asks the player to wait for completion before signing in again. The gallery and animation lab use this same control.

## Authority and interruption recovery

The additive `revokeCredentials` callable retains the operation UUID across reload and retry. A Firestore pending fence closes private reads, key delivery and command effects while a 120-second lease serializes recovery. The function has a 60-second runtime. Each checkpoint checks the lease token, expiry and account operation. The RTDB mirror cannot decrease its cutoff or downgrade a completed cutoff.

Firebase revocation has second precision. The worker waits past the admitted request/confirming sign-in second before calling the supported Admin `revokeRefreshTokens` API, then reads back `tokensValidAfterTime`. The original request cutoff remains immutable. If a worker dies after the provider committed, its replacement recognizes the advanced provider timestamp and completes without revoking later sign-ins again. Completed replay does not change the provider timestamp, account fence, saved identity or campaign keys. See [Firebase session management](https://firebase.google.com/docs/auth/admin/manage-sessions).

A stale worker checks its lease again after provider readback and before mutation, and cannot checkpoint or complete a replacement. The provider API does not accept our Firestore fence token: an already dispatched external request cannot be recalled or atomically committed with Firestore. Arbitrarily delayed external delivery is not certified as exactly once. Cluster access fences remain the authorization boundary; the UI instructs players to await completion. The recovery tests control suspension around actual service operations, not provider substitutes.

Older previews retain `revokeSessions` and its access-only behavior. A pending operation upgraded to protocol 2 routes legacy recovery to the native service, and an older in-flight worker cannot complete that upgraded Firestore fence. Completed legacy operations retain their original result. Deploy both compatible endpoints before publishing the new client.

## Evidence and limits

The Auth emulator's `grantToken` handler in firebase-tools 15.25.0 does not consult `validSince`. It cannot certify hosted refresh-token rejection. Tests instead verify the actual Admin revocation timestamp, rejection of the original ID token through Admin verification and the real service, and the application authorization fences. No fake refresh rejection is installed in production or tests.

The two-device browser journey passes in 22.8 seconds: actual emulator Google popups, cancelled reauthentication, interruption after the durable claim, persisted recovery after reload, renewed Google confirmation, both devices ending, focus restored to Play and saved identity surviving sign-in/reload. Four-size controls and phone error/recovery captures are retained under [provider-sessions](../ux/reviews/provider-sessions/). Existing baselines remain unchanged. Implementer inspection covers all four sizes and phone error/recovery; independent visual acceptance is pending.

Type checks, lint and 22 unit tests (345 assertions) pass. The final combined native/access-fence cohort passes seven tests and 155 assertions in 34.85 seconds with both mock encryption and live-KMS AES-GCM. It covers concurrent initiation, unchanged keys on recovery, lost provider checkpoint, expired-worker replacement, interrupted completion after the RTDB mirror and completed replay preserving later sign-ins. Five shared gallery/lab checks pass in 8.5 seconds. [Retained results](../ux/reviews/provider-sessions/verification.json). The full default service cohort also passes 19 cases and 1,043 assertions in 55.56 seconds, with nine live-only cases skipped. Both compatible endpoints are deployed to clusterii-20261020 before preview publication. Latest-head CI remains a gate.

Hosted Google reauthentication and actual hosted refresh rejection remain unverified. No human account was revoked during validation. Account KEK rotation/history rewrapping and compromise recovery remain open; previously downloaded secrets remain known. This slice does not complete account lifecycle, approve proposed game rules or open public campaigns.
