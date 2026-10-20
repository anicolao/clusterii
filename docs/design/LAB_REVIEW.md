# Production gallery and animation lab

This slice depends on PR #4. It adds `/gallery/` and `/dev/animations/` without links in normal player navigation. The gallery uses the same ActionButton, EntryButton, ChapterNav, NameField, PortraitPicker, Icon and Feedback components as the player screens. It exposes primary/secondary/quiet actions, illustrated navigation, chapter selection, all portraits, field validation, disabled/pending/error states, and the complete decorative icon inventory. Keyboard focus is exercised on the actual controls. Asset provenance links to the source prompts and licences.

The animation lab runs deterministic identity presentation scenarios: pending/accepted, conflict, invalid input, and reconnect/recovery. The production profile reducer generates accepted/rejected results; production receipt-copy functions render the outcome. The lab has replay/reset, pause/resume, millisecond seek, speed selection and simultaneous reduced-motion comparison. It does not create game state or substitute a fake Firebase implementation. The shared production feedback action animates its reveal for 180 ms; outcome and draft are independent of animation progress.

## Source review

Reviewed Pantheon `src/routes/dev/animations/+page.svelte`, `scenarios.ts`, `src/routes/gallery/+page.svelte`, and `src/lib/components/Gallery.svelte`. Adopted real shared components, deterministic scenarios, replay controls, and explicit developer navigation. Reviewed the Todo lab at `/Users/anicolao/projects/todo-mobile-transitions/src/routes/dev/animations/`; the main Todo checkout has no lab route. Adopted pause/seek inspection and reduced-motion comparison without altering logical outcomes. Cluster's current presentation scope is identity feedback; gameplay scenarios extend the lab when those real interactions ship.

## Acceptance

Browser checks exercise replay, pause, seek, speed selection, unchanged standard/reduced outcomes, and phone/desktop/4K/short geometry. Rendered gallery and lab screenshots are retained in CI artifacts, alongside foundation regression evidence. Implementer review checks readable phone specimens and matched comparison outcomes. Independent supervisor rendered review and hosted real-account persistence remain outstanding; local presentation fixtures do not certify networking or hosted authentication.
