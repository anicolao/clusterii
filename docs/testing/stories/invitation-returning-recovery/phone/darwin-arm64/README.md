# Return through an invitation without rewriting identity

**Exact comparison passed.** phone · darwin-arm64. Inventory: UX-01, UX-02, UX-14, UX-16.

A signed-out commander with a saved identity and an admitted seat returns through the original invitation. Authentication resumes the campaign directly, with no identity resave. Missing and development-access-denied invitations provide explicit recovery routes without changing the saved identity.

## 1. Prepare two independently authenticated commanders and two admitted seats through real UI, with fixed catalogue input and explicit emulator development access. Save the returning identity once, then sign out through the identity editor. This establishes an existing campaign; it does not claim illustrated admission or hosted Google acceptance.

Actor: **Test harness**. **Harness control; not a player action.**

Acknowledged outcome: Explicit test control; not a player action or hosted-service certification.

## 2. Open the original invitation while signed out.

Actor: **Returning envoy**.

Acknowledged outcome: The campaign asks for sign-in before exposing private information.

- [x] The private galaxy is absent while signed out.

### Viewpoint: Returning envoy

[![Open the original invitation while signed out. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/002-return-to-invitation-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/002-return-to-invitation-1-returning-envoy.png)

## 3. Continue to entry while retaining the exact campaign destination.

Actor: **Returning envoy**.

Acknowledged outcome: Play is ready for authentication.

- [x] The campaign ID is preserved across the entry redirect.

### Viewpoint: Returning envoy

[![Continue to entry while retaining the exact campaign destination. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/003-preserve-return-link-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/003-preserve-return-link-1-returning-envoy.png)

## 4. Authenticate with the saved account and resume the campaign directly.

Actor: **Returning envoy**.

Acknowledged outcome: The invited galaxy opens without an identity-editor round trip.

- [x] No identity resave or duplicate seat is required.

### Viewpoint: Returning envoy

[![Authenticate with the saved account and resume the campaign directly. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/004-authenticate-and-resume-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/004-authenticate-and-resume-1-returning-envoy.png)

### Viewpoint: Invitation host

[![Authenticate with the saved account and resume the campaign directly. — Invitation host](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/004-authenticate-and-resume-2-invitation-host.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/004-authenticate-and-resume-2-invitation-host.png)

## 5. Reload the resumed campaign with the same saved identity.

Actor: **Returning envoy**.

Acknowledged outcome: The authorized galaxy is recovered again.

- [x] Recovery leaves the original identity revision and receipt intact.

### Viewpoint: Returning envoy

[![Reload the resumed campaign with the same saved identity. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/005-reload-return-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/005-reload-return-1-returning-envoy.png)

## 6. Follow an invitation whose campaign is no longer available.

Actor: **Returning envoy**.

Acknowledged outcome: The unavailable-campaign error explains the missing destination.

- [x] All campaigns offers a usable remedy and identity is unchanged.

### Viewpoint: Returning envoy

[![Follow an invitation whose campaign is no longer available. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/006-missing-invitation-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/006-missing-invitation-1-returning-envoy.png)

## 7. Return to the campaign directory after the missing invitation.

Actor: **Returning envoy**.

Acknowledged outcome: The campaign directory loads and clears the missing-link error.

- [x] The existing saved identity remains unchanged.

### Viewpoint: Returning envoy

[![Return to the campaign directory after the missing invitation. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/007-recover-directory-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/007-recover-directory-1-returning-envoy.png)

## 8. Remove this test account's emulator development claim to exercise a real authorization denial. The campaign, membership, history and identity records are not edited.

Actor: **Test harness**. **Harness control; not a player action.**

Acknowledged outcome: Explicit test control; not a player action or hosted-service certification.

## 9. Follow the original invitation after development access is removed.

Actor: **Returning envoy**.

Acknowledged outcome: The development-access boundary denies campaign entry.

- [x] The denied view exposes no galaxy and leaves saved identity intact.

### Viewpoint: Returning envoy

[![Follow the original invitation after development access is removed. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/009-denied-invitation-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/009-denied-invitation-1-returning-envoy.png)

## 10. Return to entry and clear the inaccessible invitation.

Actor: **Returning envoy**.

Acknowledged outcome: The entry surface is available again.

- [x] The denied campaign query is cleared without rewriting identity.

### Viewpoint: Returning envoy

[![Return to entry and clear the inaccessible invitation. — Returning envoy](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/010-recover-entry-1-returning-envoy.png)](../../../../../../tests/browser/story-baselines/invitation-returning-recovery/phone/darwin-arm64/010-recover-entry-1-returning-envoy.png)
