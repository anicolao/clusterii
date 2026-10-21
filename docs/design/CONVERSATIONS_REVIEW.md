# Private conversations review

This slice delivers named conversations, explicit invitations, acceptance/decline, participant removal/leave, closure, message acknowledgement, unread state and authorized history recovery. Alliances and binding exchanges are separate capabilities.

## Development decisions under review

New campaigns record `conversationsVersion: 1`. Older campaigns retain their behavior/history and explain that conversations require a new development campaign. Membership and messages execute immediately in a server-ordered room stream; they cannot move forces, credits or resources. Maintenance pauses conversation writes and migration fences every command.

Invitations grant messages sent after acceptance. No earlier message is silently shared. Selective sharing of named earlier message ranges remains incomplete and requires a separate reviewed slice; the invitation states the supported scope directly. The creator manages invitations/removal and closes the room; other members may leave. This slice limits each commander to four conversations, titles to 60 characters and messages to 2,000 characters. These operational limits and admission policy are development choices, not new owner approval of rules.

## Persistence and privacy

The canonical state retains each room's membership, ordered sequence, read positions and latest message. Every accepted message is also retained in the existing immutable encrypted recipient history, so active state is bounded independently of message count. The client reads actual authorized history pages and deduplicates message IDs; it never invents missing messages or presents the first page as complete history.

A message captures its recipient set and membership key version at admission. Invitations carry no message body. Removing a participant removes that room from future projections; immutable older views retain only knowledge previously disclosed. Rejoining does not grant messages sent during absence. Member changes advance the room key version. Publication generates fresh random data keys for every canonical/recipient revision and wraps them through the same mock/real provider; there is no shared long-lived room key available to a removed member. Key rotation is finer-grained than membership changes. The backend is trusted; this is not end-to-end encryption from the server.

Current encrypted views and immutable records use the existing authorization, session fence, receipt binding, retry and epoch migration paths. Proposed evidence must compare all recipients' complete histories through migration, test direct history denial, and prove that old grants cannot decrypt future other-recipient messages. Mock mode makes no confidentiality claim.

## Evidence and limits

Local units pass 73 cases with 1,358 assertions. Both-provider service cases pass 228 assertions using live KMS: future-only admission, immutable recipient history, concurrent removal/send ordering, replay without a second message, stale membership generation rejection, old-data-key decryption denial, unchanged economy/forces and complete recipient histories across both migration directions beyond the ten-record page boundary.

Seven browser/gallery/lab cases pass in 56.5 seconds; the ordinary four-player journey passes in 35.8 seconds. It exercises UI identity/admission, invitation, messages, unread acknowledgement, interrupted transport/retry, removal, rejoining and reload. It checks the same command identity/payload, exactly one authoritative sequence increment, and draft retention until acceptance. Its service-clock campaign start is explicit test control; it does not certify hosted Scheduler delivery.

In-memory drafts survive panel closure and retry. Accepted messages recover from encrypted authorized history after reload. Reload-durable unsent drafts and pending-command outboxes remain incomplete; do not claim those guarantees. Selective older-message sharing, alliance/exchange mechanics, independent security/rendered acceptance, exact-head CI and hosted Google acceptance remain open. Public campaigns remain closed.

Production components and existing faction portraits are shared by the player flow, gallery and deterministic animation lab. No parallel mock messaging UI or generated lettering is introduced. The lab compares invitation, accepted membership, received message, interrupted draft and accepted reply with standard/reduced motion.

The earlier #27 gallery CI timeout was caused by sequential browser measurements over hundreds of controls. The correction batches DOM measurement while preserving size and overflow assertions; all four affected viewport cases pass in 20.7 seconds. It is committed on #27 and propagated through this stack; replacement CI remains a gate.

Four-size [rendered captures](../ux/reviews/conversations/) retain the real accepted message and phone invitation states. Primary actions are measured before scrolling; the responsive conversation list is opened and measured separately. Keyboard focus restoration and standard/reduced-motion outcomes pass. These are implementer checks, not independent visual acceptance.

## Status

The full default service cohort passes 29 cases with 1,634 assertions (19 live-only cases skipped); types and lint pass. Compatible consumers were deployed before admission and database ingress. All six functions read back ACTIVE on Node 22 without test flags. The final acknowledgement-scope rerun passes two browser cases (the ordinary journey in 36.1 seconds); the refreshed captures are retained. This document does not grant independent acceptance or release approval.
