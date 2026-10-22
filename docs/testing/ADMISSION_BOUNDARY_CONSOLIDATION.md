# Admission boundary and selection ownership

Reviewer Prompt106 (17:50 Toronto) requests consolidation without another browser retry. This report preserves the distinction between admission delay and a separate source-proven selection race.

| Retained evidence | Observed boundary | Limit |
| --- | --- | --- |
| #94 before/after procedural traces | campaignKey begins after receipt retirement; final DOM says campaign created and recovering, not faction heading | No completed browser response recorded; older painted saving-state frame does not locate final wait |
| #96 bounded timing probe | Retirement0.6ms, request response459.4ms, response to heading1.3ms; original5s assertion passes | Negative reproduction only; asynchronous clone classification is not application callback timing |
| #100 phone settlement probe | First admission10s heading assertion fails; final DOM recovering | Settlement never reached; no transaction timing evidence |
| #106 single admission probe | Four identities ready; first admission heading fails10s before fourth-page sampler arms | Fourth-page campaignSecurity200 does not explain first-page campaignKey; no geometry/frame evidence |

Original paths and exact source provenance remain in ADMISSION_RECOVERY_TIMING_REVIEW, ZERO_SCIENCE_TIMING_REVIEW and ADMISSION_FRAME_PROBE_REVIEW. No failure/candidate artifact is replaced.

## Actual await ownership

`dispatch` validates receipt through the existing transport, fences the account generation and uses a settling flag. It awaits `clearOrder`, whose IndexedDB transaction completes before pending/busy are released. Accepted creation then invokes `select` once. `select` owns a new selection serial, stops the previous observer, marks loading and requests campaignKey. `observeCampaign` awaits that callable before doing anything with a private view. The service checks current session/developer entitlement and campaign existence; a creator without a seat receives joined:false, without unwrapping a member key. The client synchronously calls next(null), and the route clears loading. That permits the ordinary faction UI against directory metadata. No private-view subscription is expected in this branch.

Recovered pending campaign.create intentionally skips pre-dispatch selection. Directory callbacks update metadata, not selection. There is no demonstrated duplicate subscription or blocked durable retirement in these retained first-admission failures. Missing ingress receipts are a separate path: these failures already show accepted creation feedback. Missing evidence remains correlated first-page callable response/application callback and selection-generation timing during a failed admission. No additional probe or retry was run.

## Separate demonstrated defect and fix

Source inspection found asymmetric selection ownership: the data callback checks session/selection, but the observer's failure callback was passed directly to `failed`, and the final post-await focus continuation was unconditional. A callback from an old observer can therefore clear current busy/message state or report a stale error after navigation/account change; an old selection can also move focus. This is a concrete player-visible recovery/access-isolation defect, **not an established cause of the first-admission timeout**.

The production `selectedObserver` now fences both data and errors with the same current-selection predicate, and immediately retires a subscription whose asynchronous initialization completes after supersession. Existing route guards remain. Final focus after tick checks the same generation/selection. Current failures still surface normally, initialization rejection still reaches the existing guarded catch, and durable retirement/receipt handling/authorization are unchanged. No extra service request or fallback is added.

Two focused tests exercise delayed subscription completion, late data/error after selection and account change, exact cleanup ownership and initialization rejection (11 assertions). These verify the production callback adapter; mounted keyboard/race and four-size rendered acceptance remain open. No screenshots or baselines changed. Type/Svelte checks pass0 errors/0 warnings; focused Biome check passes. Check log: `/tmp/cluster-selection-fence-check.log`.

Read-only resource snapshot showed about9.2GiB available and multiple active processes. The completed #106 log shows orderly emulator shutdown, with host Node24 rather than declared22. No unrelated process was stopped or restarted. A later process snapshot cannot establish historical load or transport causality. All original visual/art/shared gallery/lab/Linux/KMS/hosted/release holds remain open.
