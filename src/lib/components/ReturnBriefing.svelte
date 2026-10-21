<script lang="ts">
  import type { CampaignView } from "@shared/campaign";
  import {
    returnBriefing,
    type BriefingCategory,
    type BriefingEvent,
  } from "$lib/return-briefing";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import { base } from "$app/paths";
  import BriefingReport from "./BriefingReport.svelte";
  import type { MotionInspection } from "$lib/motion";
  let {
    snapshot,
    records,
    loading = false,
    earlier = false,
    newer = false,
    error = "",
    message = "",
    pending = false,
    recovering = false,
    preparing = false,
    blocked = false,
    inspect,
    onearlier,
    onlatest,
    onretry,
    oninspect,
    onconfirm,
    onclose,
  }: {
    snapshot: CampaignView;
    records: CampaignView[];
    loading?: boolean;
    earlier?: boolean;
    newer?: boolean;
    error?: string;
    message?: string;
    pending?: boolean;
    recovering?: boolean;
    preparing?: boolean;
    blocked?: boolean;
    inspect?: MotionInspection;
    onearlier: () => void;
    onlatest: () => void;
    onretry: () => void;
    oninspect: (event: BriefingEvent) => void;
    onconfirm: (revision: number) => void;
    onclose: () => void;
  } = $props();
  const summary = $derived(returnBriefing(snapshot, records));
  const categories: BriefingCategory[] = [
    "Control",
    "Arrivals and losses",
    "Research",
    "Economy",
    "Messages",
  ];
  const queued = $derived(
    (snapshot.military?.orders.length ?? 0) +
      (snapshot.construction?.orders.length ?? 0) +
      (snapshot.economy?.research.orders?.length ?? 0) +
      (snapshot.economy?.marketFocus.orders.length ?? 0) +
      (snapshot.construction?.cancellations.length ?? 0),
  );
</script>

<section
  class="return-briefing"
  aria-label="Return briefing"
  style={`--briefing-scene:url(${base}/art/galaxy-dust.webp)`}
