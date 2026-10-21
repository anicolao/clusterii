<script lang="ts">
  import type { CampaignView } from "@shared/campaign";
  import { fleetPosition } from "@shared/travel";
  import { distance } from "@shared/galaxy";
  import { detectionProbability } from "@shared/observations";
  let { view, starId }: { view: CampaignView; starId: string } = $props();
  const star = $derived(view.stars.find((star) => star.id === starId)!);
  const report = $derived(view.observations?.[starId]);
  const level = $derived(view.economy?.research.levels.scanning);
  const sources = $derived(
    view.stars.filter((star) =>
      view.holdings.some(
        (holding) => holding.starId === star.id && holding.orbit === "You",
      ),
    ),
  );
  const range = $derived(
    sources.length || (view.travelEnabled && view.military?.fleets.length)
      ? Math.min(
          ...sources.map((source) => distance(source, star)),
          ...(view.travelEnabled
            ? (view.military?.fleets ?? []).map((f) => {
                const p = fleetPosition(
                  f,
                  view.stars,
                  view.production?.tick ?? 0,
                );
                return Math.hypot(p.x - star.x, p.y - star.y, p.z - star.z);
              })
            : []),
        )
      : null,
  );
  const chance = $derived(
    level !== undefined && range !== null
      ? detectionProbability(level, range)
      : null,
  );
  const age = $derived(
    report ? (view.production?.tick ?? 0) - report.observedTick : null,
  );
  const source = $derived(
    report ? view.stars.find((star) => star.id === report.sourceStarId) : null,
  );
</script>

<section class="observation" aria-label="Stellar observation">
  <h3>Observation</h3>
  {#if !view.scanningEnabled}<p>
      This campaign preserves its earlier sensor behavior. Create a new
      development campaign for automatic observations. Your owned layers remain
      current in System.
    </p>
  {:else if view.phase !== "active"}<p>
      Observations begin at the first tick after home assignment.
    </p>
  {:else}
    <p class="age" role="status" aria-label="Observation age">
      {report
        ? age === 0
          ? `Current observation · tick ${report.observedTick}`
          : `Last observed ${age} ${age === 1 ? "tick" : "ticks"} ago · tick ${report.observedTick}`
        : "— Unknown · no observation acquired"}
    </p>
    {#if report}<p class="source">
        Observed from {report.sourceStarId === null
          ? "your fleet sensors"
          : source?.name}.
      </p>
      <dl>
        <div>
          <dt>Orbit owner</dt>
          <dd>{report.orbit}</dd>
        </div>
        <div>
          <dt>Surface owner</dt>
          <dd>{report.surface}</dd>
        </div>
        <div>
          <dt>Stationed fighters</dt>
          <dd>{report.fighters}</dd>
        </div>
        <div>
          <dt>Stationed infantry</dt>
          <dd>{report.infantry}</dd>
        </div>
        <div>
          <dt>Markets</dt>
          <dd>{report.markets}</dd>
        </div>
        <div>
          <dt>Training camps</dt>
          <dd>{report.camps}</dd>
        </div>
        <div>
          <dt>Bases</dt>
          <dd>{report.bases}</dd>
        </div>
        <div>
          <dt>Space stations</dt>
          <dd>{report.stations}</dd>
        </div>
      </dl>
      <p>
        {age === 0
          ? "These facts were acquired at the last confirmed tick."
          : "These are historical facts. Ownership and forces may have changed."}
      </p>{:else}<p>
        Ownership, completed developments and stationed forces remain unknown
        until an observation succeeds.
      </p>{/if}
    <section aria-label="Scanning capability">
      <h4>Your scanning</h4>
      {#if chance !== null}<p>
          Level {level} · nearest orbital sensor {range!.toFixed(1)} light years away.
        </p>
        <p>
          {(chance * 100).toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}% acquisition probability each tick.
        </p>{:else}<p>
          No orbital or fleet sensor source is available. Surface control alone
          does not provide scanning.
        </p>{/if}
      <p>
        Scans happen automatically. A missed scan preserves the last report; it
        does not mean the system is empty. Owned layers remain current in
        System.
      </p>
    </section>
  {/if}
</section>

<style>
  .observation {
    line-height: 1.5;
  }
  h3 {
    font:
      500 28px "Cormorant Garamond",
      serif;
    margin: 12px 0;
  }
  h4 {
    font-size: 18px;
    margin: 20px 0 6px;
  }
  .age {
    position: sticky;
    top: 0;
    background: #07131c;
    padding: 8px 0;
    z-index: 1;
    color: #7ce9fa;
  }
  .source {
    color: #c5d1d4;
    font-size: 14px;
  }
  dl {
    margin: 16px 0;
    display: grid;
    gap: 10px;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  dt {
    color: #ced7d9;
  }
  dd {
    margin: 0;
    font-weight: 700;
    overflow-wrap: anywhere;
    text-align: right;
  }
  p {
    margin: 12px 0;
  }
  @media (min-width: 2400px) {
    h3 {
      font-size: 36px;
    }
    h4 {
      font-size: 24px;
    }
    .source {
      font-size: 18px;
    }
  }
</style>
