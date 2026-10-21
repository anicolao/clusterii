<script lang="ts">
  import { base } from "$app/paths";
  import type { ArrivalRecord } from "$lib/arrival-reports";
  import { feedbackMotion, type MotionInspection } from "$lib/motion";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import DevelopmentIcon from "./DevelopmentIcon.svelte";
  import FleetSymbol from "./FleetSymbol.svelte";
  let {
    records,
    selected = $bindable(""),
    loading = false,
    error = "",
    earlier = false,
    newer = false,
    inspect,
    onearlier,
    onlatest,
    onretry,
    onclose,
    oninspect,
  }: {
    records: ArrivalRecord[];
    selected?: string;
    loading?: boolean;
    error?: string;
    earlier?: boolean;
    newer?: boolean;
    inspect?: MotionInspection;
    onearlier: () => void;
    onlatest: () => void;
    onretry: () => void;
    onclose: () => void;
    oninspect: (starId: string) => void;
  } = $props();
  $effect(() => {
    if (!selected && records[0]) selected = records[0].id;
  });
  const item = $derived(records.find((r) => r.id === selected) ?? records[0]);
  const report = $derived(item?.report);
  const detail = $derived(report?.detail);
  const own = $derived(
    item?.view.roster.findIndex((s) => s.faction === item.view.own.faction) ??
      -2,
  );
  const title = $derived(
    !report
      ? "Arrival reports"
      : report.orbit === own
        ? report.surface === own
          ? "System secured"
          : "Orbit secured"
        : report.surface === own
          ? "Surface held"
          : "Arrival resolved",
  );
  function owner(index: number) {
    return index === own
      ? "You"
      : index < 0
        ? "Unclaimed"
        : (item?.view.roster[index]?.alias ?? "Unknown");
  }
</script>

