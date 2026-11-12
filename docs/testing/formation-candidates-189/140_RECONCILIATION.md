# Frozen140 completed failures and retained slowdown comparison

Exact source0f09db62776368702fc4df7d7a73aeeb39d98be8, stories run40042533270/job120716690219. Full3.1MB API log read once, raw-byte SHA256 and compressed original retained. Existing classifier reconciles all four cohort summaries/ordinals against the source Git tree; no images downloaded or accepted for this classification.

| First failing boundary | Per viewport | Four viewports |
| --- | ---: | ---: |
| Missing reviewed references |43|172|
| Exact pixel differences |18|72|
| Geometry |1|4|
|30s100-tick harness timeout |2|8|
| Total |64|256|

These are64 first-failing stories across four sizes, not256 independent bugs. Later assertions remain masked. Compared with138's248 instances: mismatched campaign-receipt recovery now fails pixels in all four sizes; science component shifts from missing reference to a concrete geometry failure; faction-component family adds four absent references, so total missing count remains172. Normalized title comparison removes incidental source-line changes; exact changes recorded in140-vs138-boundaries.json. Earlier campaign-start pixels now stop at creation/faction view rather than later roster—same category does not imply same reviewed frame/cause.

Science failure: feature003 components.spec.ts83, Return to galaxy reading-target check. All four show contained:true but hits:false; the10s predicate expiry is classified as geometry because the actual failing invariant is corner/center hit coverage. The log does not identify the painting element or actual corner coordinates. Do not weaken the helper or assume the gallery size correction fixes it; exact retained trace inspection/source-paired verification is still required. No speculative button-shape/occlusion patch was made.

Frozen140 application40042533180 has its separate original large fullPage capture failure; that blocker is closed only on recovery overlay59d9ba37 by40049852223, not retroactively changed at140. Documentation/publication passed. Stories(generate) succeeded administratively, but its Explicit baseline candidates step was skipped; it produced no eligible generation evidence. No integrated green head exists.

## Slowdown comparison without a new telemetry run

Frozen140 again reaches70 tests per viewport and times out in feature010 and feature011's Deliver100 real leased ticks harness,30s unchanged. This repeats the full-cohort boundary; it is not a profile-ingress or screenshot failure. Each viewport starts fresh emulators, but earlier tests within that cohort share emulator data/process lifecycle. Source runner closes owned emulators between viewport cohorts; it does not clear state per story. Feature010 closes setup witnesses and navigates owner/peer away before settling; finally closes contexts/readers. Failed-worker replacement means we cannot assume browser subscriptions survive.

Original132 retained401 completed one-attempt records place525–587ms after storage marker, with request/RPC medians nearly equal and callback calculations40–44ms. Inspected pinned emulator path contains synchronous row/listener/rules/event work and asynchronous Functions HTTP submission, with no demonstrated fixed500ms sleep or caller join on HTTP. Full137 similarly has approximately550–629ms remainder. Isolated185's identical feature010 spec delivers100ticks9.508s with33.259ms post-marker median. That falsifies an unconditional fixed half-second delay; it does not identify which conditional work or contention makes full cohorts slower.

Hypotheses still distinguishable: accumulated emulator documents/query work, retained server listeners, event serialization, server lock contention or client callback scheduling under load. Existing logs lack transaction-linked listener/workload counters and the failed full-run profile exported unavailable:parse. The successful isolated profile aggregates all threads and cannot assign waits to individual slow commits. No strong causal conclusion, new profiler run, deadline extension or production optimization follows. Current authorized candidate run retains the existing redacted timing while completing behavior, without a new JFR observer; it is not presented as a full-cohort root-cause experiment.

Authorized complete generation40051429026 subsequently passed atae6f4763: initial100ticks9.098s;211 transactions/211attempts, zero RPC failures across the full story; valid post-marker median41.353ms. It completes later travel/zero-science/reload/privacy assertions. This new isolated success strengthens the conditional-workload observation but does not identify a full-cohort root cause. No full rerun or performance patch was made. Complete candidates await independent visual review.
