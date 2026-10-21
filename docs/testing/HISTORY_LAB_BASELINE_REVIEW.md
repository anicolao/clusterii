# History lab baseline review

Implementer review, 2026-10-21. The actual history component uses the existing reducer-derived lab records and callbacks. Browser time controls presentation; no authenticated history reads, grants or remote recovery are exercised.

The first generation incorrectly expected an accessible empty status after recovery. The production empty notice is not exposed in the accessibility tree. Retained evidence is at `/tmp/cluster-history-lab-empty-status-before`; the corrected assertion requires no accessible loading status and no loading copy while both record identities are present. No production component, prior baseline or comparison tolerance changes.

Candidate review, exact local comparison, pinned Linux comparison and independent acceptance are separate gates.

The second phone cohort exposed unsettled native keyboard scrolling (`/tmp/cluster-history-lab-scroll-before`). The reading action now waits on the record region reaching its actual end before capture. The unchanged six-frame settling rule and zero-pixel comparison remain in force. This is an explicit observed scroll outcome, not a delay or expected-image search.

Reviewed all48 final images (27 distinct PNGs) in ordered phone/desktop/short sheets and magnified4K specimens. Complete specimen labels, loading/error/retry feedback, original records, bounded reading focus and footer controls remain legible and contained. The reading view deliberately shows the end of the two opened records; the preceding recovered view shows both revision headings. Standard0ms/reduced180ms loading reveals retain identical text. Four candidate journeys pass in13.1 seconds. Promote only these new local candidates for exact comparison.

Exact local comparison passes four viewport journeys/48 captures in13.2 seconds, with four generated narratives archived. Type checks report zero errors/warnings; nine policy/clock/catalogue guards pass. Pinned Linux/current-head, preview and independent review remain open.
