# Campaign admission and catalogue review

This slice connects campaign creation, faction/portrait selection, joining, leaving, recovery and galaxy inspection to authorized commands and persisted encrypted state. It implements part of milestones 2/3, with milestone 10 visual and interaction work alongside them. It does not complete either milestone.

## Boundaries

Campaigns in this slice are explicitly development games using the mock provider. A fresh server-side developer claim is required for command processing and key recovery; database rules also require that claim. Ordinary accounts cannot list these games, submit campaign commands or read their views. Public and real-mode creation fail closed. No public admission or cryptographic confidentiality is claimed for mock envelopes.

The server owns the canonical state and immutable versions. Each member receives a separately encrypted projection and recipient-bound grant. Leaving revokes current and historical view access. Split ownership projects forces and developments by layer; absent values remain absent in serialized views. Cached material already delivered cannot be revoked from a recipient's device.

Commands are create-only, identified by UUID, and acknowledged through durable receipts. Revision checks arbitrate concurrent claims. A repeated join to the same faction is idempotent. Retry observes the same command ID. The trusted saved profile supplies the alias; the join selects a validated cosmetic portrait independently of faction.

A full roster schedules its start at the next UTC quarter-hour. The scheduled worker publishes home assignments and starting holdings atomically, with up to one minute of scheduler latency. This slice has no production ticks, movement, construction or economy updates; their controls arrive with those mechanics. The galaxy displays actual generated catalogue data and entitled holdings, never sample campaign state.

## Decisions requiring review

The versioned rules retain `status: review`. Supported rosters, affinities, starting assets and fairness limits remain proposals. The generator repeats a shallow spiral arm per seat with rotated class order, then shuffles names and home allocation from a persisted seed. This gives connected maps with balanced neighborhoods and required separation. The repeated-arm shape is a material choice for review, not an owner-approved change.

The development directory is shared with developer accounts; player identifiers and generation seed remain server-only. Private views expose catalogue names/positions/classes and own holdings. Sensor intelligence, public campaign admission, KMS-backed real encryption, mode migration, history retention/patch recovery, invite URLs, automatic lobby replenishment and ongoing ticks remain unimplemented. Their absence is not a fallback to public mock games.

## Evidence and acceptance

Reducer tests exercise all supported roster sizes across 60 deterministic seeds, fairness constraints, quotas, stale claims, idempotency, scheduling, start allocation and serialized split-owner redaction. Service tests exercise real emulator ingress, concurrent claims, recipient grants, leave revocation, unauthorized read/write denial and durable recovery. Browser journeys create/join/inspect/recover/leave through production UI at phone, desktop, 4K and short-desktop sizes. Captures are CI artifacts; they are evidence for independent review, not self-certifying baselines.

The gallery includes actual faction controls and art, including quota-disabled and pending states. The animation lab uses the campaign reducer and shared receipt copy for accepted, stale-roster and reconnect sequences, with the same production feedback animation and reduced-motion comparison.

Hosted Google account login/persistence and independent full rendered acceptance remain separate gates. The initial desktop rendering inspection caught inherited entry alignment that narrowed the campaign view; correcting it did not require changing screenshot baselines.

## Development access administration

Use `node scripts/developer-access.mjs grant EMAIL` or `revoke EMAIL` from a Firebase CLI session with project IAM authority. The player must already have signed in; this command does not create users or replace unrelated claims. Opening campaigns refreshes the token. The existing owner account received the developer claim for hosted review. No other account was granted access.

## Supervisory composition correction

The bfc7520 render was not visually accepted. [Exact before/after evidence](../ux/reviews/CAMPAIGN_COMPOSITION.md) records the full-screen command surface, focused join panels, persistent commitment rail and stellar presentation correction. The four-player start journey uses UI admission and a real-time scheduler event in the emulator; hosted scheduling remains separately unverified. The supervisor lifted the specific composition hold at 2ff8864; this does not approve proposed rules or certify hosted authentication/scheduling. Navigation continues in a stacked successor.

## Layer privacy follow-up

The Prompt 20 finding is corrected by explicit field projection: orbital control grants fighters, camps and stations; surface control grants infantry, markets and bases. Escrow is disclosed only under unified control. Systems with neither layer controlled by the recipient have no holdings record. Unknown ownership labels do not substitute for redaction. Sensor intelligence is not implemented and grants no additional fields.

The serialized split-owner fixture is supplemented by all nine ownership combinations for both recipients. Changing opposing-layer values, hidden escrow or another empire's balance leaves the entire serialized recipient view unchanged. These tests establish projection non-disclosure for current fields; they do not certify database rules, key delivery, future intelligence, combat capture or the complete authorization lifecycle. Those require their own service and browser evidence. Later encryption and recovery slices are tracked in DELIVERY_REVIEW.md.
