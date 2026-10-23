# CI duration and report-only reuse

Prompts171/172 follow reviewer17:06/17:16 and the human status/CI-wait questions preserved verbatim in meta-prompts.md. The agent was actively implementing this change while the original observations continued. No existing run was cancelled, restarted or relabeled as passing.

## Actual observation

At17:06 Toronto, story runs40018210203/40018251102 (#131) were48/47minutes old,40020084890 (#132)33minutes, and40022816635 (#133)12minutes. All were executing Exact verification, not queued. The two131runs began19seconds apart; their heads differ only in PROMPT_WORK.md, DELIVERY_REVIEW.md and STORY_ALIAS_BOOTSTRAP.md. The implementation agent caused this duplication with a follow-up documentation push. [Git-tree comparison](historical-equivalence.json) confirms equal test-input fingerprints under the new narrow policy; this is not retroactive reuse or an invented result.

The17:25 metadata snapshot shows current131 completed with failure; original131,132 and133 still executing Exact verification. Current131's job lasted64m26s (20:19:01–21:23:27UTC), not67minutes:67minutes was its age when checked. #132 was53minutes old, #13331minutes. [Timestamped snapshot](current-summary.json) and full bounded job/run metadata are retained. A live132 job-log API request returned404; metadata did not expose its current cohort. Missing live logs do not establish a stall or reveal which test is active.

## Completed runtime breakdown

Original12840006959566 took54m32s from creation to run completion. Queue allocation took about5s, checkout2m31s, Nix bootstrap5s. From Exact verification start to first emulator cohort was2m35s: renderer/dependency/tooling preparation, including root dependency install50.96s, Functions dependencies214ms, policy/tooling checks and roughly4s Functions build. These are wall-clock intervals, not CPU measurements.

| Original128 phase | Observed wall time |
| --- | --- |
| Creation → first cohort | 5m18s |
| Phone cohort | About25s; failed collection before player tests |
| Desktop test banner → summary | 14m14s |
| Large test banner → summary | 19m37s |
| Short test banner → summary | 13m04s |
| All sequential cohorts and shutdown | 48m34s |
| Artifact upload | 37s |

Each successful collection also paid roughly12–15s emulator startup and7–10s script/web-server preparation. Individual CPU/storage/transport costs cannot be inferred from these aggregate intervals. [Completed markers](completed-markers.txt) and original source run metadata support this accounting; the full original log was already retained with artifact12527980871.

Current13140018251102 took60m41s inside Exact verification, including58m13s from first cohort startup through final shutdown. Test-banner-to-summary intervals were phone11m25s, desktop13m18s, large18m56s and short13m00s. Checkout took2m52s, bootstrap6s, artifact upload42s. Phone now ran its cohort, unlike original128, so the earlier54-minute total is not an exact completion forecast.

## Cold-phone result is separate

Current131's first phone cohort collected and executed69 tests at20:24:52UTC; the retained full log has zero `Cannot find package '@shared/crypto'` occurrences. [Scoped result](131-cold-collection.json) supports the cold-collection correction for this source/run. Each viewport reports62failures,5passes,2skips:248 failure instances across four sizes, not248 independent bugs. Those later assertions are not fully classified by this runtime audit and are not dismissed as baseline-only. No images are approved/promoted. Original132 commit/RPC diagnostics remain the next timing priority when its run finishes.

## Bounded reuse policy

The new gate fingerprints the checked-out Git index (including object IDs and modes), workflow scope and runner OS/architecture. Only five report paths are excluded: PROMPTS.md, PROMPT_WORK.md, meta-prompts.md, docs/design/DELIVERY_REVIEW.md and docs/design/STORY_ALIAS_BOOTSTRAP.md. Contracts, source, tests, snapshots, art, dependencies, Nix, workflows, scripts and unknown paths remain inputs. Evidence archives are not broadly excluded. The fingerprint uses the actual checkout, including merged base changes; mutable PR metadata alone is not source equivalence.

An early, size/hash-checked input-plan artifact identifies the actual executor run, head, checkout and attempt. Reuse is restricted to the same repository/head repository, PR, branch, workflow, check name and digest. Chained documentation runs resolve and independently validate the original executor's own retained plan. Main pushes and explicit reruns execute normally. New source/workflow changes cannot reuse earlier inputs.

Required job names remain `verify` and `stories (verify)`. A matching running executor is awaited, not passed/skipped. Its failure/cancellation/skip stays a failing check. Success requires its successful job and a nonexpired result artifact created within that attempt's job interval. API, archive or provenance unavailability runs normal tests with an explicit reason; it never silently succeeds. Coordination has a bounded wait and does not change any test deadline. A still-pending executor at the bound fails without pretending completion.

Current input plans and check summaries identify the original executor checkout/attempt and retained artifacts; they do not manufacture current-source screenshots. Prior failure artifacts are not deleted or replaced. Candidate generation, publication and documentation checks remain independent. No auto-cancellation is added. This saves duplicate test computation/artifacts, **not** the roughly3-minute checkout/bootstrap or lightweight runner time while awaiting an executor. There can still be a normal run if earlier input evidence is not available; there is no unsafe heuristic skip.

## Verification and remaining gates

Eight focused tests include controlled prepare/wait API and artifact fixtures: no candidate, in-progress→failure/success, invalid/expired/unavailable plan, wrong repo/PR/workflow, chained executor, explicit rerun, missing attempt evidence, pending bound and actual ZIP size/hash/JSON checks. They verify summaries identify the actual executor and that unavailable reuse leads to normal execution. No real passing check was fabricated and no full duplicate run was launched to test reuse. Policy/path checks and formatting pass under established offline Nix. First actual CI reuse remains unverified until a genuine eligible documentation update occurs.

Fresh disk checks fell to15,025,080KiB and later recovered to46,598,948KiB; cause is unknown and no cleanup attribution is made. No large artifact download, image generation or browser/emulator run was used for this change. Logs, human/reviewer checkpoints and this substantive CI correction are committed together before publication; no follow-up push merely to record a PR URL. Full implementation, independent visual/Linux, ingress/latency, hosted/KMS and release gates remain open. No merge or baseline promotion.
