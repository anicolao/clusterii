# Linux candidate generation progress

The single explicit run39743227540 / job119705315798 completed successfully at 2026-10-22 10:20:20 UTC for frozen source417bb62232403a3a841245b2e6aabdd34f9701dc. The actual generation step ran08:48:58–10:18:12 UTC (89m14s); it was not skipped. Each viewport passed43 stories: phone12.9min, desktop17.4min, large42.8min, short14.9min. The large cohort accounts for much of the duration. The retained log contains no Error entries or timeout failures; there is no demonstrated hang.

Eligible generation artifact12418233598, illustrated-stories-generate-linux-arm64, is4,440,214,304 bytes. Failed verification artifact12415154158 is ineligible. Bounded ZIP range reads inspect metadata without downloading the full archive under limited disk headroom. Review must confirm matching source, clean tree, generation mode, passed story and pinned renderer before selecting any candidate. Generation success alone does not approve images; no Linux candidates are promoted here. Newer changed components/stories must not be overwritten by this older source.

Retained local progress log: /tmp/cluster70-running-generation-progress.log. The original short stellar-core and identity raster failures remain unresolved; passing generation does not establish a fix. No duplicate generation was requested.

The manifests record GitHub PR merge commitddd7512cd2169da67a312272b8336a086a034d4a (parentsf6c20e3 and417bb62). API tree8d8b61e03b4b494370d6def90492d35ed193c9bf exactly matches frozen417bb62’s local tree. This resolves the source-label difference without assuming the merge commit is the head. The sampled manifests are clean, passed generation, Linux arm64, pinned Playwright1.61.1/container digest, DPR1/en-US/UTC/reduced motion. Full metadata audit and independent candidate review remain separate.

#78 current-heada2d0d2f publication run39761461392/job119767160220 passed; this is static exact-head preview evidence, not hosted Google/Scheduler acceptance.
