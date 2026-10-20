# Retry transport and command effects

PR #7 CI run 39498918915 failed an assertion requiring exactly one transport frame. Inspection of its retained Playwright trace confirms request numbers 5 and 7 carry the same profile command path/UUID and identical encrypted payload. This is transport retransmission, not evidence of two logical commands.

The browser test now requires at least one observed frame, exactly one logical path/command identity, identical payloads across every frame, one additional persisted profile revision and immutable version, one additional accepted receipt bound to that command, and the preserved draft after recovery/reload. It reads emulator storage for verification without injecting state. The final affected run passed in 21.9 seconds; retained semantic evidence is in docs/ux/reviews/recovery/idempotent-reconnect.json. The earlier two-frame CI trace remains the reproduction of transport retransmission.

These checks permit transport delivery retries while still detecting duplicate commands, payload mutation, duplicate effects or draft loss. Replacement CI remains a gate; no production reducer or ingress behavior changed.
