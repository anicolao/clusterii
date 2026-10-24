# Completed failure classification and refresh correction

Prompt195, reviewer23:54; reconciles main23:34/23:44/23:54. PR140 remains d8241411431450821074267a1cad2adbaf45c766. Both required gates are **failed**, not pending: application40055483917 (45m47s) and strict stories40055483988 (67m14s). Bounded science40059179307 at4e273076 also failed. Only retrieval/review of their remote artifacts is pending. No target update, rerun, reference promotion or merge.

## Exact strict first failures

The completed log contains64 first-failing stories in each of four viewport cohorts:256 instances, not256 independent defects. Each cohort has44 missing references,18 pixel failures and2 tick-step timeouts;4 stories pass in each cohort. Aggregate176 missing references,72 pixel differences,8 timeouts. Later assertions in failed stories are masked by the first failure.

`classification.json` records every exact failed source/viewpoint and error. All176 missing-image paths were checked against the **d8241411 Git index**: both the named PNG and adjacent renderer.json are absent. There are no literal `{configDir}` paths. This is not proof that retained candidates are eligible; generation provenance and independent review remain required. No missing reference is replaced.

The eight timeouts are feature010 zero-science and feature011 contextual aftermath, each at the100-tick/30-second leased-settlement harness in all four sizes. No selector or geometry first failure is reported in this strict run. Entry's `Every decoded RGBA byte matches` errors are pixel failures, not timeouts merely because their stack includes a timeout option. The72 differences still require actual/expected/diff and approved-design review; no obsolete-reference or renderer diagnosis is inferred.

Comparison with frozen140's earlier256-instance classification: the four science Return geometry failures have become missing-reference first failures; remaining category totals176/72/8 versus172/72/4geometry/8. The older131172/68/8 count used a different source/story set and is not the current count. Cohort durations are12.5m phone,13.7m desktop,20.5m large,13.0m short. These are aggregate tests/shutdown costs, not measured transaction cause. Profiler/loader/tick artifact contents have not been retrieved or certified.

## Science: cumulative boundary, not another locator retry

| Run/source | Observed boundary | Preserved scope |
| --- | --- | --- |
|40057308508 /0403b84e|Large gallery30s during repeated final reading verification; initial load609ms, seven native ArrowUp cycles with repeated locator overhead|Retained trace/candidates;2pass/largefail/shortnotrun|
|40058139007 /d7169a1a|Reduced gallery completes29.891s; normal reload4.458s vs595ms, then30s expires during actual capture after geometry/readiness|Retained trace/candidates;2pass/largefail/shortnotrun|
|40059179307 /4e273076|Large gallery30s expires at post-image `page.evaluate(textLayout)`|Small failed log only; remote trace not yet retrieved;2pass/largefail/shortnotrun|

All three retain original assertions,30s step/10s capture budgets, exact pixels and stop-first-failure. None is a complete eligible24-image family. The third tail does **not** establish textLayout as the cause: the total deadline includes navigation, focus, End/native ArrowUp reading, acknowledgement, containment, loaded-asset checks, two stable screenshots and sidecar inspection. textLayout itself is bounded identity-only telemetry. Moving the final interrupted operation is not sufficient convergence.

Source workload audit: the same gallery mounts five FleetContacts canvases plus four FleetRoute canvases, alongside ten ReturnBriefing and five ArrivalReports specimens and other shared controls. Those canvases use on-demand rendering; their mere presence does not prove continuous rendering or cost. The prior repaired large document remains37385px high (retained geometry evidence); gallery readiness still visits the actual page and scrolling/resize may invalidate scenes. Local runs passing does not measure pinned Linux cost. **No additional generation request, locator adjustment, telemetry removal, speculative rendering patch or budget split is made here.** Next evidence is the existing third trace: compare per-phase durations and browser layout/paint/capture boundary with the two retained traces before choosing a production workload correction. Preserve every specimen and original full-page gallery coverage if a correction is justified.

## Demonstrated application readiness race and migration

