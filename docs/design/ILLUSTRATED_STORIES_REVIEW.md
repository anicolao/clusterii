# Illustrated entry and identity stories

Base: `feat/credit-offers` (#34). This slice closes the missing shared-story tooling and starts migration; it does not complete the full UX inventory.

[E2E_GUIDE.md](../../E2E_GUIDE.md) is mandatory from AGENTS, README and the implementation plan. Each production player step declares its action, acknowledged outcome, named facts and player viewpoints. The shared helper audits visible geometry without scrolling, waits for fonts/images/finite motion, compares exact decoded RGBA against reviewed platform baselines, then generates its ordered narrative. Harness faults/clocks are explicitly distinct steps. A failed journey writes failure metadata, never a passed story document.

Entry/Learn has six steps, including every chapter and keyboard focus restoration. Identity has five steps through real Google emulator login, encrypted save acknowledgement, reload persistence and private-DOM removal on sign-out. Both run at phone/desktop/4K/short sizes. The exact replacements pass and replace `journey.spec.ts`; its historical baseline images are retained.

The pinned Linux workflow always verifies and generates candidates only when the PR has the explicit `baseline-candidates` label. Generation cannot update expected images; explicit promotion requires a written review. Exact verification fails missing baselines and renderer drift. The fixture records browser, fonts, OS/container, architecture, rendering flags and actual page settings, with source/spec provenance. The archive verifies pixels again and links the identical baseline files without duplicating PNGs.

Policy checks reject new or changed procedural specs, direct capture bypasses, fixed sleeps, masks, ambiguous first/last selectors and snapshot-update mode. Existing procedural hashes freeze migration scope; these static checks supplement review rather than proving semantic coverage. [The UX-01–16 inventory](../testing/STORY_INVENTORY.md) identifies incomplete branches, including deterministic campaign setup and multiplayer viewpoints. Production services and random map generation remain unchanged.

Validation: 91 unit tests/1,536 assertions, five isolated browser-tool tests/nine assertions, three policy tests and the 12-test prompt-hook suite pass. Final type checks and lint pass; the isolated helper suite also passes after final type refinements. [Baseline review and retained failures](../testing/BASELINE_REVIEW.md) distinguish inspected candidates from verification. Linux exact comparison, current-head CI, independent visual acceptance, remaining story migration and hosted OAuth/Scheduler remain gates. No rules or release approval is implied.

Exact local verification passed all eight journeys/44 captures in 35.6 seconds; generated narratives and capture hashes are archived in `docs/testing/stories/`. The UI is unchanged. Linux candidates and comparisons remain pending.

The first Linux workflow stopped before tests because the pinned Playwright image lacks `unzip`, which Bun setup requires. The workflow now installs that archive utility explicitly; no browser or font package is changed. Baseline generation and exact verification remain pending.

After archive setup, Linux generation reached all stories but provenance writing failed Git’s ownership check in the container. The workflow now explicitly trusts only its checked-out workspace for Git metadata, preserving the source-revision requirement. Failure log: `/tmp/cluster-story-linux-generate-first.log`. No candidates from that failed run are promoted.

The inherited history keyboard repair is migrated rather than extending its legacy hash exception. The story retains record expansion/paging, modal focus order/wrap, both device viewpoints, no forced scroll on new data, explicit latest recovery, phone offline retry, selection preservation and reload. Its setup creates the waiting game and its history through real UI, explicitly labeled as setup. A test-only module loader fixes only catalogue entropy inside the demo Functions Emulator; production source/builds, secure random keys/nonces, authorization and real service time remain unchanged. Guard tests reject production/non-demo use and signature drift. This is not map fairness or hosted acceptance.

Final combined local comparison passes 12 journeys/86 captures in 1.2 minutes, with generated narratives archived. The history legacy spec/hash is removed, its assertions preserved in named steps. Six policy/loader guard cases and final type checks pass. Linux review/comparison and independent acceptance remain pending.

GitHub’s synthetic merge exposed a prompt-check ancestry gap: path-simplified history could omit the feature’s exact earlier prompt log after the base backported later prompts. A regression reproduced that failure; full committed path history now validates both ancestries, retaining exact SHA checks and rejection of invalid hashes. All 13 prompt-hook tests pass (`/tmp/cluster-prompt-synthetic-before.log`, `/tmp/cluster-prompt-synthetic-after.log`).

Linux Node 22 also exposed loader interference with Playwright before story execution. Catalogue instrumentation now registers only in the demo Functions Emulator runtime, rather than installing a pass-through hook in every Node child. Production seed/key generation remains untouched; the loader still rejects signature and environment drift. Failure log: `/tmp/cluster-story-linux-generation2.log`.

After runtime scoping, all four history journeys still pass exact comparison in 43.9 seconds against the existing reviewed images (`/tmp/cluster-history-runtime-isolation.log`). No baselines were regenerated for this fix. Six story policy/catalogue guards pass.

Pinned Linux generation now passes 12 stories/86 captures in 2.2 minutes (run 39613924633). The implementer reviewed and promoted its distinct linux-arm64 candidates; a separate exact comparison remains pending. The missing-baseline verification failure is retained and no thresholds, masks or retries were relaxed.
