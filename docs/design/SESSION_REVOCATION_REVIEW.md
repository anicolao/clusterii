# Reauthenticated Cluster session revocation

Your devices opens account controls from the signed-in entry. Confirm with Google reauthenticates the commander, then ends Cluster access for sessions at or before the server cutoff, including this device. Saved identity and campaign membership remain. The screen explains that unsaved drafts are cleared and unacknowledged orders may be cancelled. Close restores focus to Your devices; completed revocation returns focus to Play.

## Authority and recovery

The callable requires Google authentication within five minutes and derives the account from the verified token. Each operation has a stable UUID and a durable server-only record. The Firestore account fence starts pending; private reads, key delivery and new command effects remain blocked until the canonical RTDB command database receives its fence. Mirror transactions cannot move a cutoff backwards or return a completed cutoff to pending. Completion publishes a command-ingress time boundary and an immutable operation result. Replaying a completed operation cannot end a later session.

Direct Firestore reads and RTDB writes require a sign-in auth_time strictly later than the completed cutoff. Token refresh preserves auth_time, so refreshing the old session cannot regain access. Every delivered key endpoint also checks the account fence and current Auth user state. The only old-session read is its own non-secret fence, allowing an open client to clear private state and sign out promptly.

Command processors read the fence in the same Firestore transaction as their transition. A command admitted by RTDB during an interrupted cross-store update is rejected without a state mutation. Queued commands at or before the completed boundary are rejected as session-ended; existing receipts remain immutable and durably admitted migration jobs continue. The scheduled campaign itself keeps running.

The client retains only the operation UUID in sessionStorage. After an interrupted request and reload, it reopens the recovery screen. Reauthentication can recover the current pending operation from the account's fence, including from another device. A failed request never silently restores old access. No keys or tokens enter this recovery record.

## Scope and remaining gates

This slice revokes **Cluster access**, not Firebase or Google account credentials. Firebase refresh credentials remain issued; their unchanged auth_time is rejected at Cluster data, command and key boundaries. Native provider credential revocation and full compromise recovery remain account-lifecycle gates. Current KEKs and authorized history are unchanged: key rotation and history rewrapping are still required by TECHNICAL_CONTRACT.md. Previously downloaded information remains disclosed. Public campaigns stay closed.

Older retained clients receive access denials after revocation and must sign out and sign in again; this client observes the fence and clears its session automatically. Hosted real-account Google reauthentication, independent security/visual review and exact-head CI remain unverified. Operation-retention/account-deletion policy remains milestone 12 work.

## Evidence

Firestore/RTDB rules and all nine affected callable/command endpoints are deployed to clusterii-20261020. No hosted user session was revoked during validation.

- Type checks and lint pass; 14 unit tests pass with 251 assertions. The default full service suite passes 10 cases with 822 assertions; live-only cases are explicitly skipped there.
- The final live-KMS cohort passes three cases and 95 assertions: both crypto modes reject old-token private reads, all ingress channels and key delivery; token refresh stays denied; a fresh sign-in recovers the unchanged saved identity and campaign keys. Concurrent/replayed operations have one cutoff. Forged owner parameters, unauthenticated requests and stale authentication are rejected.
- A controlled service interruption persists the pending fence before the RTDB mirror. Private reads/key delivery fail closed, an RTDB-admitted profile command gets a session rejection without changing its revision, and the same request completes after retry.
- Ten final browser journeys pass in 42.1 seconds: gallery/lab, four-size maintenance acknowledgements and the two-device security journey. The latter uses actual Google emulator popups, cancels reauthentication, invokes the real service with the browser's verified bearer token and a test-local post-transaction interruption, reloads the pending request, reauthenticates and finishes. The other device clears its unsent draft; the saved identity survives sign-in and reload. This is controlled fault evidence, not a hosted process-kill test.
- [Retained results](../ux/reviews/sessions/verification.json) and entry/control captures at [phone](../ux/reviews/sessions/sessions-phone.png), [desktop](../ux/reviews/sessions/sessions-desktop.png), [short](../ux/reviews/sessions/sessions-short.png) and [4K](../ux/reviews/sessions/sessions-4k.png). Phone [cancellation](../ux/reviews/sessions/sessions-error-phone.png), [recovery](../ux/reviews/sessions/sessions-retry-phone.png) and [signed-out result](../ux/reviews/sessions/sessions-ended.png) are retained. Geometry checks cover containment, overlapping targets, minimum target size and document overflow; keyboard checks cover focus restoration and error focus. Implementation-agent visual inspection is complete; independent review is pending. Existing baselines are preserved.

The initial direct-write test exposed an emulator namespace mismatch. The service now targets the same explicit canonical database as command ingress. The initial popup-cancellation assertion was shorter than Firebase's eight-second auth-event grace period; it now waits for that SDK outcome without dropping cancellation or retry checks. PR #13's maintenance selector correction is merged into this branch; both live regions and exact accepted-command assertions remain intact.
