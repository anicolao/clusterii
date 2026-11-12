# Complete waypoint reading

Run 43119625703 failed the existing complete-list containment assertion in phone
and short route recovery and paused travel. The second waypoint places the list
16px above the phone reader and 1px above the short reader after centered scroll.
The preceding phone original was inspected: one waypoint and all three controls
fit, without control wrapping. The active editor region is correctly selected.

Reduce each waypoint row vertical padding from 8px to 4px and its control-row
margins from 10px/6px to 4px/0. This saves 20px per row, retaining every text,
44px control, focus outline, chart area and footer. Restrict row padding to the
actual Route waypoints list. No test, deadline, assertion or reference changes.

This is a bounded corrective candidate. Full original journeys must demonstrate
complete-list visibility and later behavior, followed by actual image inspection;
static/type checks alone are not browser acceptance. Existing failed evidence
and successful cargo evidence remain retained with original provenance.
