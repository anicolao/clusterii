

## Supervisor rejects computed-style-only focus acceptance

Run40332542039SUCCESS and all four durable facts confirm focus-visible plus solid2px cyan inset outline. However independently viewed phone013 still lacks a visible cyan dialog boundary. Passing style assertions do not establish visual acceptance. Children painting over the outline is the working rendering diagnosis; source review found no harness blur/focus operation and verified recovery ends with the dialog focused. Add a pointer-events:none absolute inset2px cyan border pseudo-element above dialog contents, restricted to the actual construction dialog focus-visible state. This preserves layout and click targets; pending fresh render verification. Do not accept initial inset fix based on computed values alone.
