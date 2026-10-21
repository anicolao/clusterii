# Live fleet formation story review

This successor to #56 migrates formation and disbanding through real authenticated controls, encrypted command ingress, private grants and leased tick settlement. Owner and independent-player viewpoints distinguish capacity rejection, reserved forces, confirmed formation, stationed-map presence, accepted disband and returned forces. Reloads preserve accepted commands; repeated settlement must not move forces twice. Existing procedural fleet/cargo/travel assertions remain unchanged.

| Dependency / acceptance | Status |
| --- | --- |
| Base | #56 `feat/live-construction-stories`, c7ddb86 |
| Authoritative setup | Four actual UI identities and admissions; explicit developer entitlement and fixed catalogue |
| Rules | Transport capacity and tick behavior remain development rules under review; no rule change or owner approval inferred |
| Clock | Test-only order admission boundary, actual leased service settlement and repeated delivery |
| Local checks | Type check: zero errors/warnings; 15 policy/clock guards pass |
| Candidate / exact | Pending generation, separate image review and exact comparison across four sizes |
| Linux / independent / hosted | Pending; development emulator evidence is not hosted acceptance |
| Remaining UX-08 | Interrupted delivery, managed keys, cargo, split/merge, cancellation, routes/travel and normal-motion live journeys remain separate |

The new test does not replace the procedural predecessor. Current-head preview verification and the inherited short identity-raster diagnosis remain open. No inherited baseline or comparison tolerance changes.
