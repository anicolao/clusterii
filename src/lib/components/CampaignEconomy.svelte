<script lang="ts">
  import CampaignResearch from "./CampaignResearch.svelte";
  import type { Technology } from "@shared/production";
  import { onMount } from "svelte";
  import type { CampaignView } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  let {
    view,
    onclose,
    inspectTime,
    onresearch,
    message = "",
    error = "",
    busy = false,
    pending = false,
    onretry,
  }: {
    view: CampaignView;
    onclose: () => void;
    inspectTime?: number;
    onresearch?: (target: Technology) => void;
    message?: string;
    error?: string;
    busy?: boolean;
    pending?: boolean;
    onretry?: () => void;
  } = $props();
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

<section class="economy-instrument" aria-label="Empire economy">
  <header>
    <p class="overline gold">Your empire</p>
    <h2>Economy</h2>
    <p role="status" aria-label="Production schedule">
      {#if !view.productionEnabled}This campaign preserves its earlier behavior
        and does not produce resources. Create a new development campaign to
        play with production.{:else if view.pausedAt != null}Production is
        paused. Remaining time resumes with the campaign.{:else if !view.production}Production
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
        paused={view.pausedAt != null}
        {busy}
        {pending}
        {message}
        {error}
        onselect={onresearch}
        {onretry}
      />{/if}
    {#if view.productionEnabled}<section>
        <h3>Where production goes</h3>
        <p>
          Markets produce credits, camps train fighters, bases recruit infantry
          and stations earn science. Affinity and research modify their output.
          Fractional forces remain at their system until a whole unit is ready.
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
    <ActionButton class="primary" onclick={onclose}
      >Return to galaxy</ActionButton
    >
  </footer>
</section>

<style>
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
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  footer :global(button) {
    width: 100%;
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
