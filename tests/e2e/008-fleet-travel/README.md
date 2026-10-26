# Fleet travel and recorded arrivals

The complete real-player journey lives in [fleet-travel.spec.ts](fleet-travel.spec.ts). Four ordinary authenticated commanders form a fleet, edit and commit its route, recover after reload, settle actual departure/arrival, and read recipient-specific arrival archives. Owner and uninvolved-player views belong to one ordered narrative. See [FIDELITY.md](FIDELITY.md) and the [E2E contract](../../../E2E_GUIDE.md).

The generated walkthrough is owned by `stories/live-fleet-travel/README.md`. It is created only after all four complete strict journeys pass and the archive command verifies their original captures against reviewed references. No passing narrative is fabricated during migration. Per-viewport source/manifests remain beside that generated index.

Reviewed screenshots live under `screenshots/live-fleet-travel/<viewport>/<platform>/`. Existing predecessor bytes and renderer manifests move unchanged; new archive views need source-bound Linux generation and independent inspection before import. This is feature008 migration only; other flat browser stories remain unmigrated.
