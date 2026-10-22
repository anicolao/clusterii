# Review, join, recover and leave a waiting campaign

**Exact comparison passed.** short · darwin-arm64. Inventory: UX-01, UX-02, UX-03, UX-14, UX-16.

A developer creates a real waiting campaign, reviews portrait/faction/briefing with a persistent commitment rail, joins and recovers that exact campaign through Play. Waiting membership never offers Continue. Seat release is acknowledged and survives reload. The catalogue seed is fixed by the emulator-only harness; no campaign state or tick is fabricated.

## 1. Prepare a saved commander identity through ordinary UI and grant explicit emulator developer access. The test loader fixes catalogue entropy only.

Actor: **Test harness**. **Harness control; not a player action.**

Acknowledged outcome: Explicit test control; not a player action or hosted-service certification.

## 2. Open campaign creation and name the four-empire development galaxy.

Actor: **Star envoy**.

Acknowledged outcome: The named proposal is ready to commit.

- [x] Create galaxy stays in the viewport before automatic scrolling.

### Viewpoint: Star envoy

[![Open campaign creation and name the four-empire development galaxy. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/002-propose-campaign-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/002-propose-campaign-1-star-envoy.png)

## 3. Create the galaxy and review its faction choice before claiming a seat.

Actor: **Star envoy**.

Acknowledged outcome: Campaign creation is acknowledged and faction selection opens.

- [x] Claim stays visible while faction details scroll within their panel.

### Viewpoint: Star envoy

[![Create the galaxy and review its faction choice before claiming a seat. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/003-created-faction-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/003-created-faction-1-star-envoy.png)

## 4. Review portraits and choose The emissary without leaving the visible seat commitment.

Actor: **Star envoy**.

Acknowledged outcome: The named portrait is selected.

- [x] Claim stays visible before scrolling.

### Viewpoint: Star envoy

[![Review portraits and choose The emissary without leaving the visible seat commitment. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/004-choose-portrait-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/004-choose-portrait-1-star-envoy.png)

## 5. Return to the faction briefing while keeping the chosen portrait and commitment.

Actor: **Star envoy**.

Acknowledged outcome: Faction details are visible again.

- [x] Claim stays visible while choosing.

### Viewpoint: Star envoy

[![Return to the faction briefing while keeping the chosen portrait and commitment. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/005-review-faction-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/005-review-faction-1-star-envoy.png)

## 6. Read the campaign briefing and distinguish the shared-victory design from enabled development behavior.

Actor: **Star envoy**.

Acknowledged outcome: The briefing explicitly says victory evaluation is not enabled.

- [x] Claim remains visible while reviewing the briefing.

### Viewpoint: Star envoy

[![Read the campaign briefing and distinguish the shared-victory design from enabled development behavior. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/006-review-rules-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/006-review-rules-1-star-envoy.png)

## 7. Commit the seat and enter the authoritative waiting galaxy.

Actor: **Star envoy**.

Acknowledged outcome: The seat is confirmed and the real galaxy canvas is available.

- [x] The campaign URL records its authoritative UUID.

### Viewpoint: Star envoy

[![Commit the seat and enter the authoritative waiting galaxy. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/007-seat-confirmed-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/007-seat-confirmed-1-star-envoy.png)

## 8. Return to entry. A waiting membership remains accessible through Play and does not offer Continue.

Actor: **Star envoy**.

Acknowledged outcome: Play is available without an active-campaign Continue.

- [x] The campaign directory link is retained.

### Viewpoint: Star envoy

[![Return to entry. A waiting membership remains accessible through Play and does not offer Continue. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/008-waiting-entry-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/008-waiting-entry-1-star-envoy.png)

## 9. Open and close identity, returning keyboard focus to its entry control.

Actor: **Star envoy**.

Acknowledged outcome: Your identity regains focus.

- [x] The acknowledged navigation causes no uncaught application errors.

### Viewpoint: Star envoy

[![Open and close identity, returning keyboard focus to its entry control. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/009-identity-focus-return-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/009-identity-focus-return-1-star-envoy.png)

## 10. Use Play to review the joined waiting campaign by name.

Actor: **Star envoy**.

Acknowledged outcome: The joined campaign appears in the directory.

- [x] The directory reports exactly one joined membership.

### Viewpoint: Star envoy

[![Use Play to review the joined waiting campaign by name. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/010-campaign-directory-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/010-campaign-directory-1-star-envoy.png)

## 11. Select the named membership and recover its exact authoritative galaxy.

Actor: **Star envoy**.

Acknowledged outcome: The same campaign URL and canvas recover.

- [x] The acknowledged navigation causes no uncaught application errors.

### Viewpoint: Star envoy

[![Select the named membership and recover its exact authoritative galaxy. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/011-recover-exact-campaign-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/011-recover-exact-campaign-1-star-envoy.png)

## 12. Reload the waiting galaxy, recover its exact directory card through Campaigns and reopen its roster.

Actor: **Star envoy**.

Acknowledged outcome: The recovered roster permits leaving the waiting campaign.

- [x] Reload retains the exact campaign ID.

### Viewpoint: Star envoy

[![Reload the waiting galaxy, recover its exact directory card through Campaigns and reopen its roster. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/012-reload-membership-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/012-reload-membership-1-star-envoy.png)

## 13. Close the roster with Escape and retain its keyboard opening control.

Actor: **Star envoy**.

Acknowledged outcome: Roster regains keyboard focus.

- [x] The acknowledged navigation causes no uncaught application errors.

### Viewpoint: Star envoy

[![Close the roster with Escape and retain its keyboard opening control. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/013-roster-focus-return-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/013-roster-focus-return-1-star-envoy.png)

## 14. Reopen the roster with Enter and release the waiting seat.

Actor: **Star envoy**.

Acknowledged outcome: Seat release is acknowledged and the member galaxy view closes.

- [x] One logical Leave has its matching accepted receipt; membership is absent and the retained protected view denies player access, with no involuntary-access error or retry remedy.
- [x] The ordinary journey has no uncaught page errors.

### Viewpoint: Star envoy

[![Reopen the roster with Enter and release the waiting seat. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/014-release-seat-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/014-release-seat-1-star-envoy.png)

## 15. Reload entry and open Play again to confirm the released membership is absent.

Actor: **Star envoy**.

Acknowledged outcome: Your campaigns reports zero joined seats.

- [x] No uncaught page errors occurred.

### Viewpoint: Star envoy

[![Reload entry and open Play again to confirm the released membership is absent. — Star envoy](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/015-released-membership-reload-1-star-envoy.png)](../../../../../../tests/browser/story-baselines/campaign-admission-navigation/short/darwin-arm64/015-released-membership-reload-1-star-envoy.png)