Application35passed/3skipped/1failed. The retained trace (verified artifact12546461088) proves the contact geometry helper counts3 controls at530139ms, Refresh disappears as history finishes, then the helper waits for now-absent nth(2) from530488ms to cleanup598785ms. Four current-contact captures already exist. The subsequent cleanup error is secondary. This is not the100-tick stall, profile ingress failure, or missing baseline.

`Galaxy.readHistory` keeps old records while loading and merges the actual returned page before clearing loading. The prior observed-tick assertion can pass immediately on old data. The correction waits for Refresh to disappear (loaded head has caught up), the loading notice to clear and no error, then repeats the immutable contact assertion before the unchanged geometry helper. No fake response, ordinal workaround, timeout increase or command/service change.

The live illustrated story migrates from `tests/browser/fleet-contacts.story.spec.ts` to `tests/e2e/012-fleet-contacts/contacts.spec.ts`, matching Pantheon's numbered structure and shared helper convention. Every named step and existing assertion remains; refresh and reload get the explicit completed-history acknowledgement. The application predecessor remains executed with every original assertion and90s budget, plus the same three readiness guards. Its manifest change is **explicitly paired** with this migration and Prompt195, not a silent legacy hash refresh or claim of complete migration/retirement. `migration-source.json` records exact source hashes, unchanged named steps and increased assertion count. Existing administrative projection corroboration remains explicitly distinct from ordinary foreign-read proof.

Policy and no-browser collection pass: four migrated viewport cases and both original application cases still collect. No browser, emulator, build or candidate generation ran under the disk restriction. Functional and rendered acceptance remain unexecuted; a passing source check does not validate the race correction.

## Retained remote evidence and disk-safe next work

Fresh local disk2,011,216KiB is below2,359,296KiB. No artifact archive is downloaded. Small compressed logs and API metadata are preserved here.

- Strict artifact12546838158:1,766,190,057bytes, expires2027-01-22T02:45:16Z; SHA256d784dd422c5298b559ba11b2586acbf2f7185392b91bb5afc9eeb88e76bdbffc.
- Third science artifact12547350419:19,541,559bytes, expires2026-11-23T03:46:36Z; SHA2561ae5ead491074a59fe44a8da5804fb4ccdc3fbb31eb3e2e729358bc78619536b.
- Application archive12546461088 is already downloaded/verified under `/tmp/cluster-heading-194/application-12546461088.zip`; do not download again. Only contact trace/error were extracted.

After remeasuring sufficient download+selected-extraction headroom **above** the floor, retrieve the existing science artifact once, verify API size/digest, ZIP CRC/path safety and clean source identity; inspect its actual large trace before any further science execution. Retrieve the existing strict artifact once only when its1.77GB compressed size plus selected extraction and floor fit; inspect actual profile/settlement records against TIMEOUT_SOURCE_REVIEW before asserting cause. Do not extract everything by default or equate successful upload with valid telemetry.

For the prepared refresh correction, first verify owned ports4173/19099/19000/18080/19150/15001/14400/14500 (and configured event/task ports), tool versions and adequate run headroom. Inside the established offline Nix environment serialize `bunx svelte-kit sync` then `bun run --cwd functions build`, before starting emulators. Run only the original application contact journey with `bunx firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bunx playwright test tests/browser/fleet-contacts.spec.ts -g "ordinary observers" --max-failures=1 --retries=0 --output=/tmp/cluster-refresh-SOURCE/application'`, preserving90s. Stop and retain the first failure.

Then verify the migrated phone story with existing catalogue/admission/contact registration, original240s/30s/10s limits, a unique source-named output directory, generation isolated from references, and no whole-suite runner fallback. `run-stories.mjs` launches the entire suite and must not be used for this bounded check. Its established registration/owned-emulator setup is reused around the exact feature012 phone Playwright command. Further sizes require successful acknowledged behavior and separate source-paired visual review. No test retirement, target push or reference promotion follows from source preparation alone.
