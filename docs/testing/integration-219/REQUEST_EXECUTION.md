#219 single request execution

Request `client-contact-science-219-20261024-01`; preparation0753ff9dc7cca0aa10ca12b3e095328237a24214; executor14d1e12c4ba1f03ffd80847b65b6c71fce295922. Run40141007615/job121012556860, created2026-10-24T23:01:33Z. This is generation for independent review, not strict acceptance.

The18 guard/orchestration tests (including an actual request CLI Git fixture), five final batch checks and17 existing diagnostic/request guards passed before publication. Supplemental actual-request validation attempted `node --input-type=module -` after the isolated request commit. Importing the existing CLI module evaluated its `realpathSync(process.argv[1])` guard against the literal stdin name `-`, yielding ENOENT before validation. The publication shell did not stop on that supplemental error and the authorized push proceeded. This command-handling mistake is retained here, not reported as a passing pre-push check. No workflow guard was bypassed.

The same read-only validation with `node --input-type=module -e` passed against the actual committed request/parent/files/clean checkout immediately afterward; its JSON is retained separately. The workflow independently validates the request before any renderer execution. No request was edited/replayed, no second run dispatched, and no production change was made in response to the local invocation error. Future command chains use explicit `set -e`.

The independent workflow request/executor guard passed2026-10-24T23:05:07Z after successful checkout and Nix bootstrap. The same single run then entered the two-family execution step. Terminal per-family outcomes and original artifact verification are pending this document's initial creation.

## Terminal result

The one run completedSUCCESS; both family exits0. Complete173-image source/spec/renderer verification and retained-original review index are now published under linux/. The original request was never replayed or edited. No strict/reference approval is implied.
