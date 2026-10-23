<script lang="ts">
  import { tick } from "svelte";
  import { base } from "$app/paths";
  import { Canvas } from "@threlte/core";
  import type { CampaignView } from "@shared/campaign";
  import { routePreview, fleetPosition } from "@shared/travel";
  import { rules } from "@shared/rules";
  import Scene from "./galaxy/Scene.svelte";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import RouteRules from "./RouteRules.svelte";
  import { routeForceReview } from "$lib/route-force-review";
  let {
    waypoints = $bindable<string[]>([]),
    view,
    fleetId,
    pending = false,
    busy = false,
    message = "",
    error = "",
    oncommit,
    onclose,
    onretry,
  }: {
    waypoints?: string[];
    view: CampaignView;
    fleetId: string;
    pending?: boolean;
    busy?: boolean;
    message?: string;
    error?: string;
    oncommit: (waypoints: string[]) => void;
    onclose: () => void;
    onretry?: () => void;
  } = $props();
  const fleet = $derived(view.military?.fleets.find((f) => f.id === fleetId));
  const forces = $derived(routeForceReview(view, fleetId));
  let query = $state("");
  let draftNotice = $state("");
  let waypointSearch = $state<HTMLInputElement>();
  async function discardDraft() {
    if (active || pending || busy || !fleet || !waypoints.length) return;
    waypoints = [];
    selected = "";
    query = "";
    draftNotice = "Draft discarded. No fleet order was sent.";
    await tick();
    waypointSearch?.focus();
  }
  let replanning = $state(false);
  const outcome = $derived(
    view.military?.ledger.find(
      (e) =>
        e.fleetId === fleetId &&
        ["arrived", "destroyed", "halted"].includes(e.result),
    ),
  );
  const completed = $derived(!!outcome && !replanning);
  const origin = $derived(view.stars.find((s) => s.id === fleet?.starId));
  const navigation = $derived(view.economy?.research.levels.navigation ?? 0);
  const accepted = $derived(
    view.military?.orders.find((o) => o.fleetId === fleetId && o.waypoints),
  );
  const acceptedLegs = $derived(
    accepted?.waypoints
      ? routePreview(
          view.stars,
          accepted.starId,
          accepted.waypoints,
          navigation,
        )
      : [],
  );
  const committed = $derived(fleet?.travel);
  const preview = $derived.by(() => {
    if (!fleet || !waypoints.length) return [];
    try {
      return routePreview(view.stars, fleet.starId, waypoints, navigation);
    } catch {
      return [];
    }
  });
  const range = $derived(navigation * rules.navigationLyPerLevel);
  const ticks = $derived(
    preview.reduce((n, leg) => n + leg.ticks, 0) +
      Math.max(0, preview.length - 1),
  );
  const active = $derived(!!accepted || committed?.status === "traveling");
  const from = $derived(
    view.stars.find((s) => s.id === (waypoints.at(-1) ?? fleet?.starId)),
  );
  const candidates = $derived(
    view.stars
      .filter(
        (s) =>
          s.id !== from?.id &&
          s.name.toLowerCase().includes(query.toLowerCase()),
      )
      .map((s) => ({
        star: s,
        distance: from
          ? Math.hypot(s.x - from.x, s.y - from.y, s.z - from.z)
          : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance),
  );
  const paths = $derived.by(() => {
    const ids = committed
      ? [
          committed.from,
          committed.to,
          ...committed.waypoints.slice(committed.leg + 1),
        ]
      : accepted
        ? [accepted.starId, ...(accepted.waypoints ?? [])]
        : fleet
          ? [fleet.starId, ...waypoints]
          : [];
    return ids.slice(1).map((id, i) => ({
      from: view.stars.find((s) => s.id === ids[i])!,
      to: view.stars.find((s) => s.id === id)!,
      draft: !committed && !accepted,
    }));
  });
  const travelers = $derived(
    fleet?.travel?.status === "traveling"
      ? [
          {
            id: fleet.id,
            number: fleet.number,
            ...fleetPosition(fleet, view.stars, view.production?.tick ?? 0),
          },
        ]
      : [],
  );
  let selected = $state("");
  function add(id: string) {
    if (
      active ||
      pending ||
      waypoints.length >= rules.maximumWaypoints ||
      id === (waypoints.at(-1) ?? fleet?.starId)
    )
      return;
    draftNotice = "";
    replanning = true;
    waypoints = [...waypoints, id];
    selected = id;
  }
  function move(index: number, delta: number) {
    const next = [...waypoints];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    waypoints = next;
  }
  const invalid = $derived(
    !view.travelEnabled
      ? "Travel is unavailable in this older campaign. Create a new development campaign; your history remains accessible."
      : !fleet
        ? "This fleet is no longer available."
        : view.pausedAt != null
          ? "Campaign paused. Routes and drafts are preserved."
          : active
            ? "An accepted route is already in progress."
            : !preview.length
              ? waypoints.length
                ? "Adjacent waypoints must differ; the final destination must differ from the origin."
                : "Choose at least one waypoint."
              : preview.some((leg) => !leg.reachable)
                ? "A leg exceeds navigation range. Choose a closer waypoint."
                : view.military?.orders.some(
                      (o) =>
                        o.fleetId === fleetId || o.targetFleetId === fleetId,
                    )
                  ? "This fleet has another accepted order."
                  : "",
  );
  function ownership(id: string) {
    const own = view.holdings.find((h) => h.starId === id),
      observed = view.observations?.[id];
    return own?.orbit ?? observed?.orbit ?? "Unknown";
  }
</script>

<section class="route-planner" aria-label="Fleet route planner">
  <div
    class="route-chart"
    data-galaxy-viewport
    aria-label="Route chart. Use waypoint controls for keyboard planning."
  >
    <Canvas renderMode="on-demand"
      ><Scene
        stars={view.stars}
        routeFocus
        selected={selected || fleet?.starId || ""}
        owned={view.holdings
          .filter((h) => h.orbit === "You")
          .map((h) => h.starId)}
        {paths}
        {travelers}
        stellarClass="all"
        cameraRequest={{
          action: "selected",
          starId: fleet?.starId ?? "",
          sequence: 0,
        }}
        onselect={add}
      /></Canvas
    >
    <div class="chart-caption">
      <p>
        {committed?.status === "traveling"
          ? "Traveling"
          : accepted
            ? "Accepted route"
            : completed
              ? "Arrival resolved"
              : "Draft route · dashed"}
      </p>
      <p>
        Range {range} ly per leg · Speed {rules.fleetSpeedLyPerTick} ly/tick
      </p>
    </div>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded route details support keyboard scrolling.) -->
  <div
    class="route-details"
    role="region"
    tabindex="0"
    aria-label="Route details"
  >
    <p class="overline">
      Fleet {fleet?.number ?? "lost"} · {origin?.name ?? "Recorded outcome"}
    </p>
    <div class="manifest">
      <img src={`${base}/art/fleet-preparation.webp`} alt="" />
      <div>
        <h2>
          {completed
            ? "Arrival resolved"
            : active
              ? "Fleet en route"
              : "Plot a course"}
        </h2>
        {#if fleet}<p>
            {fleet.fighters} fighters · {fleet.infantry} infantry aboard
          </p>{/if}
      </div>
    </div>

    {#if forces}<section
        class="force-review"
        aria-label="Confirmed route forces"
      >
        <section aria-label="Fleet transport manifest">
          <h3>Forces to deploy</h3>
          <dl>
            <div>
              <dt>Fighters aboard</dt>
              <dd>{forces.fighters}</dd>
            </div>
            <div>
              <dt>Infantry aboard</dt>
              <dd>{forces.infantry}</dd>
            </div>
            <div class="capacity">
              <dt>Transport capacity</dt>
              <dd>{forces.infantry} / {forces.capacity} infantry</dd>
              <meter
                min="0"
                max={Math.max(1, forces.capacity)}
                value={forces.infantry}
                aria-label="Infantry transport capacity"
              />
            </div>
          </dl>
        </section>
        {#if !committed || committed.status !== "traveling"}<section
            aria-label="Confirmed origin defense"
          >
            <h3>
              Remaining at {origin?.name ?? "origin"}
            </h3>
            <dl>
              <div>
                <dt>Orbit garrison</dt>
                <dd>
                  {forces.orbit === null
                    ? "Unknown"
                    : forces.orbit + " fighters"}
                </dd>
              </div>
              <div>
                <dt>Surface garrison</dt>
                <dd>
                  {forces.surface === null
                    ? "Unknown"
                    : forces.surface + " infantry"}
                </dd>
              </div>
              <div class="capacity">
                <dt>Other own stationed fleets</dt>
                <dd>
                  {forces.otherFighters} fighters · {forces.otherInfantry} infantry
                </dd>
              </div>
            </dl>
            <p>
              Confirmed now; other orders and ticks can change these forces
              before departure. Garrison counts already exclude this fleet.
            </p>
          </section>{/if}
      </section>{/if}
    {#if committed}<p class="outcome" role="status">
        {committed.status === "traveling" ? "Traveling" : "At waypoint"} · {view.stars.find(
          (s) => s.id === committed.to,
        )?.name} · arrival tick {committed.arrivalTick}.
      </p>{:else if accepted}<p class="outcome" role="status">
        Route accepted · departure tick {accepted.effectiveTick} · first arrival tick
        {accepted.effectiveTick + (acceptedLegs[0]?.ticks ?? 0)}, subject to
        execution validation.
      </p>{/if}
    {#each view.military?.ledger.filter((e) => e.fleetId === fleetId && ["arrived", "destroyed", "halted"].includes(e.result)) ?? [] as e}<p
        class="outcome"
        role="status"
      >
        {e.result === "arrived"
          ? "Arrived"
          : e.result === "destroyed"
            ? "Fleet destroyed"
            : "Route halted"} at {view.stars.find((s) => s.id === e.starId)
          ?.name}. {e.fighters} fighters · {e.infantry} infantry aboard.
      </p>{/each}
    {#each view.military?.arrivals ?? [] as report}<article
        aria-label="Arrival report"
      >
        <h3>
          {view.stars.find((s) => s.id === report.starId)?.name} · tick {report.tick}
        </h3>
        <p>
          {report.contested ? "Contested arrival" : "Arrival resolved"}. Your
          forces: {report.fightersBefore} → {report.fightersAfter} fighters; {report.infantryBefore}
          → {report.infantryAfter} infantry, including the surface.
        </p>
        <p>
          Orbit: {view.roster[report.orbit]?.alias ?? "Unclaimed"}. Surface: {view
            .roster[report.surface]?.alias ?? "Unclaimed"}.
        </p>
        {#if report.contested}<p>
            Orbital order: {report.order
              .map((i) => view.roster[i].alias)
              .join(" → ")}. The incumbent defends first.
          </p>{/if}
      </article>{/each}
    {#if !active && !completed && fleet}<label
        >Find a waypoint<input
          type="search"
          bind:this={waypointSearch}
          bind:value={query}
        /></label
      >
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded catalogue supports keyboard scrolling.) -->
      <div
        class="destinations"
        role="region"
        tabindex="0"
        aria-label="Waypoint catalogue"
      >
        {#each candidates as candidate}<ActionButton
            class="destination"
            disabled={pending || waypoints.length >= rules.maximumWaypoints}
            onclick={() => add(candidate.star.id)}
            aria-label={`Add ${candidate.star.name} waypoint`}
            >{candidate.star.name} · {candidate.star.class}<span
              >{candidate.distance.toFixed(2)} ly · {candidate.distance <= range
                ? "Within range"
                : "Beyond range"} · {ownership(candidate.star.id)}</span
            ></ActionButton
          >{/each}
      </div>
    {/if}
    {#if !completed}<ol aria-label="Route waypoints">
        {#each active ? (committed?.waypoints ?? accepted?.waypoints ?? []) : waypoints as id, index}<li
          >
            <strong>{view.stars.find((s) => s.id === id)?.name}</strong
            >{#if !active}<span
                >{preview[index]?.distanceLy.toFixed(2)} ly · {preview[index]
                  ?.ticks} ticks{preview[index]?.reachable
                  ? ""
                  : " · Beyond range"}</span
              >
              <div class="waypoint-actions">
                <ActionButton
                  class="secondary"
                  disabled={pending || index === 0}
                  onclick={() => move(index, -1)}
                  aria-label={`Move waypoint ${index + 1} earlier`}
                  >Earlier</ActionButton
                ><ActionButton
                  class="secondary"
                  disabled={pending || index === waypoints.length - 1}
                  onclick={() => move(index, 1)}
                  aria-label={`Move waypoint ${index + 1} later`}
                  >Later</ActionButton
                ><ActionButton
                  class="secondary"
                  disabled={pending}
                  onclick={() =>
                    (waypoints = waypoints.filter((_, i) => i !== index))}
                  aria-label={`Remove waypoint ${index + 1}`}
                  >Remove</ActionButton
                >
              </div>{/if}
          </li>{/each}
      </ol>{/if}
    {#if !active && !completed && fleet}
      <ActionButton
        class="secondary"
        disabled={pending || busy || !waypoints.length}
        onclick={discardDraft}>Discard draft</ActionButton
      >
      {#if draftNotice}<p role="status">{draftNotice}</p>{/if}
    {/if}
    <p>
      Defenders may be unknown or have changed since observation. Nonallied
      arrivals resolve combat automatically. No mid-flight cancellation or
      rerouting.
    </p>
    <RouteRules {navigation} />
    {#if preview.length && !active}<p class="summary">
        Departure at the next eligible tick; {ticks} ticks to final arrival, including
        waypoint stops. Origin forces stay behind. These estimates pause with the
        campaign.
      </p>{/if}
  </div>
  <footer>
    <Feedback {message} {error} />
    {#if !active && !completed && preview.length}<p class="commit-summary">
        {preview.reduce((n, leg) => n + leg.distanceLy, 0).toFixed(2)} ly · {ticks}
        ticks after departure<br />{fleet?.fighters} fighters · {fleet?.infantry}
        infantry aboard · Capacity {forces?.capacity} infantry
      </p>{/if}
    {#if forces && !active && !completed}<p
        class="origin-summary"
        aria-label="Origin defense review"
      >
        Garrison remaining: {forces.orbit === null
          ? "orbit unknown"
          : forces.orbit + " fighters"} · {forces.surface === null
          ? "surface unknown"
          : forces.surface + " infantry"}. Current confirmed counts.
      </p>{/if}
    {#if invalid && !completed}<p>{invalid}</p>{/if}
    <div class="actions">
      <ActionButton class="secondary" onclick={onclose}
        >Back to fleets</ActionButton
      >{#if completed && fleet}<ActionButton
          onclick={() => {
            replanning = true;
            waypoints = [];
            query = "";
          }}>Plan another route</ActionButton
        >{:else if pending && error && onretry}<ActionButton
          disabled={busy}
          onclick={onretry}>Check route order</ActionButton
        >{:else}<ActionButton
          disabled={pending || !!invalid}
          onclick={() => oncommit([...waypoints])}>Send fleet</ActionButton
        >{/if}
    </div>
  </footer>
</section>

<style>
  .route-planner {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 560px);
    grid-template-rows: minmax(0, 1fr) auto;
    background: #06121b;
    color: #f1ede1;
  }
  .force-review {
    border: 1px solid #557783;
    background: linear-gradient(135deg, #173744, #091a25);
    padding: 16px;
    margin: 16px 0;
  }
  .force-review h3 {
    font-size: 1.15em;
  }
  .force-review dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 12px 0;
  }
  .force-review dt {
    color: #b4cbd1;
    font-size: 0.85em;
  }
  .force-review dd {
    margin: 4px 0;
    font-variant-numeric: tabular-nums;
    color: #f0d69b;
  }
  .force-review .capacity {
    grid-column: 1/-1;
  }
  .force-review meter {
    width: 100%;
    height: 12px;
    accent-color: #87d9e0;
  }
  .force-review p,
  .origin-summary {
    font-size: 0.85em;
    color: #bfd4dc;
  }
  .manifest {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .manifest img {
    width: 96px;
    height: 96px;
    object-fit: cover;
    border: 1px solid #466573;
  }
  .manifest p {
    margin: 4px 0;
    color: #bce0e9;
  }
  .commit-summary {
    color: #bceff2;
    font-variant-numeric: tabular-nums;
  }
  .route-chart {
    position: relative;
    min-height: 0;
    overflow: hidden;
    isolation: isolate;
    grid-row: 1/3;
  }
  .chart-caption {
    position: absolute;
    left: 16px;
    top: 8px;
    pointer-events: none;
    color: #d4edf0;
    background: #06121bc9;
    padding: 8px;
  }
  .chart-caption p {
    margin: 4px;
  }
  .route-details {
    min-height: 0;
    overflow: auto;
    padding: 24px;
    overscroll-behavior: contain;
    z-index: 2;
    background: #06121b;
    line-height: 1.5;
  }
  h2 {
    font:
      500 40px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h3 {
    font:
      500 28px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input {
    min-height: 48px;
    background: #102934;
    color: #fff;
    border: 1px solid #78959d;
    padding: 8px;
    font: inherit;
    min-width: 0;
  }
  .destinations {
    max-height: 180px;
    overflow: auto;
    margin: 12px 0;
    border: 1px solid #39525c;
  }
  .destinations :global(button) {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    border-bottom: 1px solid #39525c;
    padding: 8px 12px;
    min-height: 48px;
    background: #0c2532;
    color: #eef8fa;
  }
  .destinations :global(span) {
    font-size: 14px;
    color: #b4cbd1;
  }
  li {
    padding: 8px 0;
  }
  li span {
    display: block;
  }
  .waypoint-actions,
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .route-planner :global(button) {
    min-height: 44px;
    font: inherit;
  }
  .route-planner :global(button.secondary) {
    background: #0b2532;
    color: #f1ede1;
    border: 1px solid #6b858b;
    padding: 8px 12px;
  }
  footer {
    padding: 16px 24px max(16px, env(safe-area-inset-bottom));
    background: #081923;
    border-top: 1px solid #39525c;
    z-index: 3;
  }
  footer p {
    margin: 6px 0;
    line-height: 1.4;
  }
  .actions :global(button) {
    flex: 1;
    padding: 10px;
    background: #99dee4;
    color: #101e25;
    border: 1px solid #c0f5f7;
    font-weight: 700;
  }
  .actions :global(button:disabled) {
    background: #243640;
    color: #c2d0d5;
    border-color: #536670;
    opacity: 1;
  }
  .summary,
  article {
    border-left: 2px solid #80bec5;
    padding-left: 12px;
  }
  .outcome {
    color: #9becdd;
  }
  @media (min-width: 2300px) {
    .route-planner {
      font-size: 24px;
      grid-template-columns: minmax(0, 1fr) minmax(620px, 30vw);
    }
  }
  @media (min-width: 2300px) {
    h2 {
      font-size: 56px;
    }
    h3 {
      font-size: 40px;
    }
    .manifest img {
      width: 160px;
      height: 160px;
    }
    .route-planner :global(button),
    input {
      min-height: 64px;
    }
    .destinations {
      max-height: 300px;
    }
    .destinations :global(span) {
      font-size: 20px;
    }
  }
  @media (max-width: 760px) {
    .route-planner {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(140px, 24svh) minmax(0, 1fr) auto;
    }
    .manifest {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .manifest img {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border: 1px solid #466573;
    }
    .manifest p {
      margin: 4px 0;
      color: #bce0e9;
    }
    .commit-summary {
      color: #bceff2;
      font-variant-numeric: tabular-nums;
    }
    .route-chart {
      grid-row: 1;
    }
    .route-details {
      padding: 16px 20px;
    }
    h2 {
      font-size: 32px;
    }
    footer {
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
    .chart-caption {
      font-size: 13px;
      top: 0;
    }
    .destinations {
      max-height: 150px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      scroll-behavior: auto;
    }
  }
</style>
