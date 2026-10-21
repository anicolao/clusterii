# Restore entry focus after keyboard learning and identity editing

**Exact comparison passed.** short · darwin-arm64. Inventory: UX-01, UX-15, UX-16.

A visitor opens and closes Learn with the keyboard, signs in, closes identity editing, and checks that the entry controls remain focused and reduced-motion transitions are removed.

## 1. Open entry with Play and Learn available.

Actor: **Visitor**.

Acknowledged outcome: Play is ready.

- [x] Learn is available.

### Viewpoint: Visitor

[![Open entry with Play and Learn available. — Visitor](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/001-arrive-1-visitor.png)](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/001-arrive-1-visitor.png)

## 2. Open Learn with Enter and focus the first chapter.

Actor: **Visitor**.

Acknowledged outcome: The chapter heading receives focus.

- [x] The return control remains reachable.

### Viewpoint: Visitor

[![Open Learn with Enter and focus the first chapter. — Visitor](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/002-keyboard-learn-1-visitor.png)](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/002-keyboard-learn-1-visitor.png)

## 3. Use the keyboard to return to the opening Learn control.

Actor: **Visitor**.

Acknowledged outcome: Focus returns to Learn.

- [x] Play remains enabled.

### Viewpoint: Visitor

[![Use the keyboard to return to the opening Learn control. — Visitor](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/003-return-from-learn-1-visitor.png)](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/003-return-from-learn-1-visitor.png)

## 4. Sign in through Play and open identity editing.

Actor: **Commander**.

Acknowledged outcome: The identity editor is ready.

- [x] Close and Save remain available.

### Viewpoint: Commander

[![Sign in through Play and open identity editing. — Commander](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/004-sign-in-1-commander.png)](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/004-sign-in-1-commander.png)

## 5. Close identity editing and restore focus to Play with reduced motion.

Actor: **Commander**.

Acknowledged outcome: Focus returns to the Play control that opened identity.

- [x] Reduced motion is active and the entry control has no transition duration.

### Viewpoint: Commander

[![Close identity editing and restore focus to Play with reduced motion. — Commander](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/005-close-identity-1-commander.png)](../../../../../../tests/browser/story-baselines/identity-keyboard-return/short/darwin-arm64/005-close-identity-1-commander.png)
