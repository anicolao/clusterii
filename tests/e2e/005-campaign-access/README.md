# Campaign access and navigation

Read [E2E_GUIDE](../../../E2E_GUIDE.md) and [fidelity status](FIDELITY.md). This feature follows Pantheon's numbered feature-local spec/README/FIDELITY/screenshots/stories layout. Shared fixtures and TestStepHelper remain under `../helpers`; real authentication helpers remain shared with legacy journeys.

- `navigation.spec.ts`: waiting admission/portrait/rules/identity/leave recovery; active catalogue/keyboard camera/selection; delayed saved-identity readiness.
- `invitation.spec.ts`: independent new and returning invited commanders, original identity revisions, exact host roster membership, missing/denied recovery.
- `encryption.spec.ts`: actual provider availability, persisted mode/envelope, admission/reload/release. Managed-key execution remains explicitly conditional on real credentials.

Waiting stories assert the named saved seat, capacity, waiting status and absence of premature map/inspector. Chart coverage retains the real canvas after four ordinary authenticated admissions and acknowledged scheduler start. The shared admission helper labels fixed demo catalogue/time and actual scheduler delivery; it injects no campaign state or responses. Original total/step/assertion budgets and exact RGBA criteria remain unchanged.

These specs replace the corresponding `tests/browser/{campaign-navigation,invitation,encryption-choice}.story.spec.ts` files. Existing historical baselines/documents remain at their recorded paths and are not silently copied or approved. New candidates resolve under this feature's screenshots/stories layout through the existing runner/helper/promotion tooling. Candidate generation is not strict acceptance.