>
  <header>
    <p class="overline gold">Your empire · {snapshot.name}</p>
    <h2>Since your last visit</h2>
    <p>
      {#if recovering}Recovering the period of your saved visit.{:else}From tick {summary
          .checkpoint?.tick ?? 0} through confirmed tick {summary.latestTick}.{/if}
      Reading this briefing does not mark messages read.
    </p>
    {#if newer}<ActionButton
        class="secondary"
        onclick={onlatest}
        disabled={loading || pending || preparing || blocked}
        >New activity</ActionButton
      >{/if}
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The briefing supports bounded keyboard scrolling.) -->
  <div
    class="history-scroll briefing-reading"
    role="region"
    aria-label="Briefing details"
    tabindex="0"
  >
    <div class="completed-events">
      {#if loading}<p role="status">
          Recovering your authorized activity…
        </p>{/if}
      {#if recovering || !summary.complete}<p>
          {summary.loaded} authorized records loaded. Recover earlier records to complete
          this period before saving your visit.
        </p>
        {#if earlier}<ActionButton
            class="secondary"
            onclick={onearlier}
            disabled={loading}>Recover earlier activity</ActionButton
          >{:else if !loading}<ActionButton class="secondary" onclick={onlatest}
            >Recover complete period</ActionButton
          >
          <p>
            The full reviewed period is not available in these records. Your
            visit has not changed.
          </p>{/if}
      {:else}
        {#if !summary.events.length}<p>
            No new completed activity in this period.
          </p>{/if}
        {#if summary.events.some((event) => event.urgent)}<section
            aria-label="Losses and interrupted orders"
          >
            <h3>Losses and interrupted orders</h3>
            {#each summary.events.filter((event) => event.urgent) as event (event.id)}<BriefingReport
                {event}
                {snapshot}
                onclick={() => oninspect(event)}
              />{/each}
          </section>{/if}
        {#each categories as category}{@const events = summary.events.filter(
            (event) => event.category === category && !event.urgent,
          )}
          {#if events.length}<section aria-label={category}>
              <h3>{category}</h3>
              {#each events as event (event.id)}<BriefingReport
                  {event}
                  {snapshot}
                  onclick={() => oninspect(event)}
                />{/each}
            </section>{/if}
        {/each}
      {/if}
    </div>
    <section class="upcoming" aria-label="Upcoming orders">
      <h3>Upcoming orders</h3>
      <p>
        {queued} accepted {queued === 1 ? "order" : "orders"} awaiting settlement.
        These are separate from completed activity.
      </p>
      {#each snapshot.military?.orders ?? [] as order}<p>
          Fleet order · tick {order.effectiveTick} · {snapshot.stars.find(
            (star) => star.id === order.starId,
          )?.name}
        </p>{/each}
      {#each snapshot.construction?.orders ?? [] as order}<p>
          {order.type} construction · {snapshot.stars.find(
            (star) => star.id === order.starId,
          )?.name} · {order.startedTick == null
            ? `eligible tick ${order.effectiveTick}`
            : `${order.progress} completed advances`}
        </p>{/each}
      {#each snapshot.economy?.research.orders ?? [] as order}<p>
          {order.target} research · tick {order.effectiveTick}
        </p>{/each}
      {#each snapshot.economy?.marketFocus.orders ?? [] as order}<p>
          Market focus · tick {order.effectiveTick}
        </p>{/each}
      {#each snapshot.construction?.cancellations ?? [] as cancellation}<p>
          Construction cancellation · tick {cancellation.effectiveTick}
        </p>{/each}
      {#each (snapshot.military?.fleets ?? []).filter((fleet) => fleet.travel?.status === "traveling") as fleet}<p
        >
          Fleet {fleet.number} in transit · expected at {snapshot.stars.find(
            (star) => star.id === fleet.travel?.to,
          )?.name} on tick {fleet.travel?.arrivalTick}
        </p>{/each}
    </section>
    <p class="disclosure">
      Only your authorized records are summarized. Inspecting a report changes
      no orders or permissions.
    </p>
  </div>
  <footer>
    <div role="group" aria-label="Visit acknowledgement">
      <Feedback {message} {error} {inspect} />
    </div>
    <div class="commitment">
      <ActionButton class="secondary" onclick={onclose}
        >Back without saving</ActionButton
      >
      {#if error}<ActionButton
          class="primary"
          onclick={onretry}
          disabled={loading}>Retry recovery</ActionButton
        >{:else}<ActionButton
          class="primary"
          onclick={() => onconfirm(summary.throughRevision)}
          disabled={recovering ||
            !summary.complete ||
            loading ||
            pending ||
            preparing ||
            blocked}
          >{preparing
            ? "Preparing visit…"
            : blocked
              ? "Waiting for current order…"
              : pending
                ? "Awaiting acknowledgement…"
                : "Save visit and return to galaxy"}</ActionButton
        >{/if}
    </div>
  </footer>
</section>

<style>
  .return-briefing {
    container-type: inline-size;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    background:
      linear-gradient(#07182044, #071820ee),
      var(--briefing-scene) center/cover;
    color: #f6eedf;
    overflow: hidden;
  }
  header,
  footer {
    padding: 24px 32px;
    background: #071820cc;
    border-bottom: 1px solid #536b70;
    z-index: 1;
  }
  header {
    min-height: clamp(140px, 18vh, 260px);
    display: flex;
    flex-direction: column;
    justify-content: end;
  }
  header h2 {
    font:
      500 48px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  header p {
    margin: 8px 0;
    line-height: 1.5;
  }
  .briefing-reading {
    overflow: auto;
    padding: 0 32px 24px;
    min-height: 0;
    scrollbar-gutter: stable;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
    gap: 0 32px;
    align-content: start;
  }
  h3 {
    font:
      500 30px "Cormorant Garamond",
      serif;
    margin: 24px 0 12px;
  }
  p {
    line-height: 1.5;
  }
  .completed-events,
  .upcoming {
    min-width: 0;
  }
  .upcoming {
    border-left: 1px solid #536b70;
    padding-left: 24px;
  }
  .disclosure {
    grid-column: 1/-1;
  }
  footer {
    border-top: 1px solid #536b70;
    border-bottom: 0;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .commitment {
    display: flex;
    gap: 12px;
  }
  .commitment :global(button) {
    flex: 1;
    min-width: 0;
    min-height: 48px;
    white-space: normal;
  }
  footer :global(.feedback:empty) {
    display: none;
  }
  @media (min-width: 2400px) {
    header h2 {
      font-size: 72px;
    }
    header,
    footer {
      padding: 40px 56px;
    }
    .briefing-reading {
      padding: 0 56px 40px;
    }
    .return-briefing {
      font-size: 24px;
    }
    h3 {
      font-size: 42px;
    }
  }
  @media (max-width: 700px) {
    .return-briefing {
      grid-template-columns: 1fr;
    }

    header,
    footer {
      padding: 16px;
    }
    header h2 {
      font-size: 34px;
    }
    .briefing-reading {
      padding: 0 16px 16px;
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
    }
    h3 {
      font-size: 28px;
    }
    .upcoming {
      border-left: 0;
      border-top: 1px solid #536b70;
      padding-left: 0;
    }
    .commitment {
      gap: 8px;
    }
    .commitment :global(button) {
      padding: 12px 8px;
    }
  }
  @media (max-height: 700px) and (min-width: 701px) {
    header {
      min-height: 0;
    }
    header,
    footer {
      padding: 12px 24px;
    }
    header h2 {
      font-size: 36px;
    }
    header p {
      margin: 4px 0;
    }
  }
  @container (max-width: 850px) {
    .briefing-reading {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
    }
    .upcoming {
      border-left: 0;
      border-top: 1px solid #536b70;
      padding-left: 0;
    }
    header,
    .briefing-reading,
    footer {
      font-size: 16px;
      padding: 16px;
    }
    h3 {
      font-size: 28px;
    }
    header h2 {
      font-size: 34px;
    }
    .briefing-reading {
      padding: 0 16px 16px;
    }
  }
</style>
