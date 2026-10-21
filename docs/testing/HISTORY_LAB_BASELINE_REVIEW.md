# History lab baseline review

Implementer review, 2026-10-21. The actual history component uses the existing reducer-derived lab records and callbacks. Browser time controls presentation; no authenticated history reads, grants or remote recovery are exercised.

The first generation incorrectly expected an accessible empty status after recovery. The production empty notice is not exposed in the accessibility tree. Retained evidence is at `/tmp/cluster-history-lab-empty-status-before`; the corrected assertion requires no accessible loading status and no loading copy while both record identities are present. No production component, prior baseline or comparison tolerance changes.

Candidate review, exact local comparison, pinned Linux comparison and independent acceptance are separate gates.

The second phone cohort exposed unsettled native keyboard scrolling (`/tmp/cluster-history-lab-scroll-before`). The reading action now waits on the record region reaching its actual end before capture. The unchanged six-frame settling rule and zero-pixel comparison remain in force. This is an explicit observed scroll outcome, not a delay or expected-image search.

Reviewed all48 final images (27 distinct PNGs) in ordered phone/desktop/short sheets and magnified4K specimens. Complete specimen labels, loading/error/retry feedback, original records, bounded reading focus and footer controls remain legible and contained. The reading view deliberately shows the end of the two opened records; the preceding recovered view shows both revision headings. Standard0ms/reduced180ms loading reveals retain identical text. Four candidate journeys pass in13.1 seconds. Promote only these new local candidates for exact comparison.

Exact local comparison passes four viewport journeys/48 captures in13.2 seconds, with four generated narratives archived. Type checks report zero errors/warnings; nine policy/clock/catalogue guards pass. Pinned Linux/current-head, preview and independent review remain open.

## Separate Linux candidate review

Implementer review, 2026-10-21. Source: run39680090423, generation artifact12386484199, clean sourcecbf67363a4575f127308d2190b03b404a9a72873 with identical tree to PR head4f8cb6a. Production code, lockfile, helper and this story spec match the receiving branch. The generation manifest pins Playwright1.61.1/Chromium149.0.7827.0 Linuxarm64, DPR1, bundled fonts, en-US/UTC. Spec SHA-256: bf77182039838400bcb62ab688d49c86b462ddc46ef39af23374d72b942e4766.

Reviewed all48 captures (27 distinct PNGs). Loading, interruption, retry, recovered revision headings, bounded record reading and focused return controls match their named steps. Phone views deliberately scroll each specimen; the read-records view shows the end of opened records after earlier views establish their headings. Ordered phone/desktop/short sheets and enlarged4K specimen regions were inspected. Approve only this new Linux image set and manifests for strict comparison. Component fixtures are not live-service or hosted acceptance, and review-state rules remain unapproved.

The source verification failure is retained at `/tmp/cluster51-1848-review-failure.log`:20 missing Linux lab cases plus the inherited identity paragraph mismatch. This addition addresses four missing cases; strict current-head CI, independent review and preview checks remain gates. Existing baselines, tolerances and production behavior are unchanged. The identity diagnosis remains separate in IDENTITY_RASTER_DIAGNOSIS.md on the successor branch.
