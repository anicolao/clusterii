# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser/zero-science.story.spec.ts >> Live zero science after orbital loss preserves private research
- Location: tests/browser/zero-science.story.spec.ts:58:1

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('complementary', { name: 'Selected system' }).getByRole('button', { name: 'Fleets · 0', exact: true })

```

# Test source

```ts
  238 |         count += batch;
  239 |       } while (batch === 96);
  240 |       expect(count).toBe(target - previous);
  241 |       expect(
  242 |         await timing.span("repeat", () => settleCampaignTicks(id, () => due)),
  243 |       ).toBe(0);
  244 |     };
  245 |     await story.harness(
  246 |       "leave-campaign-during-elapsed-time",
  247 |       "Both captured players return through ordinary Campaigns controls while time passes; setup-only witnesses close after admission. No service delivery or authorization is bypassed.",
  248 |       async () => {
  249 |         for (const p of [owner, peer]) await button(p, "Campaigns").click();
  250 |         for (const context of contexts.slice(2)) await context.close();
  251 |       },
  252 |     );
  253 |     await story.harness(
  254 |       "earn-navigation",
  255 |       "Deliver100 real leased ticks in bounded batches. No levels, balances, forces or ownership are injected; this is not hosted scheduling.",
  256 |       () => settle(100),
  257 |     );
  258 |     await story.harness(
  259 |       "recover-earned-campaign",
  260 |       "Both real saved identities reopen the exact campaign after elapsed-time settlement.",
  261 |       async () => {
  262 |         for (const p of [owner, peer]) {
  263 |           await p.goto(url);
  264 |           await expect(inspector(p)).toBeVisible();
  265 |         }
  266 |       },
  267 |     );
  268 |     const prepared = await Promise.all([0, 1, 2, 3].map(published));
  269 |     const homes = prepared.map((v) => v.own.home!),
  270 |       stars = prepared[0].stars;
  271 |     const star = (id: string) => stars.find((s) => s.id === id)!;
  272 |     expect(prepared[0].economy!.research.levels.navigation).toBe(3);
  273 |     const pending = [{ id: homes[1], path: [] as string[], cost: 0 }],
  274 |       seen = new Set<string>();
  275 |     let route: string[] | undefined;
  276 |     while (pending.length) {
  277 |       pending.sort((a, b) => a.cost - b.cost);
  278 |       const current = pending.shift()!;
  279 |       if (seen.has(current.id)) continue;
  280 |       seen.add(current.id);
  281 |       if (current.id === homes[0]) {
  282 |         route = current.path;
  283 |         break;
  284 |       }
  285 |       for (const candidate of stars) {
  286 |         if (
  287 |           seen.has(candidate.id) ||
  288 |           (homes.includes(candidate.id) && candidate.id !== homes[0])
  289 |         )
  290 |           continue;
  291 |         const length = distance(star(current.id), candidate);
  292 |         if (length <= 30)
  293 |           pending.push({
  294 |             id: candidate.id,
  295 |             path: [...current.path, candidate.id],
  296 |             cost: current.cost + Math.ceil(length / 2) + 1,
  297 |           });
  298 |       }
  299 |     }
  300 |     expect(route).toBeDefined();
  301 |     const legs = routePreview(stars, homes[1], route!, 3);
  302 |     expect(legs.every((l) => l.reachable)).toBe(true);
  303 |     const travel = legs.reduce((n, l) => n + l.ticks + 1, 0);
  304 |     expect(travel).toBeLessThanOrEqual(104);
  305 |     const escape = stars
  306 |       .filter(
  307 |         (s) =>
  308 |           !homes.includes(s.id) &&
  309 |           !route!.includes(s.id) &&
  310 |           distance(s, star(homes[0])) <= 30,
  311 |       )
  312 |       .sort(
  313 |         (a, b) => distance(a, star(homes[0])) - distance(b, star(homes[0])),
  314 |       )[0];
  315 |     expect(escape).toBeDefined();
  316 |     const privateCheck = {
  317 |       spec: "Each authenticated projection omits the other commander's private order IDs; no application errors occur.",
  318 |       check: async () => {
  319 |         expect(errors).toEqual([]);
  320 |         const state = await canonical();
  321 |         for (const seat of [0, 1]) {
  322 |           const own = await published(seat);
  323 |           for (const order of state.military?.orders ?? [])
  324 |             if (order.uid !== state.seats[seat].uid)
  325 |               expect(JSON.stringify(own.military)).not.toContain(order.id);
  326 |         }
  327 |       },
  328 |     };
  329 |     for (let seat = 0; seat < 2; seat++) {
  330 |       const p = pages[seat];
  331 |       await story.step(`form-${seat}`, {
  332 |         actor: aliases[seat],
  333 |         description:
  334 |           "Use the actual home-system fleet controls to reserve all160 earned fighters. The other commander's order remains private.",
  335 |         action: async () => {
  336 |           await inspector(p)
  337 |             .getByRole("button", { name: "Fleets · 0", exact: true })
> 338 |             .click();
      |              ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  339 |           await panel(p).getByLabel("Fighters", { exact: true }).fill("160");
  340 |           await panel(p).getByLabel("Infantry", { exact: true }).fill("0");
  341 |           await button(p, "Form fleet").focus();
  342 |           await expectReadingTarget(button(p, "Form fleet"));
  343 |           await button(p, "Form fleet").press("Enter");
  344 |         },
  345 |         acknowledgement: {
  346 |           spec: "A real receipt accepts160 fighters for tick101.",
  347 |           check: async () => {
  348 |             await expect(
  349 |               panel(p)
  350 |                 .getByRole("status")
  351 |                 .filter({ hasText: "Fleet order accepted." }),
  352 |             ).toBeVisible();
  353 |             await expect(orders(p)).toContainText(
  354 |               "Form · 160 fighters · 0 infantry · tick 101",
  355 |             );
  356 |             await read(p, orders(p));
  357 |           },
  358 |         },
  359 |         verifications: [privateCheck],
  360 |         views: [{ page: p, player: aliases[seat], surface: "game" }],
  361 |       });
  362 |     }
  363 |     await story.harness(
  364 |       "form-at-101",
  365 |       "Real leased settlement forms both fleets once; repeat delivery does no work.",
  366 |       () => settle(101),
  367 |     );
  368 |     await story.step("formed-fleets", {
  369 |       actor: aliases[0],
  370 |       description:
  371 |         "Select each acknowledged fleet with the keyboard and read its actual160-fighter complement.",
  372 |       action: async () => {
  373 |         for (const p of [owner, peer]) {
  374 |           const f = panel(p).getByRole("button", {
  375 |             name: /^Fleet [0-9]+$/,
  376 |             exact: true,
  377 |           });
  378 |           await expect(f).toHaveCount(1);
  379 |           await f.focus();
  380 |           await f.press("Enter");
  381 |           await read(
  382 |             p,
  383 |             manifest(p).getByRole("status").filter({ hasText: "Fleet formed" }),
  384 |           );
  385 |         }
  386 |       },
  387 |       acknowledgement: {
  388 |         spec: "Both players see the settled formation outcome.",
  389 |         check: async () => {
  390 |           for (const p of [owner, peer])
  391 |             await expect(
  392 |               manifest(p)
  393 |                 .getByRole("status")
  394 |                 .filter({ hasText: "Fleet formed" }),
  395 |             ).toHaveText("Fleet formed · 160 fighters · 0 infantry.");
  396 |         },
  397 |       },
  398 |       verifications: [privateCheck],
  399 |       views: views(),
  400 |     });
  401 |     const routeIds: string[] = [];
  402 |     for (let seat = 0; seat < 2; seat++) {
  403 |       const p = pages[seat],
  404 |         waypoints = seat === 0 ? [escape.id] : route!;
  405 |       const planner = p.getByRole("region", {
  406 |         name: "Fleet route planner",
  407 |         exact: true,
  408 |       });
  409 |       const send = planner.getByRole("button", {
  410 |         name: "Send fleet",
  411 |         exact: true,
  412 |       });
  413 |       await story.step(`preview-route-${seat}`, {
  414 |         actor: aliases[seat],
  415 |         description:
  416 |           seat === 0
  417 |             ? "Plot an escape to a neutral star without a science station."
  418 |             : "Plot a seven-leg route through the actual catalogue toward the other commander's home.",
  419 |         action: async () => {
  420 |           await button(p, "Plot route").focus();
  421 |           await button(p, "Plot route").press("Enter");
  422 |           for (const id of waypoints) {
  423 |             const name = star(id).name;
  424 |             await planner
  425 |               .getByRole("searchbox", { name: "Find a waypoint" })
  426 |               .fill(name);
  427 |             const add = planner.getByRole("button", {
  428 |               name: `Add ${name} waypoint`,
  429 |               exact: true,
  430 |             });
  431 |             await add.focus();
  432 |             await add.press("Enter");
  433 |           }
  434 |           await send.focus();
  435 |         },
  436 |         acknowledgement: {
  437 |           spec: "Reachable legs enable commitment; range30 and speed2 remain distinct.",
  438 |           check: async () => {
```