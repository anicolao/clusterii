<script lang="ts">
  import { detailPreference } from "$lib/detail-preference";
  import { tick, untrack } from "svelte";
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
    initialMode = "review",
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
    initialMode?: "edit" | "review";
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
  let editing = $state(untrack(() => initialMode === "edit"));
  let editorHeading = $state<HTMLHeadingElement>();
  let editControl = $state<HTMLButtonElement>();
  let footerHeight = $state(160);
  async function editRoute(value: boolean) {
    editing = value;
    await tick();
    if (value) editorHeading?.focus();
    else editControl?.focus();
  }
  function editorKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      void editRoute(false);
    }
  }

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

<div class="route-host">
  <section
    class="route-planner"
    class:editing
    aria-label="Fleet route planner"
    style={`--route-footer:${footerHeight}px`}
  >
    <div
      class="route-chart"
      style:background-image={$detailPreference.ready &&
      !$detailPreference.lower
        ? `linear-gradient(#06121b66,#06121b99),url(${base}/art/galaxy-dust.webp)`
        : "none"}
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
    <div class="fleet-art">
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
      <span class="art-caption"
        >Fleet illustration · confirmed counts in manifest</span
      >
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded route details support keyboard scrolling.) -->
    <div
      class="route-details"
      role="region"
      tabindex="0"
      aria-label={editing && !active && !completed
        ? "Force details"
        : "Route details"}
    >
      <p class="overline">
        Fleet {fleet?.number ?? "lost"} · {origin?.name ?? "Recorded outcome"}
      </p>

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
                ></meter>
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
          Route accepted · departure tick {accepted.effectiveTick} · first arrival
          tick
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
      {#if active}<ol aria-label="Route waypoints">
          {#each committed?.waypoints ?? accepted?.waypoints ?? [] as id}<li>
              {view.stars.find((s) => s.id === id)?.name}
            </li>{/each}
        </ol>{/if}
    </div>
    <footer bind:offsetHeight={footerHeight}>
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
      {#if !active && !completed && !editing}<button
          class="edit-route"
          bind:this={editControl}
          onclick={() => editRoute(!editing)}
          aria-expanded={editing}
          >{editing ? "Review route" : "Edit route"}</button
        >{/if}
      <div class="actions">
        <ActionButton class="secondary" onclick={onclose}
          >Back to fleets</ActionButton
        >{#if completed && fleet}<ActionButton
            onclick={() => {
              replanning = true;
              editing = true;
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape closes this bounded route editor and restores its opener.) -->
    {#if editing && !active && !completed}<section
        class="route-editor"
        aria-label="Route editing"
        onkeydown={editorKey}
      >
        <h2 tabindex="-1" bind:this={editorHeading}>Edit route</h2>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded waypoint editing supports keyboard scrolling.) -->
        <div
          class="editor-reading"
          role="region"
          tabindex="0"
          aria-label="Route details"
        >
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
                  disabled={pending ||
                    waypoints.length >= rules.maximumWaypoints}
                  onclick={() => add(candidate.star.id)}
                  aria-label={`Add ${candidate.star.name} waypoint`}
                  >{candidate.star.name} · {candidate.star.class}<span
                    >{candidate.distance.toFixed(2)} ly · {candidate.distance <=
                    range
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
                      >{preview[index]?.distanceLy.toFixed(2)} ly · {preview[
                        index
                      ]?.ticks} ticks{preview[index]?.reachable
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
            Defenders may be unknown or have changed since observation.
            Nonallied arrivals resolve combat automatically. No mid-flight
            cancellation or rerouting.
          </p>
          <RouteRules {navigation} />
          {#if preview.length && !active}<p class="summary">
              Departure at the next eligible tick; {ticks} ticks to final arrival,
              including waypoint stops. Origin forces stay behind. These estimates
              pause with the campaign.
            </p>{/if}
        </div>
        <ActionButton class="secondary" onclick={() => editRoute(false)}
          >Review route</ActionButton
        >
      </section>{/if}
  </section>
</div>

<style>
  .route-host {
    height: 100%;
    min-height: 0;
    container-type: inline-size;
    container-name: fleet-route;
  }
  .route-planner {
    height: 100%;
    min-height: 0;
    position: relative;
    display: grid;
    grid-template-columns: 30% 36% 34%;
    grid-template-rows: minmax(180px, 1fr) minmax(270px, 40%);
    background: #06121b;
    color: #f1ede1;
    isolation: isolate;
  }
  .route-chart {
    grid-area: 1/1/2/4;
    position: relative;
    min-height: 0;
    overflow: hidden;
    isolation: isolate;
    background-size: cover;
    background-position: center;
  }
  .chart-caption {
    position: absolute;
    left: 24px;
    top: 12px;
    pointer-events: none;
    color: #d4edf0;
    background: #06121ba8;
    padding: 8px 14px;
    border-left: 2px solid #d8b978;
  }
  .chart-caption p {
    margin: 4px;
  }
  .fleet-art {
    grid-area: 2/1;
    position: relative;
    overflow: hidden;
    border-top: 1px solid #8b784f;
  }
  .manifest {
    height: 100%;
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: 24px;
    box-sizing: border-box;
    background: #102733;
  }
  .manifest img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 62% center;
  }
  .manifest:after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 35%, #04101ef2);
  }
  .manifest > div {
    position: relative;
    z-index: 1;
  }
  .manifest p {
    color: #c9e7ea;
    margin: 4px 0;
  }
  .art-caption {
    position: absolute;
    top: 10px;
    left: 12px;
    font-size: 11px;
    background: #06121bb8;
    padding: 4px;
  }
  h2 {
    font:
      500 36px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h3 {
    font:
      500 22px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  .route-details {
    grid-area: 2/2;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 16px 20px;
    box-sizing: border-box;
    border: 1px solid #56646a;
    background: linear-gradient(130deg, #112c36, #071724);
    line-height: 1.4;
    z-index: 2;
  }
  .route-details:focus-visible,
  .editor-reading:focus-visible {
    outline: 2px solid #e9cb85;
    outline-offset: -3px;
  }
  .route-details > .overline {
    margin: 0 0 10px;
    font-size: 12px;
  }
  .force-review {
    margin: 0;
  }
  .force-review h3 {
    font-size: 1.15em;
  }
  .force-review dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 16px;
    margin: 8px 0;
  }
  .force-review dt {
    color: #b4cbd1;
    font-size: 0.8em;
  }
  .force-review dd {
    margin: 3px 0;
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
    font-size: 0.8em;
    color: #bfd4dc;
  }
  .force-review p {
    margin: 8px 0;
    line-height: 1.4;
  }
  footer {
    grid-area: 2/3;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 18px 22px max(18px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    background: linear-gradient(130deg, #0d2834, #06131d);
    border-top: 1px solid #8b784f;
    z-index: 3;
  }
  footer p {
    margin: 0;
    line-height: 1.4;
  }
  .commit-summary {
    color: #bceff2;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .actions :global(button) {
    flex: 1;
    min-width: 0;
    white-space: normal;
    padding: 12px;
    background: linear-gradient(#75e5f0, #167e96);
    color: #031921;
    border: 1px solid #baf5ff;
    font-weight: 700;
  }
  .route-planner :global(button) {
    min-height: 44px;
    font: inherit;
  }
  .route-planner :global(button.secondary),
  .edit-route {
    background: #0b2532;
    color: #f1ede1;
    border: 1px solid #9f947d;
    padding: 8px 12px;
    cursor: pointer;
  }
  .edit-route:focus-visible {
    outline: 3px solid #e9cb85;
    outline-offset: 2px;
  }
  .actions :global(button:disabled) {
    background: #243640;
    color: #c2d0d5;
    border-color: #536670;
    opacity: 1;
  }
  .route-editor {
    position: absolute;
    z-index: 5;
    top: 12px;
    right: 16px;
    bottom: calc(40% + 12px);
    width: min(460px, 42%);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #071c29;
    border: 1px solid #9b8c6b;
    padding: 12px;
    box-shadow: 0 14px 50px #0009;
  }
  .route-editor h2 {
    font-size: 28px;
    margin: 0 0 8px;
  }
  .editor-reading {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 4px 8px;
    flex: 1;
  }
  .route-editor > :global(button) {
    flex: none;
    margin-top: 8px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input {
    min-height: 44px;
    background: #102934;
    color: #fff;
    border: 1px solid #78959d;
    padding: 8px;
    font: inherit;
    min-width: 0;
    box-sizing: border-box;
    width: 100%;
  }
  .destinations {
    max-height: 140px;
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
    background: #0c2532;
    color: #eef8fa;
  }
  .destinations :global(span) {
    font-size: 0.85em;
    color: #b4cbd1;
  }
  li {
    padding: 8px 0;
  }
  li span {
    display: block;
  }
  .waypoint-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .summary,
  article {
    border-left: 2px solid #80bec5;
    padding-left: 12px;
  }
  .outcome {
    color: #9becdd;
  }
  @container fleet-route (min-width: 2300px) {
    .route-planner {
      font-size: 24px;
    }
    .manifest {
      padding: 36px;
    }
    h2 {
      font-size: 56px;
    }
    .route-details {
      padding: 24px 32px;
    }
    .route-details > .overline {
      font-size: 18px;
    }
    .art-caption {
      font-size: 16px;
    }
    footer {
      padding: 28px 36px;
      gap: 14px;
    }
    .route-planner :global(button),
    input {
      min-height: 64px;
    }
    .route-editor {
      width: min(800px, 40%);
      padding: 24px;
      top: 24px;
      right: 24px;
      bottom: calc(40% + 24px);
    }
    .route-editor h2 {
      font-size: 42px;
    }
    .destinations {
      max-height: 240px;
    }
  }
  @container fleet-route (max-width: 760px) {
    .route-planner {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(170px, 30svh) 70px minmax(0, 1fr) auto;
    }
    .route-chart {
      grid-area: 1/1;
    }
    .fleet-art {
      grid-area: 2/1;
      border-bottom: 1px solid #56646a;
    }
    .manifest {
      padding: 8px 16px 8px 126px;
      align-items: center;
    }
    .manifest img {
      width: 110px;
      object-position: center;
    }
    .manifest:after {
      display: none;
    }
    .manifest h2 {
      font-size: 25px;
      margin: 0;
    }
    .manifest p {
      font-size: 12px;
    }
    .art-caption {
      display: none;
    }
    .route-details {
      grid-area: 3/1;
      padding: 12px 20px;
    }
    .route-details > .overline {
      display: none;
    }
    .force-review p {
      font-size: 12px;
    }
    .force-review h3 {
      font-size: 18px;
    }
    footer {
      grid-area: 4/1;
      padding: 10px 16px max(10px, env(safe-area-inset-bottom));
      gap: 6px;
      font-size: 13px;
    }
    .actions :global(button) {
      padding: 8px;
    }
    .edit-route {
      padding: 6px;
    }
    .chart-caption {
      font-size: 12px;
      left: 12px;
      top: 6px;
      padding: 4px 8px;
    }
    .route-editor {
      top: 30svh;
      bottom: var(--route-footer);
      left: 0;
      right: 0;
      width: auto;
      padding: 12px 16px;
    }
    .route-editor h2 {
      font-size: 26px;
    }
    .destinations {
      max-height: 110px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      scroll-behavior: auto;
    }
  }
</style>
