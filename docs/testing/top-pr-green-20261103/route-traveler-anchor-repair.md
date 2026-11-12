# Route traveler anchor repair

Desktop retained originals in run43125630873 exposed clipped traveling Fleet7 markers in paused-travel023/026 and interrupted-route031. These hashes remain held; they were not promoted. The previous interrupted-route031 reference shows the fleet marker inside its chart.

Scene applied a fixed0.08 world-Y elevation to every traveler. Tight route framing fits unchanged catalogue endpoints. With the actual fleetRouteFrame and Three projection, a level3.5ly route at1440/540 aspect projects its true origin at x=-0.68. The elevated marker projects at x=-1.041752911940217, outside the chart. This is measured geometric reproduction, not a timing hypothesis.

Route markers now use the true interpolated fleet world coordinate. Existing screen-space label separation remains; overview/contact placement retains its original0.08 elevation. No star, fleet state, route, reducer, intelligence, test deadline, assertion or comparator changes.

Nix validation:16 framing/travel tests passed with2920 assertions. Regression checks interpolated positions at five fractions across four chart aspects and confirms the legacy elevation escapes the desktop chart. Type/Svelte check passed with0errors and the previously existing FleetRoute noninteractive-keydown warning. Story policy and focused formatting checked separately. Real pinned-Linux capture validation remains required; this source patch does not approve new images or establish full CI green. Short/large retained route originals remain unreviewed.
