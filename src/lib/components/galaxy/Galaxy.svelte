<script lang="ts">
  import { tick } from "svelte";
  import { Canvas } from "@threlte/core";
  import Scene from "./Scene.svelte";
  import type { CampaignView } from "@shared/campaign";
  import ActionButton from "../ActionButton.svelte";
  import Icon from "../Icon.svelte";
  let { view }: { view: CampaignView } = $props();
  let selected = $state("");
  let query = $state("");
  let listing = $state(false);
  async function closeList(id?: string) {
    if (id) selected = id;
    listing = false;
    await tick();
    document
      .querySelector<HTMLButtonElement>('[data-focus="systems-list"]')
      ?.focus();
  }
  const star = $derived(
    view.stars.find((s) => s.id === selected) ??
      view.stars.find((s) => s.id === view.own.home) ??
      view.stars[0],
  );
  const holding = $derived(view.holdings.find((h) => h.starId === star?.id));
  const visible = $derived(
    view.stars.filter((s) =>
      s.name.toLowerCase().includes(query.toLowerCase()),
    ),
  );
</script>

<div class="galaxy-surface">
  <div
    class="chart"
    aria-label="Interactive galaxy chart. Drag to orbit and scroll to zoom. Use the systems list for keyboard selection."
  >
    <Canvas renderMode="on-demand"
      ><Scene
        stars={view.stars}
        selected={star.id}
        onselect={(id) => (selected = id)}
      /></Canvas
    >
  </div>
  <div class="chart-heading">
    <p class="overline">{view.name}</p>
    <p>
      {view.phase === "active"
        ? "Your command among the stars"
        : `${view.roster.length} of ${view.capacity} empires assembled`}
    </p>
    {#if view.empire}<p>Credits {view.empire.creditsMilli / 1000}</p>{/if}
  </div>
  <aside class="system-inspector" aria-label="Selected system">
    <p class="overline gold">{star.class}-class star</p>
    <h2><Icon kind="star" /> {star.name}</h2>
    <p>
      {view.phase === "active"
        ? "Your knowledge of this system"
        : "The galaxy catalogue is charted. Homes are assigned when the campaign begins."}
    </p>
    <dl>
      <div>
        <dt>Orbit</dt>
        <dd>{holding?.orbit ?? "Unknown"}</dd>
      </div>
      <div>
        <dt>Surface</dt>
        <dd>{holding?.surface ?? "Unknown"}</dd>
      </div>
      {#if holding}<div>
          <dt>Fighters</dt>
          <dd>{holding.fighters ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Infantry</dt>
          <dd>{holding.infantry ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Markets / Camps</dt>
          <dd>{holding.markets ?? "Unknown"} / {holding.camps ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Bases / Stations</dt>
          <dd>
            {holding.bases ?? "Unknown"} / {holding.stations ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt>Held credits</dt>
          <dd>
            {holding.escrowMilli === undefined
              ? "Unknown"
              : holding.escrowMilli / 1000}
          </dd>
        </div>{/if}
    </dl>
    <ActionButton
      class="secondary"
      onclick={() => (listing = !listing)}
      data-focus="systems-list"
      aria-expanded={listing}>Systems list</ActionButton
    >
  </aside>
  {#if listing}<section class="systems-list" aria-label="Systems list">
      <label for="system-search">Find a system</label><input
        id="system-search"
        type="search"
        bind:value={query}
      />
      <div class="system-results">
        {#each visible as item}<ActionButton
            class={item.id === star.id ? "current-system" : ""}
            onclick={() => closeList(item.id)}
            aria-label={`Select ${item.name}, ${item.class} class`}
            >{item.name}<span>{item.class}</span></ActionButton
          >{/each}
      </div>
      <ActionButton class="secondary" onclick={() => closeList()}
        >Close list</ActionButton
      >
    </section>{/if}
</div>

<style>
  .galaxy-surface {
    height: calc(100svh - 260px);
    min-height: 480px;
    position: relative;
    isolation: isolate;
    background:
      radial-gradient(ellipse at 40% 45%, #73563833, transparent 45%),
      radial-gradient(ellipse at 50% 55%, #16385788, transparent 70%), #050c14;
  }
  .chart {
    position: absolute;
    inset: 0 20% 0 0;
  }
  .chart-heading {
    position: absolute;
    top: 20px;
    left: 24px;
    pointer-events: none;
  }
  .chart-heading p {
    margin: 8px 0;
  }
  .system-inspector {
    position: absolute;
    right: 24px;
    top: 24px;
    width: 310px;
    max-height: calc(100% - 48px);
    overflow: auto;
    background: #07131ce8;
    border: 1px solid #b29e78;
    padding: 24px;
    box-shadow: 0 10px 36px #0008;
  }
  h2 {
    font:
      500 34px "Cormorant Garamond",
      serif;
    margin: 10px 0 16px;
  }
  .system-inspector p {
    font-size: 16px;
    line-height: 1.5;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid #5c687177;
  }
  dd {
    margin: 0;
    color: #9ee9ff;
  }
  .systems-list {
    position: absolute;
    left: 24px;
    bottom: 24px;
    width: 300px;
    max-height: 75%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #07131cf5;
    padding: 20px;
    border: 1px solid #b29e78;
  }
  .system-results {
    overflow: auto;
    min-height: 0;
  }
  .system-results :global(button) {
    display: flex;
    width: 100%;
    justify-content: space-between;
    padding: 12px;
    background: transparent;
    border-bottom: 1px solid #33404a;
  }
  .system-results :global(.current-system) {
    border-color: #9ee9ff;
    color: #9ee9ff;
  }
  input {
    min-height: 48px;
    padding: 10px;
    width: 100%;
    background: #101e2a;
    color: inherit;
    border: 1px solid #87919a;
  }
  @media (max-width: 700px) {
    .galaxy-surface {
      height: calc(100svh - 230px);
      min-height: 500px;
    }
    .chart {
      inset: 0 0 190px;
    }
    .chart-heading {
      left: 16px;
      top: 10px;
      font-size: 14px;
    }
    .system-inspector {
      inset: auto 12px 12px;
      width: auto;
      max-height: 42%;
      padding: 16px;
    }
    .system-inspector p {
      margin: 6px 0;
    }
    h2 {
      font-size: 28px;
      margin: 5px 0;
    }
    .system-inspector dl div {
      padding: 8px 0;
    }
    .systems-list {
      inset: 12px;
      width: auto;
      max-height: none;
      z-index: 2;
    }
    .system-results {
      flex: 1;
    }
  }
</style>
