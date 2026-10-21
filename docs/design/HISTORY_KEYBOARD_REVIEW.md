# History keyboard order correction

Reviewer CI runs 39599629028 (#32) and 39600113448 (#33) failed the old assertion that Shift+Tab from Saved campaign records reaches Return to galaxy immediately. The briefing slice adds the visible “Since your last visit” control before that region. The production DOM and modal focus trap preserve a coherent order; the old expected first control is stale.

The corrected four-size regression verifies records → Shift+Tab → briefing → Shift+Tab → Return to galaxy → Tab → briefing → Tab → records. This tests reverse traversal, forward traversal and both ends of the modal wrap. It retains the visible return rail, record expansion, paging beyond ten records, no forced scrolling on new records, explicit latest recovery, offline retry, Escape restoration, selected system preservation and reload persistence assertions.

The ordinary service/browser cohort passes all four viewports in 33.3 seconds (`/tmp/cluster-history-keyboard-browser.log`). Prior CI failures remain at `/tmp/cluster32-review-failure.log` and `/tmp/cluster33-review-failure.log`. Captures: [phone](../ux/reviews/history-keyboard/history-phone.png), [desktop](../ux/reviews/history-keyboard/history-desktop.png), [short](../ux/reviews/history-keyboard/history-short.png), [4K](../ux/reviews/history-keyboard/history-4k.png).

This corrects a procedural regression on the pre-story branches. It is not illustrated-story acceptance. The successor story branch must migrate this changed journey under its mandatory policy rather than silently updating the frozen legacy hash. Hosted and latest-head CI acceptance remain pending. No UI, authorization or assertion tolerance changed.
