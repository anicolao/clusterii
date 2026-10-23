# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/003-science/components.spec.ts >> Read shared science ledger in gallery and lab
- Location: tests/e2e/003-science/components.spec.ts:37:1

# Error details

```
Error: The entire reading target and both corners remain usable inside every clipping ancestor

The entire reading target and both corners remain usable inside every clipping ancestor

expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

  Object {
-   "contained": true,
+   "contained": false,
    "hits": true,
  }

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Local presentation controls" [ref=e3]:
    - button "Menu" [ref=e4] [cursor=pointer]
  - generic [ref=e5]:
    - banner [ref=e6]:
      - paragraph [ref=e7]: Developer review
      - heading "Command feedback lab" [level=1] [ref=e8]
      - paragraph [ref=e9]: Deterministic production-component scenarios. Shared profile and campaign validation produces the accepted/rejected outcomes. Playback changes presentation time only; no service or game state is fabricated.
      - navigation [ref=e10]:
        - link "Component gallery" [ref=e11] [cursor=pointer]:
          - /url: /clusterii/pr4/gallery/
        - link "Player entry" [ref=e12] [cursor=pointer]:
          - /url: /clusterii/pr4/
    - region "Playback controls" [ref=e13]:
      - generic [ref=e14]:
        - text: Scenario
        - combobox "Scenario" [ref=e15]:
          - 'option "Credit offers: exact terms → pending → reconnect → reserved → settled"'
          - 'option "Invalid order: review → explicit local discard confirmation"'
          - 'option "Draft recovery: reload → saved → other tab conflict → saved"'
          - 'option "Selected history: scope review → acceptance → authorized messages"'
          - 'option "Return briefing: recover period → review → pending → visit saved"'
          - 'option "Conversation: invitation → accepted → message → reconnect → sent"'
          - 'option "Arrivals: loading → orbit secured → reconnect → conquest"'
          - 'option "Fleet contacts: unknown → loading → acquired → retry → last seen"'
          - 'option "Fleet route: pending → reconnect → accepted → traveling → arrived"'
          - 'option "Fleet cancellation: pending → reconnect → released"'
          - 'option "Fleet split: pending → reconnect → accepted → complete"'
          - 'option "Fleet merge: pending → reconnect → accepted → complete"'
          - 'option "Fleet cargo: pending → reconnect → reserved → loaded"'
          - 'option "Fleet: pending → reconnect → reserved → formed"'
          - 'option "Observation: unknown → current → stale"'
          - 'option "Market focus: pending → reconnect → accepted → applied"'
          - 'option "Construction: pending → reconnect → reserved → completed"'
          - 'option "Research: pending → reconnect → scheduled → applied"'
          - 'option "Production: due → confirmed ledger"'
          - 'option "Science: capacity → delivered ledger" [selected]'
          - 'option "History: loading → reconnect → recovered"'
          - 'option "Account: ending → signed out"'
          - 'option "Scheduled start: delayed → assigned"'
          - 'option "Order: mismatched acknowledgement"'
          - 'option "Encryption: verified → resumed"'
          - 'option "Maintenance: pending → paused"'
          - 'option "Maintenance: reconnect → resumed"'
          - 'option "Campaign: pending → seat confirmed"'
          - 'option "Campaign: stale roster → rejected"'
          - 'option "Campaign: reconnect → seat confirmed"'
          - option "Pending → accepted"
          - option "Pending → conflict"
          - option "Validation rejected"
          - option "Pending → reconnect → accepted"
      - generic [ref=e16]:
        - text: Playback speed
        - combobox "Playback speed" [ref=e17]:
          - option "¼×"
          - option "½×"
          - option "1×" [selected]
          - option "2×"
      - button "Replay" [ref=e18] [cursor=pointer]
      - button "Resume" [ref=e19] [cursor=pointer]
      - button "Reset" [ref=e20] [cursor=pointer]
      - generic [ref=e21]:
        - text: "Inspect frame: 1200 ms"
        - 'slider "Inspect frame: 1200 ms" [ref=e22]': "1200"
    - generic [ref=e23]:
      - region "Standard motion comparison" [ref=e24]:
        - heading "Standard motion" [level=2] [ref=e25]
        - paragraph [ref=e26]: Feedback recovery · No action indicated
        - region "Science sources" [ref=e28]:
          - generic [ref=e29]:
            - paragraph [ref=e30]: Your orbital science
            - heading "Science per tick" [level=2] [ref=e31]:
              - img [ref=e32]
              - text: Science per tick
            - paragraph [ref=e36]:
              - strong [ref=e37]: "+1.4"
              - text: / tick
          - region "Science source ledger" [active] [ref=e38]:
            - status "Science rate basis" [ref=e39]: Confirmed tick 0 · current orbital control and completed stations.
            - paragraph [ref=e40]: Assumes unchanged control, stations and research levels.
            - heading "Orbital sources" [level=3] [ref=e41]
            - article "Science from Sarin" [ref=e42]:
              - heading "Sarin" [level=4] [ref=e43]
              - generic [ref=e44]:
                - generic [ref=e45]:
                  - term [ref=e46]: Completed stations
                  - definition [ref=e47]: "1"
                - generic [ref=e48]:
                  - term [ref=e49]: Base science
                  - definition [ref=e50]: "1"
                - generic [ref=e51]:
                  - term [ref=e52]: Faction affinity
                  - definition [ref=e53]: ×1.4
                - generic [ref=e54]:
                  - term [ref=e55]: After Terraforming 0
                  - definition [ref=e56]: 1.4 / tick
            - heading "Empire total" [level=3] [ref=e57]
            - generic [ref=e58]:
              - generic [ref=e59]:
                - term [ref=e60]: Before Innovation
                - definition [ref=e61]: "1.4"
              - generic [ref=e62]:
                - term [ref=e63]: After Innovation 0
                - definition [ref=e64]: 1.4 / tick
              - generic [ref=e65]:
                - term [ref=e66]: Last delivered science
                - definition [ref=e67]: First production pending
            - paragraph [ref=e68]: Terraforming applies to each system, then Innovation applies to the empire total. Output is floored to thousandths by the recorded ruleset.
            - paragraph [ref=e69]: Queued construction and future arrivals can change the next output.
            - paragraph [ref=e70]: Development rules remain under review.
          - button "Return to galaxy" [ref=e72] [cursor=pointer]
      - region "Reduced motion comparison" [ref=e73]:
        - heading "Reduced motion" [level=2] [ref=e74]
        - paragraph [ref=e75]: Feedback recovery · No action indicated
        - region "Science sources" [ref=e77]:
          - generic [ref=e78]:
            - paragraph [ref=e79]: Your orbital science
            - heading "Science per tick" [level=2] [ref=e80]:
              - img [ref=e81]
              - text: Science per tick
            - paragraph [ref=e85]:
              - strong [ref=e86]: "+1.4"
              - text: / tick
          - region "Science source ledger" [ref=e87]:
            - status "Science rate basis" [ref=e88]: Confirmed tick 0 · current orbital control and completed stations.
            - paragraph [ref=e89]: Assumes unchanged control, stations and research levels.
            - heading "Orbital sources" [level=3] [ref=e90]
            - article "Science from Sarin" [ref=e91]:
              - heading "Sarin" [level=4] [ref=e92]
              - generic [ref=e93]:
                - generic [ref=e94]:
                  - term [ref=e95]: Completed stations
                  - definition [ref=e96]: "1"
                - generic [ref=e97]:
                  - term [ref=e98]: Base science
                  - definition [ref=e99]: "1"
                - generic [ref=e100]:
                  - term [ref=e101]: Faction affinity
                  - definition [ref=e102]: ×1.4
                - generic [ref=e103]:
                  - term [ref=e104]: After Terraforming 0
                  - definition [ref=e105]: 1.4 / tick
            - heading "Empire total" [level=3] [ref=e106]
            - generic [ref=e107]:
              - generic [ref=e108]:
                - term [ref=e109]: Before Innovation
                - definition [ref=e110]: "1.4"
              - generic [ref=e111]:
                - term [ref=e112]: After Innovation 0
                - definition [ref=e113]: 1.4 / tick
              - generic [ref=e114]:
                - term [ref=e115]: Last delivered science
                - definition [ref=e116]: First production pending
            - paragraph [ref=e117]: Terraforming applies to each system, then Innovation applies to the empire total. Output is floored to thousandths by the recorded ruleset.
            - paragraph [ref=e118]: Queued construction and future arrivals can change the next output.
            - paragraph [ref=e119]: Development rules remain under review.
          - button "Return to galaxy" [ref=e121] [cursor=pointer]
    - paragraph [ref=e122]: The 180 ms feedback reveal uses the exact animation action shipped in identity. Reduced motion displays the same result immediately. Seek to a transition boundary and step milliseconds to inspect opacity and movement. Reconnect advances the deterministic receipt sequence; live networking is tested in the emulator browser journey.
  - region "Command control motion lab" [ref=e123]:
    - heading "Shared command selection" [level=2] [ref=e124]
    - paragraph [ref=e125]: Selection is immediate. Normal and reduced motion preserve the same local result; this preview issues no campaign order.
    - generic [ref=e126]:
      - region "Standard command comparison" [ref=e127]:
        - heading "Standard motion" [level=3] [ref=e128]
        - status "Local command selection" [ref=e129]: "Selected command preview: systems"
        - generic [ref=e130]:
          - button "systems" [ref=e131] [cursor=pointer]:
            - img [ref=e132]
            - generic [ref=e134]: systems
          - button "economy" [ref=e135] [cursor=pointer]:
            - img [ref=e136]
            - generic [ref=e138]: economy
      - region "Reduced command comparison" [ref=e139]:
        - heading "Reduced motion" [level=3] [ref=e140]
        - status "Local command selection" [ref=e141]: "Selected command preview: systems"
        - generic [ref=e142]:
          - button "systems" [ref=e143] [cursor=pointer]:
            - img [ref=e144]
            - generic [ref=e146]: systems
          - button "economy" [ref=e147] [cursor=pointer]:
            - img [ref=e148]
            - generic [ref=e150]: economy
```

