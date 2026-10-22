# Navigation label propagation review

This successor to PR #67 applies its shared production label placement to the existing authoritative keyboard chart story. All original class-count, waiting-home, rail, opaque panel, keyboard orbit/focus, inspector-boundary pointer, reload and page-error assertions remain. Each captured view additionally audits actual label separation and viewport containment.

A focused hit-test probe identified a real decorative-layer defect: HTML wrappers intercepted the pointer at the selected Paikauhale and four landmark names, despite noninteractive text spans. The production HTML wrappers now also use pointer-events:none. Interactive fleet buttons and 3D star handlers are unchanged. Actual `elementFromPoint` checks prevent a decorative label or its wrapper from becoming the pointer target.

| Dependency / acceptance | Evidence |
| --- | --- |
| Base | PR #67, `feat/galaxy-label-placement`, c4a5cac; no merge |
| Candidate review | Four navigation journeys /29 captures.28 unchanged decoded images; one intentional phone edge-label correction reviewed separately |
| Exact verification | Eight exact local journeys /101 captures at0d9150f; actual hit-test assertion enabled in both families |
| Preserved service coverage | Observation journey retains real authenticated commands, leased tick repeat-safety, private recipient facts and reload; no new service harness or mocks |
| Preview | Unverified until current source/build revision is served |
| Remaining gates | Linux, full independent visual review, other affected galaxy-family comparisons, inherited identity raster, hosted and release acceptance |

Retained reproduction: `/tmp/cluster-navigation-label-pointer-probe2.log` and `/tmp/cluster-navigation-label-pointer-failure`; original candidate provenance and single-frame scope are in [baseline review](../testing/NAVIGATION_LABEL_BASELINE_REVIEW.md). The first incomplete hit-result probe is excluded, not counted as acceptance.

The combined run passes two journeys per viewport in23.3/31.5/approximately78/28.7 seconds; log `/tmp/cluster-navigation-label-exact.log`, retained `/tmp/cluster-navigation-label-exact-results`. Shared helper TypeScript checking, Svelte types, lint,25 policy checks and13 prompt-history tests pass. Only the separately reviewed phone navigation image changes; observation images remain identical to PR #67. No service, gameplay rule, cryptographic boundary or test clock changed.

Preview diagnosis at05:50UTC: #65’s published tree contains source/build757d423, but the served revision check failed HTTP404. Pages build/deployment39728756222 for gh-pagesb38c5e1 is queued, while the older #61 Pages run39724569489 was cancelled. No manual cancellation or duplicate publication retry was issued; exact-head checks remain unchanged. See [CI service/publication triage](../testing/CI_SERVICE_TRIAGE_2026_10_22.md). Disk headroom fluctuated to1.7GiB; preserved artifacts were moved, not copied or deleted.
