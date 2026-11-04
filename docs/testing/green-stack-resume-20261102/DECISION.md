# Resume at the first failing PR

On2026-11-02 GitHub reports PR52–77 all five checks successful. The next failing PR is78 (a2d0d2fc); latest open is140 (d0804122). Neither is currently integrated green.

| Route | Exact latest failed evidence | Work already retained | Decision |
| --- | --- | --- | --- |
| PR78 | run39761461366:59 missing references and4 image mismatches;109 passed,8 skipped | Green77 integrated; reviewed contextual-help/discard correction;496 independently compared captures from12 passed pinned-Linux strict journeys in run40572590342; archived atbd2ae7db | Finish existing preparation, validate application gates, fast-forward existing78 and follow required checks |
| PR140 | run40091257252:176 missing references,72 image mismatches (68 reported pixel differences plus4 decoded-RGBA assertions),8 step timeouts;16 passed,8 skipped | Earlier retained diagnoses, but no complete reviewed integrated reference tree | Direct repair remains much larger; do not assume inherited failures resolved or accept unseen images |

PR78’s prepared source includes original78 and current green77 ancestry. Compared with green77, production delta is confined to FleetRoute.svelte and new RouteRules.svelte. Required workflows, Nix launcher, comparator, deadlines and dependencies are unchanged. Compared with the previously verified1bf15b98 target, current product, story specs, helpers, runtime and reference pixels are unchanged; bd2ae7db archives the verified narrative/manifests only. Thus another isolated496-view run adds no evidence and is not requested.

The old /tmp worktrees are no longer present. A persistent managed checkout was created at /Users/anicolao/projects/games/clusterii-recovery; Git history and committed approvals remained intact. The existing pinned repository Nix environment works offline. Root/functions dependencies were installed from unchanged frozen lockfiles; mismatched packages in the main checkout were not reused. Main meta and user files remain untouched.

This chooses sequential recovery on measured remaining work, not a promise all later PRs are correct. Design-fidelity holds remain distinct from screenshot regression approval. No GitHub merge, history rewrite, threshold change or uninspected baseline import.
