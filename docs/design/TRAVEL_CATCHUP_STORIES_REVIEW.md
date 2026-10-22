# Paused travel and catch-up review

This successor to #62 exercises an admitted fleet route through departure, an acknowledged development pause, reload, resume and concurrent delayed tick delivery. Player actions use production controls and authenticated commands; harness controls deliver clocks only.

| Dependency / acceptance     | Status                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Base                        | #62 `feat/interrupted-route-stories`, ff1d616                                                                                           |
| Pause / resume              | New story checks unchanged forces, tick and route while paused, reload recovery and the recorded one-hour schedule shift                |
| Delayed settlement          | Real leased service receives concurrent overdue deliveries; committed tick counts must sum to the due boundaries                        |
| Conservation / timing       | Each immutable tick revision supplies actual production, including fractional carry; no early arrival; one final arrival report         |
| Repeat delivery             | Concurrent repeated deliveries must leave the complete canonical state unchanged and release the lease                                  |
| Privacy / keyboard          | Owner and independent-player views, third recipient projection checks, keyboard commands and bounded geometry across four sizes         |
| Harness boundary            | Demo-only maintenance clock for the catch-up campaign prefix; actual authorization, commands, reducers and persistence remain unchanged |
| Rules                       | Existing range, speed, capacity and arrival behavior remain proposed rules; no approval is inferred                                     |
| Local candidates / exact    | Running; candidate generation is not visual or comparison acceptance                                                                    |
| Linux / independent visual  | Pending                                                                                                                                 |
| Hosted scheduling / preview | Not certified; current-head publication verification remains required                                                                   |

Existing procedural and live travel/recovery stories remain unchanged. This slice does not certify worker death after lease claim, hosted Scheduler cadence, contested combat, managed-key parity or normal-motion live animation parity. Identity-raster diagnosis remains open; no inherited expected image or zero-tolerance comparison is changed. Read-only GitHub retrieval succeeded after the earlier TLS timeout: #62 story verification was running, while application/documentation checks remained queued. No duplicate broad run was launched.

The first candidate run failed all four viewports at the paused reload because the story expected one stationed fleet after departure. Source/trace confirms the inspector excludes traveling fleets. The correction uses the exact zero-stationed control, then selects the original fleet; no assertion or timeout is relaxed. Failure log: `/tmp/cluster-travel-catchup-generation.log`; full traces/captures: `/tmp/cluster-catchup-stationed-count-failure`.
