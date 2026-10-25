# PR63 earliest strict failure diagnosis

Headf8adb007866692870ea2979e2d4108b2bb4bed3b; strict40195147278/job121174278593. One short maintenance003 pixel mismatch53332pixels,40other short journeys passed,2skipped. This first failure masks later maintenance assertions; no complete-family acceptance claimed.

## Original review evidence

- expected: /tmp/cluster-pr63-maintenance-failure/test-results/stories/maintenance.story-The-host-ae89a-resumes-a-waiting-commander-short/maintenance-admission-recovery/short/linux-arm64/003-keyboard-controls-1-maintenance-host-expected.png (SHA256 c9771048d2441b20e001f7f7fa7f6eb6ca1d07cb6e045d9ad72584413fce7c0e)
- actual: /tmp/cluster-pr63-maintenance-failure/test-results/stories/maintenance.story-The-host-ae89a-resumes-a-waiting-commander-short/maintenance-admission-recovery/short/linux-arm64/003-keyboard-controls-1-maintenance-host-actual.png (SHA256 932203f38bf4763abc499f0a94dfb5b81798656461a5e5627bde527c00678510)
- diff: /tmp/cluster-pr63-maintenance-failure/test-results/stories/maintenance.story-The-host-ae89a-resumes-a-waiting-commander-short/maintenance-admission-recovery/short/linux-arm64/003-keyboard-controls-1-maintenance-host-diff.png (SHA256 9ca2b5fe4a8274d0175e9a161d59a902d98be0811d122ec824e4f24cb4d2b408)
- trace: /tmp/cluster-pr63-maintenance-failure/test-results/stories/maintenance.story-The-host-ae89a-resumes-a-waiting-commander-short/trace.zip (SHA256 846adc3fbfdeb0e5c40054180abedc4430ca03693b36a1a6bc16134eaa740592)

Artifact12602750226:4108316743bytes, API digestf50532737dc32003488f0d36c65093db37141fcaf97d2130e1cbaee07e110235. Bounded extraction fetched14676039bytes and retained14selectedfiles. Exact206/Content-Range/immutable size checks, selected ZIP-entry CRC/path safety and file SHA256 verified. Full archive SHA256 was NOT verified because archive was not downloaded; API digest retained as remote identity. Trace nested ZIP CRC verified. Original files remain at /tmp/cluster-pr63-maintenance-failure; no edits/promotions.

Failure manifest executoradbcfd3e0006a16d12f4ba21cb11bfb444cea037 is GitHub merge of05d30b20 andf8adb007. Fetched and verified empty src/tests/scripts/workflows/shared/functions/package/lock delta versusf8adb007. Spec825e5effebcb5a6b820786c7788c6f81d136b1ffd1f4f6a3c715d5e95334aac5 matches head; expected PNG exactly matches head git blob. Dirty:true retained; no complete capture-time clean claim. Renderer LinuxARM pinned image824f1a78, Chromium149.0.7827.0/fontdigest2a55338e,1280x720/DPR1/reduce.

## Cause and disposition

Self-inspected expected/actual/diff individually at1280x720. Expected clips focused Pause button lower border/ring at roster bottom aroundy690. Actual shifts roster reading content upward10px, with button and ring now fully visible (ring bottom approximately686). Outer panel/background remain fixed. This corresponds to PR63 shared maintenance scroll-margin10px.

Trace shows keyboard wrap, Enter disclosure, final Tab (call21455), then focused Pause acknowledgement, guest enabled assertion, readiness/geometry and screenshot. After final Tab roster scrollTop=17. No pause click before failing capture; therefore the acknowledgement callback is not the trigger in this state. Native keyboard focus responds to scroll-margin. The scroll-margin change correctly reserves outline clearance; no evidence supports reverting it or making another source correction. Present actual for independent disposition; do not approve automatically. Later assertions unexecuted in failed journey; any full-family candidate comparison must use complete successful evidence before additional promotion. No new browser run or baseline edit in this diagnosis.

## PR65 upload-only recovery

Run40197661651 attempt1 at48b9f7ca: API marks every preceding step SUCCESS, including Application checks in Nix-provisioned renderer (13:28:42–14:15:54UTC). Only upload-artifact failed after five CreateArtifact request timeouts. Retrieved combined log does not contain the application's detailed body; rely on explicit step conclusion, do not invent test counts. Saved failed upload log and original API metadata before requesting exactly one gh run rerun --failed. Attempt2/job121195721297 nowIN_PROGRESS at same48b9f7ca; strict65 andstrict64 preserved. No source/head update.

PR66 corrected56 remain frozen/unapproved at172a6265; no active66 promotion. Reviewer delegation Prompt359 and main meta PR63 strict failure and PR65 upload failure, plus preceding PR66 label source checkpoint, reconciled. No GitHub merge or threshold/deadline changes.
