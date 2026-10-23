# Corrected Nix runtime and artifact boundaries

Source9f8c8fe0, application run39975693961/job120489556785 passes:113 unit cases/4522 assertions,35 service cases/2524 assertions with22 skips,36 browser cases with3 skips. Original application log retained losslessly. This demonstrates the corrected fixed-image/isolated-engine runtime reaching real service/browser execution, not managed-key, visual or release approval.

Story run39975694018/job120489557300 reaches all four64-case cohorts, then fails. These are237 first-failing story executions across four viewports, not237 independent defects. Category totals below describe each story's first observed failure; later assertions were not reached.

| Viewport | Missing Linux references | Pixel comparison | Science geometry |100-tick step deadline | Passed |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone |41|17|0|1|5|
| desktop |40|17|1|1|5|
| large |40|17|1|1|5|
| short |40|18|1|1|4|
| Total |161|69|3|4|19|

All161 missing first-reference paths resolve correctly and lack both PNG and renderer.json in Git source9f8c8fe0; no literal configDir or existing-image/absent-manifest-only case. Their exact paths and first-failure source/steps are recorded in JSON. Pixel differences remain failures requiring independent source-matched review, not automatic acceptance of redesign. Three geometry failures occur at feature003 science.spec.ts197: panel top80 is above rail bottom98 on desktop (other viewport values retained); this is separate from baseline failures and remains actionable. No assertion/deadline or baseline changes here.

All four feature010 failures hit the original30s “Deliver100 real leased ticks” harness. Log supports that boundary only. Transaction/clock/commit spans cannot be inspected because upload-artifact itself failed EACCES scanning root-owned0700 test-results/.story-cohorts-zx8XJP; artifact API returns zero artifacts for this run. No claim that transport, transactions, load or Nix caused the deadline. Do not rerun unchanged; retain exact timing controls for subsequent changed-source CI.

Application artifact12513928101 (452,297,170 bytes; original ZIP retained/tmp/cluster124-corrected-app-artifact.zip) contains no nix-renderer paths. Pinned Playwright1.61.1 lib/runner/index.js5943–5951 removes outputDir before execution. Application output defaults to test-results, deleting the diagnostics recorded there before launch. Story cleanup does not prove whether its renderer files survived: the upload failure leaves no downloadable evidence. Loader output comparison is therefore unavailable, not certified by the application pass.

Correction: retain renderer diagnostics in ci-evidence/nix-renderer, outside all Playwright output roots; upload it explicitly for application and stories. On launcher EXIT, restore only this checkout's test-results and ci-evidence ownership to the invoking runner using Nix coreutils through the existing privilege broker, without following symlinks. Preserve original failed exit status; a standalone ownership-repair failure makes the otherwise-successful run fail. No image, hash, loader validation, renderer, test or timeout change.

One focused Nix/Playwright no-browser probe reads the actual launcher evidence path: the runner removes an old output sentinel while preserving exact diagnostic bytes in the new location (1 case/2 assertions). Shell syntax and Linux derivation evaluation pass. Actual Linux ownership repair/upload retention await changed-source CI; no local root mutation or hosted evidence is fabricated. Full failed/passing logs are retained, including the separate artifact failure. No merge or promotion.
