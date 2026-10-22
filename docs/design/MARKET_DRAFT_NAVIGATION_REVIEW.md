# Unsent market allocation navigation

PR base: #80, feat/contextual-market-help. UX-06/14: preserve editable intent while navigating within an authorized campaign. Development allocation rules remain under review and are unchanged.

Reproduction at clean2c62a8b: all four viewport journeys lost100 camp points, recovering25 after Back to economy and Return to galaxy. Original traces/captures retained at /tmp/cluster-market-draft-failure; /tmp/cluster-market-draft-reproduce.log records failures. This is a production navigation defect, not a baseline mismatch.

The campaign route owns in-memory allocations by authenticated account and campaign. Blank fields and invalid totals survive closing/reopening instruments and campaign selection within that route. Authoritative updates refresh untouched allocations, while edited intent survives. Losing a membership or private view deletes that campaign draft; switching accounts, signing out or losing developer access clears protected scope. There is no localStorage, IndexedDB or cross-session persistence. Reload or leaving the campaign route discards unsent intent; accepted/uncertain order recovery remains the existing authoritative command/receipt mechanism. No draft restoration submits an order. No new discard control or cancellation behavior is introduced.

The existing live construction/market story now reproduces and verifies keyboard navigation with partial invalid edits, normal/reduced motion parity and complete canonical/private-view equality before commitment. Existing acknowledged focus, accepted-order reload, construction conservation/settlement and interrupted-command checks remain. Scope tests cover campaign pruning, account change, sign-out, revoked access returning, authority refresh and accepted allocations; they do not substitute for a live account-revocation journey.

Candidate generation/review, strict comparisons, gallery regression and current-head CI remain pending. Linux candidate approval, independent visual/hosted acceptance and original raster holds remain open.
