# Enter the observatory

Production entry and Learn journey: [entry.spec.ts](entry.spec.ts). Read [E2E guide](../../../E2E_GUIDE.md) and [fidelity review](FIDELITY.md).

- [Phone retained story](stories/learn-and-return/phone/darwin-arm64/README.md)
- [Desktop retained story](stories/learn-and-return/desktop/darwin-arm64/README.md)
- [Large retained story](stories/learn-and-return/large/darwin-arm64/README.md)
- [Short retained story](stories/learn-and-return/short/darwin-arm64/README.md)

These archived stories and screenshots retain their original source/review metadata. They are historical regression references, not acceptance of the changed cinematic entry. New candidates remain separate until independently reviewed.

Run only this feature: `nix develop /tmp/pantheon-nix-env --command bunx playwright test --config playwright.stories.config.ts tests/e2e/001-entry/entry.spec.ts`. Use real demo emulators for app initialization; explicit generation sets `CLUSTER_STORY_MODE=generate`. Verification never updates screenshots.

[Returning entry journey](returning.spec.ts) verifies actual campaign membership and Continue after scheduled start. It requires the existing demo-only catalogue/admission loader through NODE_OPTIONS, real emulators and serialized Functions compilation. Never inject membership to reproduce the illustration.
