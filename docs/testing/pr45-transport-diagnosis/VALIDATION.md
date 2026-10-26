# Briefing transport correction validation

The failing trace contains a recovered campaign.visit in HTTP long polling, bypassing the old WebSocket-only hold. Replayed the retained HTTP request URLs through the exact new callback: one visit held, unrelated traffic forwarded, and visit forwarded only after release. This confirms the observed transport gap is covered; it does not replace browser CI.

Nix bun build of briefing.spec.ts passed. Git diff whitespace check passed. Original command path/payload equality, receipt, saved horizon, and exactly-once canonical revision assertions remain. Added unchanged canonical revision after reload before releasing either transport. No baseline, production, retry count, or timeout change.

The fixed-size visit fixture uses single-segment packets. Unexpected segmented traffic during the hold fails explicitly instead of bypassing the interception. Full browser verification is pending CI.
