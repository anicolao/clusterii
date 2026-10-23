# Scheduled status and real boundary identity

Reviewer05:12 requests whole-path correction on PR117. Run[39927177999](https://github.com/anicolao/clusterii/actions/runs/39927177999), source5178d6c, passed the waiting-region/full-roster assertion but failed `production.spec.ts:19` after5,000ms: the status filtered by `/^Starts /` was absent. The full failed-step log remains `/tmp/cluster117-0512-application-failure.log`, SHA2568c62ed0305196f82a5532fa987eb16b9437d336be87d1a099a61c9e9de792597. Exact source metadata accompanies this report. This is separate from the previous missing dock and unresolved profile ingress failures.

## Diagnosis

The final admission-related calls in the retained log run around09:10:00–04UTC; failure is09:10:13. Given ordinary real clocks and the actual reducer's next-quarter-hour scheduling, these times support a future09:15 start, not the already-due branch. This is source/timeline inference: the stored start and browser DOM were not retrieved from an artifact under the disk gate.

Static server compilation/rendering of the actual predecessor CampaignStartStatus with a future scheduled time produces `Starts\n    <localized date>.\n    The server assigns…`. The exact `/^Starts /` is false, while normalized text matches; see `prior-static-text.json`. Installed Playwright's regex matcher uses full element text, unlike normalized string matching. This demonstrates a concrete whitespace-sensitive selector defect without claiming a new browser reproduction.

The broader audit found two additional deterministic hazards: a due scheduled campaign replaces “Starts” with “Awaiting home assignment” and omits its timestamp; calculating the *next* quarter-hour from current time can wait an unnecessary extra tick if the recorded boundary has already passed. Parsing a localized date from prose also unnecessarily depends on date formatting and text-node whitespace.

## Correction

CampaignStartStatus names its status `Campaign start` and exposes the actual authorized start as visible semantic `<time datetime="ISO">` in future, overdue and active branches. The overdue branch retains the saved-seat message and now states its recorded scheduled time. No start is invented for an unfilled roster. CampaignEconomy's production schedule similarly exposes the recorded nextTickAt in both future and due branches. Human dates remain localized; machine identity is ISO and timezone-independent. These are player-readable timestamps, not hidden testing state.

The procedural journey reads the visible named status/time rather than matching raw prose. Its enclosing waiting manifest and full roster still establish pre-start context; paused/unscheduled states cannot satisfy the required visible time. It validates the ISO value, waits until that recorded instant (or delivers immediately if already due, retaining the existing100ms boundary buffer), and still requires actual Roster/Began acknowledgement. Each player's first-production timestamp must equal the recorded start plus900,000ms and its displayed date must match. First production delivery uses that same fixed target rather than recomputing a new quarter-hour. No fake clock or inferred server acknowledgement is used.

Total33-minute deadline,5-second assertions, retries0, scheduler HTTP actions, first-production pending, all production/credits/science/research/construction/recovery/geometry assertions and the shared navigation helper remain unchanged. The only later-path edit is anchoring the existing production wait to its already-recorded target. The explicit Prompt142 compatibility record preserves the prior manifest hash and does not claim illustrated migration.

## Static validation and holds

Nix source-only validation: two tests compile/render the actual CampaignStartStatus and prove future/overdue/begun retain one identical ISO identity with visible localized text, while an unscheduled roster has no invented time. Registered in the existing policy suite. Svelte check0 errors/0 warnings; browser-spec no-emit TypeScript and story-policy checks pass. Logs `/tmp/cluster117-start-time-{static-tests,svelte,types,policy}.log`.

No browser/emulator/artifact archive or unchanged rerun. Disk remains below2,359,296KiB (419,616KiB at static-check boundary). Future timestamp markup and overdue copy require rendered comparison; no baseline promotion or visual acceptance is claimed. Existing32 waiting candidates retain their original source, and all Linux/KMS/hosted, ingress, normal-motion visual and release holds remain. No merge.
