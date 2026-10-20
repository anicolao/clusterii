# Campaign recovery and chart navigation

This slice extends the development campaign interaction with a private membership directory, direct campaign URLs, stellar-class filtering and keyboard camera controls. It preserves the accepted full-screen galaxy composition and adds no gameplay rules.

Joining, leaving and scheduled start update each member’s directory index in the same authoritative transaction as campaign state and private views. Only the matching developer account can read its index; clients cannot write it. Public metadata does not expose membership identifiers. Private view access remains enforced independently of this directory.

The directory separates your campaigns from waiting campaigns you can join. Selecting a campaign writes its canonical ID to the base-aware query URL. Reload recovers the authorized view; an absent campaign offers a return to the directory. Shared URLs do not grant access. Signed-out recipients must establish their identity before reopening the link; automatic sign-in return is not yet implemented.

The systems panel filters the actual catalogue by class and name. The selected system remains visible on the chart even when excluded by the filter. Center selected, Center home, Overview, zoom and orbit operate the same Three.js camera as pointer gestures. Center home stays disabled before home assignment. Camera actions close the panel and restore focus to its opener. No motion is required to reach the camera outcome, including with reduced motion.

## Acceptance

Service coverage checks membership creation/deletion and denial of cross-account reads and client writes. Browser coverage exercises filtering, keyboard camera activation, focus restoration, URL reload, directory recovery and leave at phone, desktop, 4K and short desktop sizes. Production controls also appear in the gallery. Retained captures require independent rendered review.

This remains a partial milestone 2/3 increment. Hosted Google login, hosted scheduled starts, real-mode encryption, mode migration, bounded history recovery, ongoing ticks and automatic lobby replenishment remain separate work. No public campaign security is claimed for development mock mode.

Local validation: six reducer/codec tests (94 assertions), three emulator service tests (63 assertions), nine affected browser journeys, type checking and lint pass. The final browser run verifies that orbit changes the rendered selected-star position and that phone navigation clears the command rail. [Four-size navigation captures](../ux/reviews/campaign-navigation/) are retained for independent review, not treated as approved baselines. Production had no campaign records before the index deployment, so no existing membership records required backfill.
