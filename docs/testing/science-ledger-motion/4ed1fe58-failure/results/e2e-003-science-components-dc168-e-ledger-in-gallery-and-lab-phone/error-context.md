# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/003-science/components.spec.ts >> Read shared science ledger in gallery and lab
- Location: tests/e2e/003-science/components.spec.ts:5:1

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 0
Received:    -190.859375
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
          - region "Science source ledger" [ref=e38]:
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
          - region "Science source ledger" [active] [ref=e87]:
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
  120 |     a.data.equals(b.data)
  121 |   );
  122 | }
  123 | /** Actions, acknowledged facts and every player view form one ordered narrative. */
  124 | export class TestStepHelper {
  125 |   private story: Story;
  126 |   constructor(
  127 |     private info: TestInfo,
  128 |     metadata: Metadata,
  129 |   ) {
  130 |     if (!["verify", "generate"].includes(mode()))
  131 |       throw new Error("CLUSTER_STORY_MODE must be verify or generate");
  132 |     if (info.config.updateSnapshots !== "none")
  133 |       throw new Error(
  134 |         "Use the separate story generation command; Playwright snapshot updating is forbidden",
  135 |       );
  136 |     if (metadata.id !== safe(metadata.id))
  137 |       throw new Error("Story IDs must use stable lowercase slugs");
  138 |     if (
  139 |       process.platform === "linux" &&
  140 |       process.env.CLUSTER_PINNED_RENDERER !== pinnedRenderer
  141 |     )
  142 |       throw new Error(
  143 |         "Linux stories require the pinned renderer workflow/container",
  144 |       );
  145 |     const existing = stories.get(info);
  146 |     if (existing && existing.metadata.id !== metadata.id)
  147 |       throw new Error("One ordered story owns each test");
  148 |     this.story = existing ?? {
  149 |       metadata,
  150 |       entries: [],
  151 |       ids: new Set(),
  152 |       folder: resolve(
  153 |         process.env.CLUSTER_STORY_OUTPUT_ROOT ?? "test-results/stories",
  154 |         metadata.id,
  155 |         info.project.name,
  156 |         platform(),
  157 |       ),
  158 |     };
  159 |     const owner = owners.get(this.story.folder);
  160 |     if (owner && owner !== info.testId)
  161 |       throw new Error(
  162 |         "Distinct tests must not share an illustrated output directory",
  163 |       );
  164 |     if (!existing) claimStoryOutput(this.story.folder);
  165 |     owners.set(this.story.folder, info.testId);
  166 |     stories.set(info, this.story);
  167 |   }
  168 |   async step(
  169 |     id: string,
  170 |     options: {
  171 |       description: string;
  172 |       actor: string;
  173 |       action: () => Promise<unknown>;
  174 |       acknowledgement: Verification;
  175 |       verifications: Verification[];
  176 |       views: StoryView[];
  177 |     },
  178 |   ) {
  179 |     if (!options.views.length || !options.verifications.length)
  180 |       throw new Error(
  181 |         "A player step needs named assertions and at least one viewpoint",
  182 |       );
  183 |     this.claim(id);
  184 |     await test.step(
  185 |       options.description,
  186 |       async () => {
  187 |         await test.step(`${options.actor}: player action`, options.action);
  188 |         await test.step(
  189 |           options.acknowledgement.spec,
  190 |           options.acknowledgement.check,
  191 |         );
  192 |         for (const check of options.verifications)
  193 |           await test.step(check.spec, check.check);
  194 |         const entry: Entry = {
  195 |           id,
  196 |           description: options.description,
  197 |           actor: options.actor,
  198 |           kind: "player",
  199 |           acknowledgement: options.acknowledgement.spec,
  200 |           verifications: options.verifications.map((v) => v.spec),
  201 |           views: [],
  202 |         };
  203 |         for (const [index, view] of options.views.entries()) {
  204 |           const page =
  205 |             typeof view.page === "function" ? view.page() : view.page;
  206 |           for (const check of view.verifications ?? [])
  207 |             await test.step(`${view.player}: ${check.spec}`, check.check);
  208 |           const stem = `${String(this.story.entries.length + 1).padStart(3, "0")}-${id}-${index + 1}-${safe(view.player)}.png`;
  209 |           await test.step(
  210 |             `${view.player}: settled, contained, exact capture`,
  211 |             async () => {
  212 |               await page.bringToFront();
  213 |               await page.mouse.move(0, 0);
  214 |               for (const primary of view.primary ?? []) {
  215 |                 await expect(primary).toBeVisible();
  216 |                 const box = await primary.boundingBox(),
  217 |                   viewport = page.viewportSize()!;
  218 |                 expect(box).not.toBeNull();
  219 |                 expect(box!.x).toBeGreaterThanOrEqual(0);
> 220 |                 expect(box!.y).toBeGreaterThanOrEqual(0);
      |                                ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  221 |                 expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  222 |                 expect(box!.y + box!.height).toBeLessThanOrEqual(
  223 |                   viewport.height,
  224 |                 );
  225 |               }
  226 |               await page.evaluate(captureReady, view.motionInspection ?? []);
  227 |               await page.evaluate(assertScreenFit, { surface: view.surface });
  228 |               expect(
  229 |                 await page.evaluate(() => ({
  230 |                   dpr: devicePixelRatio,
  231 |                   locale: navigator.language,
  232 |                   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  233 |                   reducedMotion: matchMedia("(prefers-reduced-motion: reduce)")
  234 |                     .matches,
  235 |                 })),
  236 |                 "Actual page renderer matches the declared capture environment",
  237 |               ).toEqual({
  238 |                 dpr: 1,
  239 |                 locale: "en-US",
  240 |                 timezone: "UTC",
  241 |                 reducedMotion: !view.normalMotion,
  242 |               });
  243 |               const settings = renderer(page, this.info);
  244 |               this.story.renderer = settings;
  245 |               const name = [
  246 |                 this.story.metadata.id,
  247 |                 this.info.project.name,
  248 |                 platform(),
  249 |                 stem,
  250 |               ];
  251 |               const featureLocal = this.info.file.includes("/tests/e2e/");
  252 |               const baseline = baselinePath(this.info, name),
  253 |                 manifest = join(dirname(baseline), "renderer.json");
  254 |               if (mode() === "verify") {
  255 |                 if (!existsSync(baseline) || !existsSync(manifest))
  256 |                   throw new Error(
  257 |                     `Missing reviewed baseline/renderer: ${baseline}. Generate candidates separately; verification never writes expected images.`,
  258 |                   );
  259 |                 expect(
  260 |                   settings,
  261 |                   "Pinned renderer must match the reviewed baseline",
  262 |                 ).toEqual(JSON.parse(readFileSync(manifest, "utf8")));
  263 |               }
  264 |               const renderSamples: unknown[] = [];
  265 |               const sampleRender = async () => {
  266 |                 if (process.env.CLUSTER_RENDER_TELEMETRY === "1")
  267 |                   renderSamples.push(
  268 |                     await page.evaluate(
  269 |                       () =>
  270 |                         (
  271 |                           window as unknown as {
  272 |                             __clusterRenderSample?: () => unknown;
  273 |                           }
  274 |                         ).__clusterRenderSample?.() ?? null,
  275 |                     ),
  276 |                   );
  277 |               };
  278 |               const image = await stableImage(async () => {
  279 |                 await sampleRender();
  280 |                 const captured = await page.screenshot({
  281 |                   animations: "allow",
  282 |                   caret: "hide",
  283 |                   fullPage: false,
  284 |                 });
  285 |                 await sampleRender();
  286 |                 return captured;
  287 |               }, exactPixels);
  288 |               writeFileSync(join(this.story.folder, stem), image);
  289 |               if (process.env.CLUSTER_RENDER_TELEMETRY === "1") {
  290 |                 writeFileSync(
  291 |                   join(
  292 |                     this.story.folder,
  293 |                     stem.replace(/\.png$/, ".render.json"),
  294 |                   ),
  295 |                   JSON.stringify(renderSamples, null, 2),
  296 |                 );
  297 |               }
  298 | 
  299 |               // Observe after capture: diagnostics cannot change the captured pixels.
  300 |               // Preserve this for passing and failing views, independently of baselines.
  301 |               writeFileSync(
  302 |                 join(this.story.folder, stem.replace(/\.png$/, ".layout.json")),
  303 |                 JSON.stringify(await page.evaluate(textLayout), null, 2),
  304 |               );
  305 |               await this.info.attach(`${id} — ${view.player}`, {
  306 |                 body: image,
  307 |                 contentType: "image/png",
  308 |               });
  309 |               if (mode() === "verify") {
  310 |                 const identical = await exactPixels(
  311 |                   image,
  312 |                   readFileSync(baseline),
  313 |                 );
  314 |                 if (!identical && !featureLocal)
  315 |                   expect(image).toMatchSnapshot(name, {
  316 |                     maxDiffPixels: 0,
  317 |                     threshold: 0,
  318 |                   });
  319 |                 expect(
  320 |                   identical,
```