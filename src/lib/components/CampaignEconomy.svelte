<script lang="ts">
  import {
    refreshMarketDraft,
    type MarketAllocationDraft,
  } from "$lib/market-draft";
  import { untrack } from "svelte";
  import CreditOffers from "./CreditOffers.svelte";
  import type { TradeAction } from "@shared/trades";
  import type { CreditDraft } from "$lib/credit-offers";
  import MarketFocus from "./MarketFocus.svelte";
  import { initialFocus, type Allocation } from "@shared/market-focus";
  import { tick } from "svelte";
  import CampaignResearch from "./CampaignResearch.svelte";
  import type { Technology } from "@shared/production";
  import { onMount } from "svelte";
  import type { CampaignView } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  let {
    view,
    marketDraft = $bindable<MarketAllocationDraft>(
      untrack(
        () =>
          refreshMarketDraft(undefined, view.economy?.marketFocus).allocation,
      ),
    ),
    records = [],
    exchanging = $bindable(false),
    tradeSelection = $bindable(""),
    onclose,
    ontrade,
    onhistory,
    tradeDraft = $bindable({ seat: "", give: "10", request: "0" }),
    commandId = "",
    commandOfferId = "",
    inspectTime,
    onresearch,
    onfocus,
    commandKind = "",
    message = "",
    error = "",
    busy = false,
    pending = false,
    onretry,
  }: {
    view: CampaignView;
    marketDraft?: MarketAllocationDraft;
    records?: CampaignView[];
    exchanging?: boolean;
    tradeSelection?: string;
    onclose: () => void;
    ontrade?: (action: TradeAction) => void;
    onhistory?: () => void;
    tradeDraft?: CreditDraft;
    commandId?: string;
    commandOfferId?: string;
    inspectTime?: number;
    onfocus?: (allocation: Allocation) => void;
    commandKind?: string;
    onresearch?: (target: Technology) => void;
    message?: string;
    error?: string;
    busy?: boolean;
    pending?: boolean;
    onretry?: () => void;
  } = $props();
  let editingFocus = $state(false);
  let exchangeHost = $state<HTMLDivElement>();
  let exchangeButton = $state<HTMLButtonElement>();
  async function openExchange() {
    exchanging = true;
    await tick();
    exchangeHost?.querySelector<HTMLHeadingElement>("h2")?.focus();
  }
  async function closeExchange() {
    exchanging = false;
    await tick();
    exchangeButton?.focus();
  }
  let focusHost = $state<HTMLDivElement>();
  async function openFocus() {
    editingFocus = true;
    await tick();
    focusHost?.querySelector<HTMLHeadingElement>("h2")?.focus();
  }
  let focusButton = $state<HTMLButtonElement>();
  async function closeFocus() {
    editingFocus = false;
    await tick();
    focusButton?.focus();
  }
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const research = $derived(view.economy?.research),
    ledger = $derived(view.economy?.ledger);
  const cost = $derived(
    research
      ? rules.researchBaseCost *
          rules.researchCostGrowth ** research.levels[research.target]
      : 0,
  );
  function amount(milli: number) {
    return (milli / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 3,
    });
  }
</script>

