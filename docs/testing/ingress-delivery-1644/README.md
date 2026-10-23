# Historical profile ingress delivery

Prompt170 / reviewer16:44 continues the historical run39917587574 investigation while the original PR132 timing observation remains running. This child of PR132 changes only a test-process HTTP observer and its artifact retention. No application fault or root-cause fix is claimed.

## Newly inspected retained evidence

Fresh disk37,113,336KiB exceeded2,359,296KiB gate. Artifact12486095865 was downloaded **once**,48,059,405bytes, SHA256ccee2263400fca1358fa2edadeac082e76eb8f1782dc82d3eaab1c814a236e09, matching GitHub metadata. Only database-debug.log (311,490bytes) and firestore-debug.log (65,701bytes) were extracted. Metadata, inventory, hashes and a [redacted correlation summary](summary.json) are retained here. Original archive/logs remain `/tmp/cluster-ingress-12486095865/`; upstream logs contain identifiers and token-related messages and are not copied into this new diagnostic report.

The failed command is the initial authenticated `profile.set`, expectedRevision0, in the four concurrent `saveIdentity` calls for `fleet cancellation mock`, source9f889ead. Exact command/owner/digest remain in the [original retained report](../ingress-39917587574/README.md). Source `saveIdentity` awaits one RTDB `set` before entering receipt polling; reaching the receipt timeout establishes that the SDK write promise resolved. The diagnostic HTTP200 is a **later read of persisted ingress**, not a captured write-response frame. No separate client acknowledgement timestamp was retained.

Database line430 records this exact event as `TRIGGERED`, evaluated07:31:06.361UTC and logged07:31:06.362, for `processProfile`. There are114 unique profile-trigger event IDs and113 matching handler-entry event IDs; the target is the sole unmatched event. No target handler-entry, transaction-settled or failure record appears. The three adjacent identities enter and settle successfully. Target profile/head and receipt read404 at the existing20-second assertion; browser execution never started. Private-view recovery therefore stopped before any acknowledged profile revision, not after a saved revision was lost.

At07:31:06.371, `GCFEmulatorPublisher` reports `java.net.SocketException: Connection reset`. Its log names only the namespace: **it does not carry an event ID**. The pinned RTDB4.11.2 publisher sends the event bytes/attributes to the Functions HTTP route, logs a failed future and propagates it. This supports a transport-delivery failure near the missing event, but temporal adjacency and aggregate counts do not prove that this reset belongs to that event or identify the resetting side. The database's TRIGGERED audit does not prove HTTP acceptance or worker dispatch.

The archive contains no firebase-debug.log, so the Functions HTTP/queue/worker boundary remains unavailable for this historical run. Firestore logs corroborate the diagnostic not-found reads; they contain no target write/handler evidence. No app rejection, lease issue, corruption, watcher restart or missing authentication is established. The original failure and prior report remain preserved.

## Smallest next observation

`scripts/profile-ingress-observer.mjs` is loaded only by the explicit demo `firebase emulators:exec` CLI in application CI. It observes loopback port15001 POSTs for the exact demo processProfile route. It reads only binary CloudEvent `ce-id`/`ce-ref`, emitting domain-separated SHA256 tags; malformed/absent metadata produces no invented correlation. These tags can be derived from existing database audit/handler metadata without adding user-handler logs.

It records request arrival and response finish/status or premature response close, with sequence/duration. It never subscribes to data, reads/copies bodies, changes headers, replaces service results, sends requests, or adds retries. Native HTTP receiver/arguments/return remain intact. Record cap512 plus one explicit limit marker bounds output; diagnostic I/O failure disables logging with a fixed warning rather than affecting HTTP. The CLI's worker children do not install the observer. Existing client/reducer/receipt and authenticated privacy/concurrency tests remain unchanged.

This distinguishes a triggered event with no observed HTTP arrival from an arrived event with a closed/finished response and missing handler entry. An HTTP finish still is not a profile receipt or proof of client receipt. Unknown tags, cap exhaustion, lost logs and pre-HTTP socket failure remain explicit limits. No raw firebase-debug retention, payload/identity/key/token logging or proxy is added.

## Validation and gates

Established offline Nix only. Three focused Node tests pass using real loopback HTTP: body/header/status/response preservation, unrelated-project exclusion, arrival/finish/abort correlation, descriptor restoration, metadata bounds/redaction and record cap. The complete policy suite and four no-browser baseline-path cases pass. These validate instrumentation, **not emulator delivery or player recovery acceptance**. No local emulator/browser/probe rerun, story changes, clock injection, baseline changes or deadline relaxation.

The child's normal application CI supplies the next observation; no manual rerun requested. At the last read, original PR13240020084890 and PR13140018251102 were still running. Their timing and cold-phone outcomes remain separate priority gates. Full visual/Linux/hosted/KMS, historical ingress and release acceptance remain open. No merge, rule approval or baseline promotion.
