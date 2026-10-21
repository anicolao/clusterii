# Fleet contacts review

Commanders inspect fleet positions and complements acquired by their sensors. The galaxy and contact instrument distinguish confirmed observations from unknown current positions. Last-seen facts come from the recipient's actual live views and loaded encrypted history; no contact follows an unseen fleet.

## Contract and development choices

Fleet sensing uses the recorded scanning probability, nearest owned orbital/fleet sensor and one persisted domain-separated draw per observer/target/tick. Scanning levels freeze before the tick's research completion. Successful projections contain the observed position, complement, owner alias, fleet number and tick. They exclude command-derived fleet IDs, routes, destinations, future arrival times and every failed acquisition. Contacts have a public seat/fleet-number identity that is distinct from the private command identity.

Only new campaigns record `fleetContactsVersion: 1`. Existing campaigns retain their recorded behavior and history, with an explanation in the contact instrument. This capability adds no retroactive scans. The scanning formula and underlying game rules remain review proposals, not new owner approval.

The current canonical record retains the scan matrix and frozen levels for that tick. Immutable encrypted recipient history retains each acquired observation. This avoids an unbounded stale-contact cache in the current canonical document. Admission reserves the full future fleet-draw matrix, including queued formation and splitting; release operations retain their existing recovery headroom.

The interface loads the first authorized history page, preserves observations received while it is open, and lets the player retrieve earlier pages. The map explicitly describes its markers as acquired positions from loaded records. This is a bounded, paged archive interaction: it does not claim that the first page represents all contacts ever seen. A future indexed contact archive can improve retrieval without changing retention or granting additional knowledge. Missing scans never prove movement, destruction or absence.

## Interaction and assets

The contact instrument uses the production galaxy scene, fleet symbol, provenance-recorded fleet illustration, feedback and controls. A contact selection centers its recorded coordinates. Details scroll within the panel; history/retry/back controls remain available in the safe-area-aware footer. Closing restores the opening control. The gallery and seekable animation lab use real shared reducers and scan projection for unknown, loading, acquired, retry and last-seen states, including reduced-motion comparison.

## Evidence and gates

66 unit cases / 1,282 assertions pass; types and lint pass. Unit coverage includes exact visible fields, hidden identifiers/destinations, failed acquisition, frozen levels, absent sensors, malformed scan matrices/draws, confirmed in-flight positions and last-seen merging. Both live-KMS provider service cases pass 102 assertions: real private acquired facts, denied recipient reads, persisted miss/replay, complete authorized history and both-direction epoch preservation. The full default service cohort passes 27 cases / 1,557 assertions, with 17 live-only skips, before the final persisted-draw guard. The affected mock service rerun passes after that guard.

The ordinary browser journey creates and joins a campaign with four real clients, forms a real fleet, and inspects it through a different player's authorized observations. The test driver reads the server-private deterministic draw stream to choose known hit/miss ticks; it advances the actual service clock and does not inject observations or reveal that stream to the player. Current and last-seen views survive reload. The first contact/travel cohort passes four cases; the expanded shared gallery/lab cohort passes seven cases. The final contact/travel cohort passes all four cases in 39.1 seconds, including live-observation retention and before/after label composition. The final copy/large-label contact cohort also passes, with refreshed captures. The route capacity fixture now admits 223 long queued routes with the full fleet-draw reservation, then rejects further work; release capacity remains separately tested.

Compatible consumers deployed before new-campaign admission. All six affected functions report ACTIVE on Node22 with no test flag. Existing ingress/access rules carry the feature; no new player write path is introduced. Independent source/privacy/rendered review, exact-head CI, hosted Google/Scheduler and release acceptance remain separate gates. No review PR is merged.

The scan reservation uses the exact UTF-8 encoded worst-case matrix (including real recipient-key lengths), replacing the prior estimate. The release-capacity fixture fills remaining headroom with actual disband commands until normal admission rejects; recovery admission and settled release remain mandatory assertions. The final 66-case suite passes 1,282 assertions.
