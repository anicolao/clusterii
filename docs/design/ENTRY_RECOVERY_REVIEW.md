# Campaign entry and invitation recovery

Play opens campaign selection for a saved identity. First-time players establish their identity through sign-in. Learn opens the illustrated guide. Continue is a separate illustrated control naming the last accessible active campaign; waiting memberships do not create Continue. Multiple active campaigns expose Change campaign. Your identity remains separately available with focus restoration.

The entry joins authoritative directory metadata with the account's private membership index. A browser-local, account-scoped canonical campaign ID remembers the last opened active campaign across reloads; it contains no keys or secret state. Removed, inaccessible, waiting or completed campaigns cannot be resumed from that preference. A sole active campaign can be resumed without an earlier preference. With multiple active campaigns and no remembered accessible selection, Play lets the player choose instead of inventing a last campaign.

A signed-out campaign URL carries its canonical ID through the entry and Google sign-in. First-time identity saving returns after the authoritative receipt. A returning player's confirmed saved identity resumes the preserved invitation directly without another save. Denied access returns to entry without a redirect loop; missing invitations offer the directory. Return paths accept canonical IDs only and construct internal base-aware routes.

Account changes cancel old subscriptions. Membership recovery failures offer reconnect. Public games remain closed while rules and real cryptography are unfinished. This increment covers campaign entry in milestones 1/3/10, not hosted Google acceptance.

## Review correction and evidence

The reviewer withheld acceptance at ec6b8a0 because Continue replaced Play, included waiting memberships and lost the intended last-campaign meaning. The corrected controls follow UX-01. Earlier unnamed-Continue captures under entry-recovery record that reviewed predecessor; new active-entry captures record the correction and are not baseline replacements.

The returning-player browser journey now signs out, follows the invitation, signs back in and resumes without opening the identity editor or changing its persisted revision. It also verifies missing and denied invitations. This affected journey passes locally. Unit fixtures cover zero, waiting-only, one and multiple active memberships, missing preferences and inaccessible/completed selections. The two-roster browser journey waits for the actual quarter-hour start to verify named Continue and remembered selection from real campaign state at all supported sizes. The two-roster journey passed in 13.5 minutes, including the real-time wait; corrected active-entry captures at phone, desktop, 4K and short sizes are retained. Independent rendered acceptance remains a gate.

Emulator Google sign-in proves the application journey, not real-account hosted login. No existing entry/identity pixel baseline is regenerated. Shared retry coverage additionally verifies one logical command and one persisted effect across retransmitted transport frames.

An accumulated-emulator run exposed pagination in the test helper’s account listing. Developer fixtures now look up the exact email rather than scanning one page of accounts. This changes test administration only; no application authentication is mocked or bypassed.

Final affected validation: eight unit/reducer tests (110 assertions), type checks, lint and eight campaign/invitation/recovery browser tests pass. The independent two-roster scheduled-start journey passed in 13.5 minutes; the five unchanged entry/identity baseline journeys also pass. Replacement full CI and independent corrected composition review remain pending.
