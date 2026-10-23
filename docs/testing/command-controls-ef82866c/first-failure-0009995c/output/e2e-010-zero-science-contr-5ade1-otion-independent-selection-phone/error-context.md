# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/010-zero-science/controls.spec.ts >> Shared command artwork retains keyboard targets and motion-independent selection
- Location: tests/e2e/010-zero-science/controls.spec.ts:5:1

# Error details

```
Error: page.evaluate: Error: Stable capture has an undeclared paused animation; use a separate explicit animation inspection test.
    at captureReady (eval at evaluate (:303:30), <anonymous>:53:77)
    at async <anonymous>:329:30
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
          - option "Pending → accepted" [selected]
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
        - text: "Inspect frame: 0 ms"
        - 'slider "Inspect frame: 0 ms" [ref=e22]': "0"
    - generic [ref=e23]:
      - region "Standard motion comparison" [ref=e24]:
        - heading "Standard motion" [level=2] [ref=e25]
        - paragraph [ref=e26]: Feedback recovery · No action indicated
        - generic [ref=e27]: Commander name
        - textbox "Commander name" [disabled] [ref=e28]: Preserved draft
        - group "Choose your portrait" [ref=e29]:
          - generic [ref=e30]: Choose your portrait
          - generic [ref=e31]:
            - generic "The envoy" [ref=e32] [cursor=pointer]:
              - radio "The envoy" [disabled] [ref=e33]
              - generic [ref=e35]: The envoy
            - generic "The navigator" [ref=e36] [cursor=pointer]:
              - radio "The navigator" [disabled] [ref=e37]
              - generic [ref=e39]: The navigator
            - generic "The tidekeeper" [ref=e40] [cursor=pointer]:
              - radio "The tidekeeper" [disabled] [ref=e41]
              - generic [ref=e43]: The tidekeeper
            - generic "The deepseer" [ref=e44] [cursor=pointer]:
              - radio "The deepseer" [checked] [disabled] [ref=e45]
              - generic [ref=e47]: The deepseer
              - generic [ref=e48]: ✓
            - generic "The architect" [ref=e49] [cursor=pointer]:
              - radio "The architect" [disabled] [ref=e50]
              - generic [ref=e52]: The architect
            - generic "The scholar" [ref=e53] [cursor=pointer]:
              - radio "The scholar" [disabled] [ref=e54]
              - generic [ref=e56]: The scholar
            - generic "The marshal" [ref=e57] [cursor=pointer]:
              - radio "The marshal" [disabled] [ref=e58]
              - generic [ref=e60]: The marshal
            - generic "The emissary" [ref=e61] [cursor=pointer]:
              - radio "The emissary" [disabled] [ref=e62]
              - generic [ref=e64]: The emissary
        - status [ref=e66]: Sending your identity…
      - region "Reduced motion comparison" [ref=e67]:
        - heading "Reduced motion" [level=2] [ref=e68]
        - paragraph [ref=e69]: Feedback recovery · No action indicated
        - generic [ref=e70]: Commander name
        - textbox "Commander name" [disabled] [ref=e71]: Preserved draft
        - group "Choose your portrait" [ref=e72]:
          - generic [ref=e73]: Choose your portrait
          - generic [ref=e74]:
            - generic "The envoy" [ref=e75] [cursor=pointer]:
              - radio "The envoy" [disabled] [ref=e76]
              - generic [ref=e78]: The envoy
            - generic "The navigator" [ref=e79] [cursor=pointer]:
              - radio "The navigator" [disabled] [ref=e80]
              - generic [ref=e82]: The navigator
            - generic "The tidekeeper" [ref=e83] [cursor=pointer]:
              - radio "The tidekeeper" [disabled] [ref=e84]
              - generic [ref=e86]: The tidekeeper
            - generic "The deepseer" [ref=e87] [cursor=pointer]:
              - radio "The deepseer" [checked] [disabled] [ref=e88]
              - generic [ref=e90]: The deepseer
              - generic [ref=e91]: ✓
            - generic "The architect" [ref=e92] [cursor=pointer]:
              - radio "The architect" [disabled] [ref=e93]
              - generic [ref=e95]: The architect
            - generic "The scholar" [ref=e96] [cursor=pointer]:
              - radio "The scholar" [disabled] [ref=e97]
              - generic [ref=e99]: The scholar
            - generic "The marshal" [ref=e100] [cursor=pointer]:
              - radio "The marshal" [disabled] [ref=e101]
              - generic [ref=e103]: The marshal
            - generic "The emissary" [ref=e104] [cursor=pointer]:
              - radio "The emissary" [disabled] [ref=e105]
              - generic [ref=e107]: The emissary
        - status [ref=e109]: Sending your identity…
    - paragraph [ref=e110]: The 180 ms feedback reveal uses the exact animation action shipped in identity. Reduced motion displays the same result immediately. Seek to a transition boundary and step milliseconds to inspect opacity and movement. Reconnect advances the deterministic receipt sequence; live networking is tested in the emulator browser journey.
  - region "Command control motion lab" [ref=e111]:
    - heading "Shared command selection" [level=2] [ref=e112]
    - paragraph [ref=e113]: Selection is immediate. Normal and reduced motion preserve the same local result; this preview issues no campaign order.
    - generic [ref=e114]:
      - region "Standard command comparison" [ref=e115]:
        - heading "Standard motion" [level=3] [ref=e116]
        - status "Local command selection" [ref=e117]: "Selected command preview: economy"
        - generic [ref=e118]:
          - button "systems" [ref=e119] [cursor=pointer]:
            - img [ref=e120]
            - generic [ref=e122]: systems
          - button "economy" [active] [ref=e123] [cursor=pointer]:
            - img [ref=e124]
            - generic [ref=e126]: economy
      - region "Reduced command comparison" [ref=e127]:
        - heading "Reduced motion" [level=3] [ref=e128]
        - status "Local command selection" [ref=e129]: "Selected command preview: systems"
        - generic [ref=e130]:
          - button "systems" [ref=e131] [cursor=pointer]:
            - img [ref=e132]
            - generic [ref=e134]: systems
          - button "economy" [ref=e135] [cursor=pointer]:
            - img [ref=e136]
            - generic [ref=e138]: economy
```