<section class="arrival-instrument" aria-label="Arrival reports">
  <img class="aftermath" src={`${base}/art/orbital-aftermath.webp`} alt="" />
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded report supports keyboard scrolling.) -->
  <div
    class="report-body history-scroll"
    role="region"
    aria-label="Arrival report details"
    tabindex="0"
  >
    <p class="overline">
      Your campaign record{#if report}
        · tick {report.tick}{/if}
    </p>
    {#if item}<p class="system-name">
        {item.view.stars.find((s) => s.id === item.report.starId)?.name ??
          item.report.starId}
      </p>{/if}
    <h2>{title}</h2>
    <Feedback
      message={loading ? "Loading authorized arrival reports…" : ""}
      {error}
      {inspect}
    />
    {#if report}<article use:feedbackMotion={{ key: item.id, inspect }}>
        <p class="result">
          {report.orbit === own && report.surface !== own
            ? `Orbit is yours. Surface remains ${owner(report.surface) === "Unclaimed" ? "unclaimed" : `${owner(report.surface)}-held`}.`
            : "Confirmed outcome at the recorded tick. Current control may have changed."}
        </p>
        <ol class="sequence" aria-label="Resolution sequence">
          <li>
            <FleetSymbol /><strong>Arrival</strong><span
              >Forces reached the system.</span
            >
          </li>
          <li>
            <DevelopmentIcon type="station" /><strong>Orbit</strong><span
              >{report.contested
                ? "Orbital forces resolved."
                : "No hostile resistance."}</span
            >
          </li>
          <li>
            <DevelopmentIcon type="base" /><strong>Surface</strong><span
              >{detail?.landed
                ? `${detail.landed} of your infantry landed.`
                : "Control recorded separately."}</span
            >
          </li>
        </ol>
        <dl class="losses">
          <div>
            <dt>Your fighters lost</dt>
            <dd>{report.fightersBefore - report.fightersAfter}</dd>
          </div>
          <div>
            <dt>Your fighters remaining</dt>
            <dd>{report.fightersAfter}</dd>
          </div>
          <div>
            <dt>Your infantry lost</dt>
            <dd>{report.infantryBefore - report.infantryAfter}</dd>
          </div>
          <div>
            <dt>Your infantry remaining</dt>
            <dd>{report.infantryAfter}</dd>
          </div>
        </dl>
        <dl class="control">
          <div>
            <dt>Orbit</dt>
            <dd class:you={report.orbit === own}>{owner(report.orbit)}</dd>
          </div>
          <div>
            <dt>Surface</dt>
            <dd class:you={report.surface === own}>{owner(report.surface)}</dd>
          </div>
        </dl>
        {#if detail}<details>
            <summary>Losses and effectiveness</summary>
            <p>
              Totals cover your participating fleets and local forces, before
              this tick’s production.
            </p>
            <p>
              Your formations: {detail.formations} · Your melee: {detail.melee}
            </p>
            <p>
              Transport losses: {detail.transportLosses} infantry. Ground losses:
              {detail.groundLosses} infantry.
            </p>
            <p>
              Your surface infantry: {detail.groundBefore} before · {detail.groundAfter}
              after. Your carried infantry before arrival: {detail.carriedBefore}.
            </p>
            <p>
              Control before arrival — orbit: {owner(detail.orbitBefore)};
              surface: {owner(detail.surfaceBefore)}.
            </p>
          </details>{:else}<p>
            Detailed effectiveness and loss phases were not recorded for this
            older report.
          </p>{/if}
        <p class="escrow">
          {#if detail?.releasedEscrowMilli !== undefined}{detail.releasedEscrowMilli /
              1000} held credits released to you once.{:else if report.orbit !== report.surface}Credits
            remain held while control is split. The held balance is private.{:else}Both
            layers share control. This report records no credit release to you.{/if}
        </p>
        <p class="outputs">
          {#if report.orbit >= 0}{owner(report.orbit)}
            {report.orbit === own ? "receive" : "receives"} orbital fighters and science.{:else}No
            empire receives orbital output.{/if}
          {#if report.surface >= 0}{owner(report.surface)}
            {report.surface === own ? "receive" : "receives"} surface infantry.{:else}No
            empire receives surface output.{/if}
        </p>
        <details>
          <summary>Participants and resolution</summary>
          <p>
            Orbital resolution order: {report.order.map(owner).join(" → ") ||
              "None"}.
          </p>
          <p>
            Square-law orbital combat; defender-first ground combat. Opposing
            force counts and effectiveness are private. Ground resolution is
            automatic.
          </p>
          <p>Development combat rules remain under review.</p>
        </details>
      </article>{:else if !loading}<p>
        No arrival reports in the records loaded.
      </p>{/if}
    <div class="history-actions" role="group" aria-label="Report history">
      {#if error}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onretry}>Retry reports</ActionButton
        >{/if}{#if newer}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onlatest}>Refresh reports</ActionButton
        >{/if}{#if earlier}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onearlier}>Earlier reports</ActionButton
        >{/if}
    </div>
    <div class="report-list" role="group" aria-label="Recorded arrivals">
      {#each records as entry}<ActionButton
          class="secondary"
          aria-pressed={item?.id === entry.id}
          onclick={() => (selected = entry.id)}
          >{entry.view.stars.find((s) => s.id === entry.report.starId)?.name ??
            entry.report.starId} · tick {entry.report.tick}</ActionButton
        >{/each}
    </div>
    <p>
      {earlier
        ? "Earlier records may contain other arrivals."
        : "Beginning of your loaded arrival history."}
    </p>
  </div>
  <footer>
    <ActionButton class="secondary" onclick={onclose}
      >Back to galaxy</ActionButton
    >{#if report}<ActionButton
        class="primary"
        onclick={() => oninspect(report!.starId)}>Inspect surface</ActionButton
      >{/if}
  </footer>
</section>

<style>
  .arrival-instrument {
    height: 100%;
    min-height: 0;
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    color: #f3ead6;
    background: #06131c;
  }
  .aftermath {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 70% center;
    z-index: -2;
    pointer-events: none;
  }
  .arrival-instrument::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      90deg,
      #041018f5 0%,
      #041018d9 40%,
      #04101820 90%
    );
    pointer-events: none;
  }
  .report-body {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 32px clamp(24px, 4vw, 70px);
    max-width: 850px;
    line-height: 1.5;
  }
  .system-name {
    font:
      500 32px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h2 {
    font:
      500 clamp(36px, 4vw, 60px) "Cormorant Garamond",
      serif;
    margin: 12px 0;
  }
  .result {
    font-size: 20px;
  }
  .sequence {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    list-style: none;
    padding: 0;
  }
  .sequence li {
    display: flex;
    align-items: center;
    flex-direction: column;
    text-align: center;
    gap: 6px;
  }
  .sequence :global(svg) {
    width: 48px;
    height: 48px;
    padding: 10px;
    border: 1px solid #a1c3cb;
    border-radius: 50%;
    background: #16323d;
  }
  .sequence span {
    font-size: 14px;
  }
  dl {
    margin: 20px 0;
  }
  dd {
    margin: 0;
    font:
      600 30px "Cormorant Garamond",
      serif;
  }
  .losses,
  .control {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 18px;
    background: #06131ce6;
    border: 1px solid #7e9c9c;
    border-radius: 4px;
  }
  .control {
    border: 0;
  }
  .control dd {
    color: #efbd7a;
  }
  .control dd.you {
    color: #6aeeff;
  }
  details {
    margin: 14px 0;
  }
  summary {
    cursor: pointer;
    padding: 12px 0;
    min-height: 44px;
  }
  summary:focus-visible {
    outline: 2px solid #6aeeff;
  }
  .history-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 20px 0;
  }
  .report-list {
    display: grid;
    gap: 8px;
    margin-top: 24px;
  }
  .report-list :global(button[aria-pressed="true"]) {
    border-color: #6aeeff;
    background: #174558;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 16px clamp(24px, 4vw, 70px) max(16px, env(safe-area-inset-bottom));
    background: #041018ee;
    border-top: 1px solid #557781;
    z-index: 1;
  }
  .arrival-instrument :global(button) {
    min-height: 48px;
    padding: 12px 18px;
    border: 1px solid #8aa3a5;
    background: #0c2836;
    color: #f3ead6;
    font: inherit;
  }
  footer :global(button) {
    flex: 1;
  }
  footer :global(.primary) {
    border-color: #64e5f3;
    background: #07516b;
  }
  @media (min-width: 2300px) {
    .report-body {
      max-width: 1400px;
      font-size: 26px;
    }
    .system-name {
      font-size: 48px;
    }
    .result {
      font-size: 30px;
    }
    .sequence span {
      font-size: 24px;
    }
    dd {
      font-size: 44px;
    }
    footer {
      font-size: 26px;
    }
  }
  @media (max-width: 760px) {
    .report-body {
      padding: 76px 20px 20px;
    }
    .aftermath {
      object-position: 70% top;
    }
    .arrival-instrument::before {
      background: linear-gradient(#04101810, #041018ee 260px, #041018 70%);
    }
    h2 {
      font-size: 38px;
    }
    .system-name {
      font-size: 28px;
    }
    .result {
      font-size: 17px;
    }
    .sequence {
      gap: 8px;
    }
    .sequence span {
      font-size: 13px;
    }
    .losses,
    .control {
      gap: 10px;
      padding: 14px;
    }
    dt {
      font-size: 14px;
    }
    footer {
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
  }
  @media (max-height: 550px) {
    .report-body {
      padding-top: 16px;
    }
  }
</style>
