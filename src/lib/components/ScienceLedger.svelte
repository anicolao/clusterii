<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import ActionButton from "./ActionButton.svelte";
  import DevelopmentIcon from "./DevelopmentIcon.svelte";
  let { view, onclose }: { view: CampaignView; onclose: () => void } = $props();
  const rate = $derived(view.economy?.science);
  const amount = (milli: number) =>
    (milli / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
</script>

<section
  class="science-ledger"
  aria-label="Science sources"
  style={`--station: url('${base}/art/construction-station.webp')`}
>
  <header>
    <p class="overline gold">Your orbital science</p>
    <h2 tabindex="-1" data-science-heading>
      <DevelopmentIcon type="station" /> Science per tick
    </h2>
    {#if rate}<p class="rate">
        <strong>+{amount(rate.scienceMilli)}</strong> / tick
      </p>{/if}
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Bounded ledger owns unmodified Home/End keyboard reading.) -->
  <div
    class="reading"
    role="region"
    aria-label="Science source ledger"
    tabindex="0"
    onkeydown={(event) => {
      if (
        event.target !== event.currentTarget ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        event.currentTarget.scrollTop =
          event.key === "Home" ? 0 : event.currentTarget.scrollHeight;
      }
    }}
  >
    {#if !rate}<p>
        This revision does not record a current science rate. Last delivered
        output is not a substitute for current capacity.
      </p>
    {:else}
      <p role="status" aria-label="Science rate basis">
        Confirmed tick {rate.tick} · current orbital control and completed stations.
      </p>
      {#if view.pausedAt != null}<p>
          Production is paused. This is capacity per tick; no science is
          delivered while paused.
        </p>{/if}
      <p>
        Assumes unchanged control, stations and research levels. Queued
        construction and future arrivals can change the next output.
      </p>
      <h3>Orbital sources</h3>
      {#if !rate.sources.length}<p>
          No orbital sources under your control. Current output is zero.
        </p>{/if}
      {#each rate.sources as source (source.starId)}
        <article
          aria-label={`Science from ${view.stars.find((star) => star.id === source.starId)?.name ?? source.starId}`}
        >
          <h4>
            {view.stars.find((star) => star.id === source.starId)?.name ??
              source.starId}
          </h4>
          <dl>
            <div>
              <dt>Completed stations</dt>
              <dd>{source.stations}</dd>
            </div>
            <div>
              <dt>Base science</dt>
              <dd>{amount(source.baseMilli)}</dd>
            </div>
            <div>
              <dt>Faction affinity</dt>
              <dd>×{amount(source.affinityMilli)}</dd>
            </div>
            <div>
              <dt>After Terraforming {rate.terraformingLevel}</dt>
              <dd>{amount(source.scienceMilli)} / tick</dd>
            </div>
          </dl>
        </article>
      {/each}
      <h3>Empire total</h3>
      <dl>
        <div>
          <dt>Before Innovation</dt>
          <dd>{amount(rate.orbitalScienceMilli)}</dd>
        </div>
        <div>
          <dt>After Innovation {rate.innovationLevel}</dt>
          <dd>{amount(rate.scienceMilli)} / tick</dd>
        </div>
        <div>
          <dt>Last delivered science</dt>
          <dd>
            {view.economy?.ledger
              ? amount(view.economy.ledger.scienceMilli)
              : "First production pending"}
          </dd>
        </div>
      </dl>
      <p>
        Terraforming applies to each system, then Innovation applies to the
        empire total. Output is floored to thousandths by the recorded ruleset.
      </p>
      <p class="policy">Development rules remain under review.</p>
    {/if}
  </div>
  <footer>
    <ActionButton class="secondary" onclick={onclose}
      >Return to galaxy</ActionButton
    >
  </footer>
</section>

<style>
  .science-ledger {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    color: #edf5f2;
    background:
      linear-gradient(#061722c9, #06131cf5 36%),
      var(--station) center top / cover;
  }
  header {
    padding: 24px;
    border-bottom: 1px solid #75c9db66;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 14px;
    font:
      500 36px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  .rate {
    margin: 8px 0 0;
    color: #9deeff;
  }
  .rate strong {
    font-size: 32px;
  }
  .reading {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding: 20px 24px;
  }
  .reading:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  h3 {
    font:
      500 26px "Cormorant Garamond",
      serif;
  }
  h4 {
    font-size: 18px;
    margin: 0 0 14px;
  }
  article {
    padding: 16px;
    margin: 16px 0;
    border: 1px solid #89c9d555;
    background: #071b25d9;
  }
  dl {
    margin: 0;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 8px 0;
    border-bottom: 1px solid #89c9d533;
  }
  dd {
    margin: 0;
    text-align: right;
    color: #a7edf3;
  }
  p {
    line-height: 1.5;
  }
  .policy {
    color: #dec08a;
  }
  footer {
    padding: 16px 24px;
    border-top: 1px solid #89c9d555;
    background: #07131c;
  }
  footer :global(button) {
    width: 100%;
    min-height: 52px;
  }
  @media (min-width: 2500px) {
    header,
    .reading {
      padding: 32px;
      font-size: 24px;
    }
    h2 {
      font-size: 52px;
    }
    h3 {
      font-size: 38px;
    }
    h4 {
      font-size: 28px;
    }
    .rate strong {
      font-size: 48px;
    }
    footer :global(button) {
      font-size: 26px;
      min-height: 72px;
    }
  }
  @media (max-width: 700px), (max-height: 800px) {
    header {
      padding: 16px;
    }
    h2 {
      font-size: 28px;
    }
    .rate strong {
      font-size: 26px;
    }
    .reading {
      padding: 12px 16px;
    }
    footer {
      padding: 12px 16px;
    }
  }
</style>
