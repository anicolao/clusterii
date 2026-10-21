<script lang="ts">
  import type { CampaignView } from "@shared/campaign";
  import {
    returnBriefing,
    type BriefingCategory,
    type BriefingEvent,
  } from "$lib/return-briefing";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import FactionArt from "./FactionArt.svelte";
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

<section class="return-briefing" aria-label="Return briefing">
  <aside aria-hidden="true">
    <FactionArt faction={snapshot.own.faction} />
  </aside>
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
    {#if loading}<p role="status">Recovering your authorized activity…</p>{/if}
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
          The full reviewed period is not available in these records. Your visit
          has not changed.
        </p>{/if}
    {:else}
      {#if !summary.events.length}<p>
          No new completed activity in this period.
        </p>{/if}
      {#each categories as category}{@const events = summary.events.filter(
          (event) => event.category === category,
        )}
        {#if events.length}<section aria-label={category}>
            <h3>{category}</h3>
            {#each events as event (event.id)}<article>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                  <small>Confirmed tick {event.tick}</small>
                </div>
                <ActionButton class="secondary" onclick={() => oninspect(event)}
                  >Inspect {event.title}</ActionButton
                >
              </article>{/each}
          </section>{/if}
      {/each}
    {/if}
    <section aria-label="Upcoming orders">
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
    <p>
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
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(220px, 30%) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    background: #071820;
    color: #f6eedf;
    overflow: hidden;
  }
  aside {
    grid-row: 1/-1;
    position: relative;
    overflow: hidden;
    background: linear-gradient(#193e4d, #07131c);
    display: flex;
    align-items: center;
  }
  aside :global(.faction-art) {
    height: auto;
    width: 100%;
    aspect-ratio: 1;
  }
  header,
  footer {
    padding: 24px 32px;
    background: #071820;
    border-bottom: 1px solid #536b70;
    z-index: 1;
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
  article {
    padding: 18px;
    margin: 12px 0;
    border: 1px solid #537781;
    background: #102c37;
    display: grid;
    gap: 16px;
  }
  article strong {
    font-size: 20px;
  }
  small {
    color: #d8c598;
  }
  article :global(button) {
    justify-self: start;
    max-width: 100%;
    overflow-wrap: anywhere;
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
    article strong {
      font-size: 28px;
    }
  }
  @media (max-width: 700px) {
    .return-briefing {
      grid-template-columns: 1fr;
    }
    aside {
      display: none;
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
    }
    h3 {
      font-size: 28px;
    }
    article strong {
      font-size: 18px;
    }
    .commitment {
      gap: 8px;
    }
    .commitment :global(button) {
      padding: 12px 8px;
    }
  }
  @media (max-height: 700px) and (min-width: 701px) {
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
</style>
