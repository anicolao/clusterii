# Shared Scene strict verification plan — not dispatched

Target executable source84710ec4 (doc-only checkpoint does not alter it). Active66 remains held. Parent65 jobs untouched. Disk at preflight2,103,680KiB below2,359,296floor; no local browser/build/download or cleanup performed.

## Confirmed execution constraint

Required stories.yml runs only pull_request/main push and invokes ci-renderer stories verify/generate; it has no workflow_dispatch or per-case input. scripts/run-stories.mjs accepts mode only and invokes all story files per viewport. playwright.stories.config.ts DOES have CLUSTER_STORY_FILTER, but nix/ci-renderer.sh does NOT forward that variable into the container. Setting an outer filter would silently execute the full suite. Extra command arguments do not select tests. No attempt was made.

The existing isolated observation/route repeat workflows are fixed generation-only requests with exact source/spec/case guards; reusing or editing a prior request to run strict would violate their guards. No existing safe scoped strict remote entry at this head is available. Report this precise constraint first as delegated; do not launch the full suite or bypass a validator.

## Minimal proposed bounded request

Reuse established branch-only fresh request validator and pinned Nix renderer architecture, adding one explicit `recovery scene-strict` arm to BOTH launcher layers on a separate executor branch only. No required-workflow edits, active-PR push, broad CLI passthrough, generation or snapshots updates. Source/spec/renderer/expected reference tree bound to prepared head. Validate outer/inner allowlist, reject wrong mode/branch/repo/attempt/replayed request, and run --list before services with exact single test/project count; no empty-selection or whole-suite fallback.

Eight independent cases: two existing illustrated families x phone/desktop/large/short. Fresh emulator process and owned port checks per case, serialized build, diskfloor+reserve; each case stops at first failure with retries0/max-failures1/update-snapshots=none and CLUSTER_STORY_MODE=verify. Matrix fail-fast false preserves independent case outcomes without retrying a failure; no same-emulator accumulation. Original test/step/assertion deadlines unchanged. Job-level cap only bounds infrastructure; never raises gameplay budgets.

1. Galaxy: tests/browser/campaign-navigation.story.spec.ts, exact title `A waiting commander filters stars, orbits by keyboard and inspects a clipped map label`, familycampaign-chart-navigation. Test sourceSHAf314919f15fcf692c79c3885bfef3063f5cfee66192f3c0501419c32e6cde975. Existing reviewed Linux references8phone/7desktop/7large/7short. Exercises actual waiting map, Systems filtering, named-star inspection, keyboard camera and boundary clipping. Other two tests in same file must NOT be selected.
2. FleetRoute plus active Galaxy: tests/browser/fleet-route-recovery.story.spec.ts, exact title `Interrupted route commands retain their original choices and identity`, familyinterrupted-fleet-route. SourceSHA1ecc3a5cbc05c563a67619a6742ea970266b7ad0a697b7911e0ed1a805c644e8.40 reviewed Linux images each size. Keeps acknowledged formation/route, pending/retry/reload, real acquired facts, receipts/conservation and all existing privacy-scope assertions. Parent65 approved entropy retained; new label rendering is deliberately compared against inherited exact references.

Per-case command shape inside pinned renderer: `bun x playwright test --config playwright.stories.config.ts <EXACT_FILE> --grep <ANCHORED_EXACT_TITLE> --project=<EXACT_SIZE> --retries=0 --max-failures=1 --update-snapshots=none`, through existing real auth/database/firestore/functions emulator setup and catalogue preload. Test budgets remain defined by unchanged source/config. Expected maximum189 original views; first mismatch can mask later states and will be reported as such.

Always retain per-case exit, source/spec/renderer, passed/failed manifests, actual/expected/diff, traces, Firestore log and loader diagnostics remotely30days, including failures. Retrieve compact logs/manifests first; selected comparison triples only when sufficient reserve. Any mismatch gets independent review; no automatic promotion or claims of later-state success.

## FleetContacts coverage constraint and broader effects

FleetContacts shares Scene in Galaxy's contact panel and actual gallery/animation lab. At this stack point no illustrated contact-specific family or approved exact Linux screenshot set exists. `tests/browser/fleet-contacts.spec.ts` has real acquisition/reload plus replay/reduced-motion cases and loose screenshots/geometry; it has no toMatchSnapshot/toHaveScreenshot. It is not a substitute for strict inherited references. SourceSHA06dadac6c95a8794f654df9418ecbb218166bcae7425bf5ac789ca424a8a2a59. Running it would be separate functional evidence, not a third strict family. No story migration/new feature or fabricated reference planned here. Current identity-component-gallery story does not navigate the contact/route specimens, so cannot claim that coverage either.

Shared label changes may affect all mounted Galaxy families listed in AUDIT.json, plus FleetRoute states in live-fleet-travel/paused-fleet-travel and other route stories. This initial bounded pair is a representative regression gate, not whole-suite/full-design approval. Preserve every inherited baseline. Broader failures must be assessed when required CI is authorized; no blind family regeneration.

## Review status

Reviewer independently inspected corrected observation phone14 and desktop14; exact main-meta findings/hashes copied to PHONE_DESKTOP_REVIEW.md. Large/short28 remain unreviewed at this checkpoint.56originals remain frozen/no promotion. Independent API reports green frontier52–64;65 application/strict live. No PR67/new feature/merge.