{#if exchanging && ontrade}<div class="focus-host" bind:this={exchangeHost}>
    <CreditOffers
      {view}
      {records}
      bind:selected={tradeSelection}
      bind:draft={tradeDraft}
      {commandId}
      {commandOfferId}
      {commandKind}
      {message}
      {error}
      {pending}
      {busy}
      oncommand={ontrade}
      onclose={closeExchange}
      onretry={() => onretry?.()}
      onhistory={() => onhistory?.()}
    />
  </div>{:else if editingFocus && view.economy}<div
    bind:this={focusHost}
    class="focus-host"
  >
    <MarketFocus
      bind:draft={marketDraft}
      focus={view.economy.marketFocus ?? initialFocus()}
      ledger={view.economy.ledger}
      paused={view.pausedAt != null}
      {busy}
      {pending}
      message={commandKind === "market.focus" ? message : ""}
      error={commandKind === "market.focus" ? error : ""}
      onapply={onfocus}
      onclose={closeFocus}
      {onretry}
    />
  </div>{:else}
  <section class="economy-instrument" aria-label="Empire economy">
    <header>
      <p class="overline gold">Your empire</p>
      <h2>Economy</h2>
      <p role="status" aria-label="Production schedule">
        {#if !view.productionEnabled}This campaign preserves its earlier
          behavior and does not produce resources. Create a new development
          campaign to play with production.{:else if view.pausedAt != null}Production
          is paused. Remaining time resumes with the campaign.{:else if !view.production}Production
          begins fifteen minutes after home assignment.{:else if (inspectTime ?? now) >= view.production.nextTickAt}Awaiting
          next tick. Balances update when production is confirmed.{:else}Next
          production: {new Date(
            view.production.nextTickAt,
          ).toLocaleString()}.{/if}
      </p>
    </header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded ledger supports keyboard scrolling.) -->
    <div
      class="economy-scroll"
      role="region"
      tabindex="0"
      aria-label="Production ledger"
    >
      {#if view.empire}<p class="balance">
          <span>Available credits</span><strong
            >{amount(view.empire.creditsMilli)}</strong
          >
        </p>{/if}
      {#if view.production}<p class="overline">
          {view.production.tick === 0
            ? "First production pending"
            : `Confirmed tick ${view.production.tick}`}
        </p>{/if}
      {#if ledger}<dl aria-label="Last production">
          <div>
            <dt>Credits received</dt>
            <dd>{amount(ledger.creditsMilli)}</dd>
          </div>
          {#if ledger.marketDividendsMilli}<div>
              <dt>Market dividends included</dt>
              <dd>{amount(ledger.marketDividendsMilli)}</dd>
            </div>{/if}
          {#if ledger.marketEscrowMilli}<div>
              <dt>Market dividends held locally</dt>
              <dd>{amount(ledger.marketEscrowMilli)}</dd>
            </div>{/if}
          {#if ledger.releasedEscrowMilli}<div>
              <dt>Included credits released from unified systems</dt>
              <dd>{amount(ledger.releasedEscrowMilli)}</dd>
            </div>{/if}
          <div>
            <dt>Credits held in contested systems</dt>
            <dd>{amount(ledger.escrowMilli)}</dd>
          </div>
          <div>
            <dt>Fighters trained</dt>
            <dd>{ledger.fighters}</dd>
          </div>
          <div>
            <dt>Infantry recruited</dt>
            <dd>{ledger.infantry}</dd>
          </div>
          <div>
            <dt>Science earned</dt>
            <dd>{amount(ledger.scienceMilli)}</dd>
          </div>
          {#if ledger.discardedFighters || ledger.discardedInfantry}<div>
              <dt>Production discarded at force limit</dt>
              <dd>
                {ledger.discardedFighters} fighters · {ledger.discardedInfantry} infantry
              </dd>
            </div>{/if}
        </dl>{/if}
      {#if research}<section aria-label="Science progress">
          <h3>Science · {research.target}</h3>
          <p>
            Level {research.levels[research.target]} · {amount(
              research.progressMilli[research.target],
            )} science{research.levels[research.target] <
            rules.maximumResearchLevel
              ? ` of ${cost}`
              : " banked at the level cap"}
          </p>
          {#if research.levels[research.target] < rules.maximumResearchLevel}<progress
              aria-label="Science towards next level"
              max={cost * 1000}
              value={research.progressMilli[research.target]}
            ></progress>{/if}
          <p>New levels apply to production from the following tick.</p>
        </section>{/if}
      {#if research && onresearch}<CampaignResearch
          {research}
          scanningEnabled={view.scanningEnabled}
          travelEnabled={view.travelEnabled}
          constructionEnabled={view.construction != null}
          paused={view.pausedAt != null}
          {busy}
          {pending}
          message={commandKind === "research.select" ? message : ""}
          error={commandKind === "research.select" ? error : ""}
          onselect={onresearch}
          {onretry}
        />{/if}
      {#if !view.trades?.enabled && ontrade}<p class="review-note">
          This campaign retains its recorded economy. Credit offers are
          available in new development campaigns; its access and history remain
          available.
        </p>{/if}
      {#if view.productionEnabled}<section>
          <h3>Where production goes</h3>
          <p>
            Markets produce credits, camps train fighters, bases recruit
            infantry and stations earn science. Affinity and research modify
            their output. Fractional forces remain at their system until a whole
            unit is ready.
          </p>
          <p>
            Orbit receives fighters and science; the surface receives infantry.
            Credits are held in a system until one empire controls both layers.
          </p>
          <p class="review-note">
            Development campaign · Production rules remain under review.
          </p>
        </section>{/if}
    </div>
    <footer>
      {#if view.trades?.enabled && ontrade}<button
          bind:this={exchangeButton}
          class="focus-button"
          onclick={openExchange}>Credit offers</button
        >{/if}
      {#if view.economy && onfocus}<button
          bind:this={focusButton}
          class="focus-button"
          onclick={openFocus}>Market focus</button
        >{/if}
      <ActionButton class="primary" onclick={onclose}
        >Return to galaxy</ActionButton
      >
    </footer>
  </section>
{/if}

<style>
  .focus-host {
    height: 100%;
    min-height: 0;
  }
  .focus-button {
    min-height: 48px;
    padding: 12px 20px;
    background: #0b2631;
    border: 1px solid #7296a2;
    color: #fff;
    font: inherit;
  }
  .focus-button:focus-visible {
    outline: 2px solid #7ce9fa;
    outline-offset: 3px;
  }
  .economy-instrument {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 12px;
  }
  header {
    flex-shrink: 0;
  }
  h2 {
    font:
      500 34px "Cormorant Garamond",
      serif;
    margin: 4px 0;
  }
  p {
    line-height: 1.5;
  }
  header p {
    margin: 6px 0;
    color: var(--muted);
  }
  .economy-scroll {
    overflow: auto;
    overscroll-behavior: contain;
    min-height: 0;
    flex: 1;
    padding: 2px;
  }
  .economy-scroll:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  .balance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-block: 1px solid #566674;
    padding: 16px 0;
  }
  .balance strong {
    font:
      500 36px "Cormorant Garamond",
      serif;
    color: #c6b28a;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 12px 0;
    border-bottom: 1px solid #334a58;
  }
  dd {
    margin: 0;
    color: #b9ecf4;
    text-align: right;
  }
  h3 {
    font:
      500 26px "Cormorant Garamond",
      serif;
    text-transform: capitalize;
  }
  progress {
    width: 100%;
    height: 16px;
    accent-color: #c6b28a;
  }
  .review-note {
    color: #c6b28a;
  }
  footer {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  footer :global(button) {
    width: 100%;
    min-width: 0;
    white-space: normal;
  }
  @media (min-width: 2400px) {
    .economy-instrument {
      font-size: 22px;
    }
    h2 {
      font-size: 48px;
    }
    h3 {
      font-size: 34px;
    }
    footer :global(button) {
      font-size: 22px;
      min-height: 64px;
    }
  }
  @media (max-width: 700px) {
    h2 {
      font-size: 28px;
    }
    header p {
      font-size: 14px;
    }
  }
</style>
