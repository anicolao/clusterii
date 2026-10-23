<script lang="ts">
  import { rules } from "@shared/rules";
  let { navigation }: { navigation?: number } = $props();
</script>

<details class="route-rules">
  <summary>Route rules</summary>
  <p class="scope">
    The campaign continues. Development rules remain under review.
  </p>
  <h3>Range and speed</h3>
  <p>
    {#if navigation !== undefined}Navigation level {navigation} reaches {navigation *
        rules.navigationLyPerLevel} light years per leg.{/if} Each level adds {rules.navigationLyPerLevel}
    light years of range; it does not increase speed. A leg exactly at the limit is
    reachable. Displayed distances are rounded; route validation uses the full distance.
  </p>
  <p>
    Fleets travel {rules.fleetSpeedLyPerTick} light years per tick. Divide each leg's
    distance by that speed and round up, with at least one tick per leg. Each intermediate
    waypoint adds a stop before the next eligible departure.
  </p>
  <h3>Review before sending</h3>
  <p>
    Choose up to {rules.maximumWaypoints} waypoints. Consecutive waypoints must differ,
    and the final destination must differ from the origin. Every leg must be in range.
    Your route is checked when you send it and again before each departure.
  </p>
  <h3>Drafts and orders</h3>
  <p>
    Selecting waypoints moves no forces. Discard draft clears only your unsent
    route. Send fleet requests an order; wait for its acknowledgement before
    treating it as accepted. Cancel order is a separate action in Fleet
    preparation, available only before its cancellation cutoff. Traveling fleets
    cannot be redirected or canceled. Pauses preserve routes and delay progress.
  </p>
  <h3>Arrival and uncertainty</h3>
  <p>
    Ownership and defenders may have changed since the last observation.
    Nonallied arrivals resolve combat automatically. Fighters contest orbit;
    surviving infantry are needed to claim a surface. Winning orbit alone does
    not give you the surface. Review the recorded arrival outcome before making
    another plan.
  </p>
</details>

<style>
  .route-rules {
    border: 1px solid #466573;
    margin: 16px 0;
    background: #0b202c;
    line-height: 1.5;
  }
  summary {
    min-height: 44px;
    padding: 12px;
    cursor: pointer;
    color: #bceff2;
    font-weight: 700;
  }
  summary:focus-visible {
    outline: 3px solid #e9cb85;
    outline-offset: -3px;
  }
  h3,
  p {
    margin: 12px;
  }
  h3 {
    font-size: 1.1em;
    color: #e9cb85;
  }
  .scope {
    color: #bceff2;
  }
  @media (min-width: 2300px) {
    summary {
      min-height: 64px;
    }
  }
</style>