# Test source

```ts
  1  | import { expect, type Locator } from "@playwright/test";
  2  | 
  3  | // Observe without moving the viewport: a later test scroll must not hide a
  4  | // production focus/selection bug. Keep both original corner hit checks.
  5  | export async function expectReadingTarget(target: Locator, hitTest = true) {
  6  |   await expect
  7  |     .poll(
  8  |       () =>
  9  |         target.evaluate((element, hitTest) => {
  10 |           const box = element.getBoundingClientRect();
  11 |           let left = 0,
  12 |             top = 0,
  13 |             right = innerWidth,
  14 |             bottom = innerHeight;
  15 |           for (
  16 |             let parent = element.parentElement;
  17 |             parent;
  18 |             parent = parent.parentElement
  19 |           ) {
  20 |             const style = getComputedStyle(parent),
  21 |               bounds = parent.getBoundingClientRect();
  22 |             if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
  23 |               left = Math.max(left, bounds.left + parent.clientLeft);
  24 |               right = Math.min(
  25 |                 right,
  26 |                 bounds.left + parent.clientLeft + parent.clientWidth,
  27 |               );
  28 |             }
  29 |             if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
  30 |               top = Math.max(top, bounds.top + parent.clientTop);
  31 |               bottom = Math.min(
  32 |                 bottom,
  33 |                 bounds.top + parent.clientTop + parent.clientHeight,
  34 |               );
  35 |             }
  36 |           }
  37 |           const corners = [
  38 |             [box.left + 1, box.top + 1],
  39 |             [box.right - 1, box.bottom - 1],
  40 |             [box.left + box.width / 2, box.top + box.height / 2],
  41 |           ].map(([x, y]) => {
  42 |             const painted = document.elementFromPoint(x, y);
  43 |             return {
  44 |               hit:
  45 |                 !hitTest ||
  46 |                 painted === element ||
  47 |                 (!!painted && element.contains(painted)),
  48 |               painted: painted?.tagName + "." + painted?.className,
  49 |             };
  50 |           });
  51 |           return {
  52 |             rect: box.toJSON(),
  53 |             clip: { left, top, right, bottom },
  54 |             corners,
  55 |             contained:
  56 |               box.width > 0 &&
  57 |               box.height > 0 &&
  58 |               box.left >= left &&
  59 |               box.top >= top &&
  60 |               box.right <= right &&
  61 |               box.bottom <= bottom,
  62 |             hits: corners.every((corner) => corner.hit),
  63 |           };
  64 |         }, hitTest),
  65 |       {
  66 |         message:
  67 |           "The entire reading target and both corners remain usable inside every clipping ancestor",
  68 |       },
  69 |     )
> 70 |     .toMatchObject({ contained: true, hits: true });
     |      ^ Error: The entire reading target and both corners remain usable inside every clipping ancestor
  71 | }
  72 | 
```