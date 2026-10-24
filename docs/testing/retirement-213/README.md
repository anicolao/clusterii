# Responsibility and retirement — Prompt213

App source: campaign route onMount disposer stops account/membership/directory/view/receipt observers and fences async continuation; account changes also stop them. session/campaign-session return actual SDK onSnapshot unsubscribers. BrowserContext.close in the existing story finally ends the renderer; it is not a Svelte component unmount, and does not call these disposers. Adding sign-out or suppressing subscriptions during gameplay would change the scenario, not fix the responsible transport boundary.

Pinned Firebase SDK4.16.0: remoteStoreUnlisten sends removeTarget on the active watch stream. SDK terminate closes remote network/WebChannels and event manager; it does not issue individual removeTarget messages. Pinned emulator1.22.0: removeStream removes targets, but CloudFirestoreV1ListenStream.onError(CANCELLED) returns and onCompleted forwards completion without invoking removeStream. GrpcAdapter bidi only wraps response and forwards router.listenStream. This source evidence does not exclude another external cleanup path; a real SDK control probe is needed before declaring cause.

Official upstream check2026-10-24: latest published firebase-tools v15.34.1 (2026-10-22) downloadableEmulatorInfo.json still declares1.22.0 and exactly9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c. Thus upgrading CLI15.25.0→15.34.1 would not supply a changed emulator. No upgrade/install or patched server semantics performed.

## One bounded control probe before correction

Fresh owned demo emulators, unchanged hash-guarded observer. Real Firebase SDK/Auth/Firestore rules/Functions/Rtdb profile commands: a developer query listener stays live while controller profile command0 receives accepted digest-bound receipt. Await SDK terminate on that query client, then acknowledged command1 measures remaining registrations. Another developer query subscribes; command2 captures it live; unsubscribe plus actual authorized read, then command3. Await its termination and command4. Foreign profile read must still fail. No campaign data injection, shared-state deletion, artificial sleep, tick batching, changed authorization or live-listener suppression. This is Node SDK service scope, not browser-mounted acceptance; the same emulator watch/cancel implementation is exercised. Whole probe30s. Existing stories/production/workflows unchanged.

Expected distinction: if SDK termination retires the target, the next accepted command's notification count returns to baseline. If termination leaves it but explicit unsubscribe removes the second target, the emulator disconnect path is implicated rather than missing client unsubscribe logic during active routes. If neither retires, inspect actual protocol/ordering rather than assert success. Record source before one run and retain failure if any. No Linux pair is dispatched absent a justified correction.

## Executed result and responsibility

Executed once at clean source 96f081d84d3278c232a0b2d56e7e6ffb866d022f. The real service control passed all 16 assertions in 1.78 seconds (2.00 seconds including test startup), within the unchanged 30-second bound. Five observer transformations verified; no unavailable/cap record. Raw redacted measurements, phase markers, source hashes and bounded outcome are retained alongside this report. Original full logs remain at the paths in originals.json.

| Acknowledged-write observation | Query targets | Streams |
| --- | ---: | ---: |
| First listener live | 1 | 2 |
| After awaited first SDK termination | 1 | 2 |
| Second listener live | 2 | 3 |
| After second listener explicitly unsubscribes and completes authorized read | 1 | 3 |
| After second SDK termination | 1 | 3 |

All five encrypted profile commands retained accepted digest-bound receipts/revisions. Foreign profile access was denied. The extra stream includes document subscriptions; query and stream counts are distinct. The authorized read is an actual request, not a timed sleep or artificial queue drain. Notification work in this profile-only control does not measure directory-mutation query cost. Existing Linux pair212 supplies the separate 28-versus-14 target and query-work evidence.

This establishes a reproducible retirement discrepancy at the SDK/emulator transport boundary: the next real writes still see the terminated client's query, while explicit unsubscribe removes the second query. It does not prove permanent retention, exact browser transport equivalence, or that all historical 512–597ms post-marker cost comes from this discrepancy. The local SDK uses gRPC; browser WebChannel shutdown is a related but different transport. No application lifecycle defect was demonstrated: mounted route/account cleanup already calls real unsubscribers. Abrupt browser-worker teardown does not execute Svelte disposers.

## Supported correction blocker

The latest published official Firebase CLI v15.34.1 still selects the exact pinned Firestore 1.22.0 jar and SHA256. See retained upstream metadata and release notes, and [official emulator manifest](https://github.com/firebase/firebase-tools/blob/v15.34.1/src/emulator/downloadableEmulatorInfo.json). A CLI upgrade therefore provides no changed retirement implementation. No supported corrected emulator artifact has been established by this investigation.

The disassembled CANCELLED/completion paths do not directly retire the stream; removeStream does remove targets. This, combined with the control, supports an upstream retirement reproduction. It does not justify changing half-close semantics, injecting removeStream, or substituting a modified emulator as though it were supported. No upstream issue was posted and no external fix is claimed.

Consequently there is no justified production patch or corrected Linux pair to run yet. An explicit browser sign-out/navigation workaround would change the tested journey and mask the transport boundary. A supported upstream correction or further concrete transport-path evidence is required before claiming retirement fixed. Existing real gameplay listeners, authorization, transaction semantics, deadlines, references and required workflows are unchanged. PR140 remains d0804122: application SUCCESS, strict FAILURE; this probe does not change either result.

Environment: established offline Nix, Java 21.0.11, Node 24.18.0, Bun 1.3.13. Functions declares Node22; the emulator's retained warning reflects use of Nix Node24, not a host-tool substitution. This is local Node-SDK service evidence, not Linux/browser/release approval.

## Reproduction and evidence boundary

At source 96f081d8 with the existing pinned dependencies and owned emulator ports, the single control entry is:

```sh
nix develop --offline --option substitute false --option max-jobs 0 /tmp/pantheon-nix-env --command bash scripts/query-observer/observe-retirement.sh /tmp/cluster-retirement-UNIQUE
```

The runner requires a fresh output directory and clean source, builds serially, checks the pinned jar and five observer transformations, and executes only tests/emulator-retirement.test.ts. This command documents the completed reproduction; it is not a request to repeat it unchanged. Result postprocessing is scripts/query-observer/summarize-retirement.mjs. The compact committed evidence contains counts/durations/outcomes only; full emulator logs remain locally preserved, not published as identity-bearing payload evidence.
