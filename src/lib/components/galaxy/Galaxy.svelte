<script lang="ts">
  import { tick } from "svelte";
  import { Canvas } from "@threlte/core";
  import Scene from "./Scene.svelte";
  import type { CampaignView } from "@shared/campaign";
  import StellarArt from "../StellarArt.svelte";
  import CampaignRoster from "../CampaignRoster.svelte";
  import Feedback from "../Feedback.svelte";
  import ActionButton from "../ActionButton.svelte";
  import Icon from "../Icon.svelte";
  let {
    view,
    onback,
    onleave,
    onretry,
    message = "",
    error = "",
    busy = false,
    pending = false,
  }: {
    view: CampaignView;
    onback: () => void;
    onleave?: () => void;
    onretry?: () => void;
    message?: string;
    error?: string;
    busy?: boolean;
    pending?: boolean;
  } = $props();
  let roster = $state(false);
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
  <header class="command-rail">
    <div>
      <h1 id="galaxy-heading" tabindex="-1">{view.name}</h1>
      <span>Development · Rules under review</span>
    </div>
    <div class="campaign-facts">
      {#if view.empire}<span
          >Credits <strong>{view.empire.creditsMilli / 1000}</strong></span
        >{/if}<span
        >{view.phase === "active"
          ? "Campaign begun"
          : `${view.roster.length} / ${view.capacity} empires`}</span
      >
    </div>
    <ActionButton
      class="quiet"
      onclick={() => (roster = !roster)}
      aria-expanded={roster}>Roster</ActionButton
    ><ActionButton class="quiet" onclick={onback}>Campaigns</ActionButton>
  </header>
  <div class="acknowledgement">
    <Feedback {message} {error} />{#if onretry}<ActionButton
        disabled={busy}
        class="secondary"
        onclick={onretry}>{pending ? "Retry order" : "Reconnect"}</ActionButton
      >{/if}
  </div>
  <div
    class="chart"
    aria-label="Interactive galaxy chart. Drag to orbit and scroll to zoom. Use the systems list for keyboard selection."
  >
    <Canvas renderMode="on-demand"
      ><Scene
        stars={view.stars}
        owned={view.holdings.map((h) => h.starId)}
        selected={star.id}
        onselect={(id) => (selected = id)}
      /></Canvas
    >
  </div>
  <aside class="system-inspector" aria-label="Selected system">
    <p class="overline gold">{star.class}-class star</p>
    <h2><Icon kind="star" /> {star.name}</h2>
    <div class="system-details">
      <StellarArt stellarClass={star.class} />
      <p>
        {view.phase === "active"
          ? "Your knowledge of this system"
          : "Awaiting home assignment."}
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
            <dd>
              {holding.markets ?? "Unknown"} / {holding.camps ?? "Unknown"}
            </dd>
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
    </div>
    <ActionButton
      class="secondary"
      onclick={() => (listing = !listing)}
      data-focus="systems-list"
      aria-expanded={listing}>Systems list</ActionButton
    >
  </aside>
  {#if roster}<section class="roster-panel" aria-label="Campaign roster panel">
      <CampaignRoster game={view} />
      <div class="roster-actions">
        <ActionButton class="secondary" onclick={() => (roster = false)}
          >Close roster</ActionButton
        >{#if view.phase !== "active" && onleave}<ActionButton
            class="quiet"
            disabled={busy || pending}
            onclick={onleave}>Leave campaign</ActionButton
          >{/if}
      </div>
    </section>{/if}
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
    height: 100svh;
    min-height: 0;
    position: relative;
    isolation: isolate;
    background:
      radial-gradient(ellipse at 40% 45%, #73563833, transparent 45%),
      radial-gradient(ellipse at 50% 55%, #16385788, transparent 70%), #050c14;
  }
  .chart {
    isolation: isolate;
    z-index: 0;
    position: absolute;
    inset: 58px 20% 0 0;
  }
  .command-rail {
    position: absolute;
    inset: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 6px 20px;
    background: #07131ce8;
    border-bottom: 1px solid #627d89;
    z-index: 4;
    min-height: 58px;
  }
  .command-rail h1 {
    font:
      500 25px "Cormorant Garamond",
      serif;
    margin: 0;
  }
  .command-rail > div:first-child {
    margin-right: auto;
  }
  .command-rail > div > span {
    font-size: 12px;
    color: var(--muted);
  }
  .campaign-facts {
    display: flex;
    gap: 24px;
  }
  .acknowledgement {
    position: absolute;
    left: 20px;
    top: 68px;
    max-width: calc(100% - 400px);
    z-index: 3;
    pointer-events: none;
  }
  .acknowledgement :global(button) {
    pointer-events: auto;
  }
  .roster-panel {
    position: absolute;
    inset: 80px 24px auto auto;
    max-height: calc(100% - 110px);
    overflow: auto;
    max-width: 860px;
    width: calc(100% - 48px);
    padding: 24px;
    background: #07131cf8;
    border: 1px solid #9f8d66;
    z-index: 6;
    box-shadow: 0 20px 80px #000;
  }
  .roster-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    position: sticky;
    bottom: -24px;
    background: #07131c;
    padding: 12px 0;
  }
  .system-details {
    overflow: auto;
    min-height: 0;
    flex: 1;
  }
  .system-inspector {
    z-index: 2;
    display: flex;
    flex-direction: column;
    position: absolute;
    right: 24px;
    top: 96px;
    width: 310px;
    max-height: calc(100% - 120px);
    overflow: hidden;
    background: #07131ce8;
    border: 1px solid #b29e78;
    padding: 24px;
    box-shadow: 0 10px 36px #0008;
  }
  .system-inspector > :global(button) {
    background: linear-gradient(#163b4a, #0b2431);
    border-color: #8bd8e7;
    color: #effdff;
    flex-shrink: 0;
    margin-top: 12px;
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
  @media (min-width: 2400px) {
    .command-rail {
      min-height: 90px;
      padding: 10px 32px;
      gap: 32px;
    }
    .command-rail h1 {
      font-size: 36px;
    }
    .command-rail > div > span {
      font-size: 18px;
    }
    .command-rail :global(button) {
      font-size: 22px;
      min-height: 64px;
    }
    .chart {
      top: 90px;
    }
    .acknowledgement {
      top: 100px;
      left: 32px;
    }
    .acknowledgement :global(.notice) {
      font-size: 22px !important;
    }
    .system-inspector {
      width: 520px;
      right: 40px;
      top: 130px;
      padding: 32px;
      max-height: calc(100% - 170px);
      font-size: 24px;
    }
    .system-inspector p {
      font-size: 24px;
    }
    .system-inspector .overline {
      font-size: 18px;
    }
    h2 {
      font-size: 48px;
    }
    .system-inspector > :global(button) {
      font-size: 24px;
      min-height: 68px;
    }
  }
  @media (max-width: 700px) {
    .galaxy-surface {
      height: 100svh;
      min-height: 0;
    }
    .chart {
      inset: 58px 0 240px;
    }
    .command-rail {
      gap: 4px;
      padding: 4px 8px;
    }
    .command-rail h1 {
      font-size: 20px;
      max-width: 145px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .command-rail > div > span {
      font-size: 10px;
    }
    .command-rail :global(button) {
      padding: 8px;
      font-size: 13px;
      min-width: 48px;
    }
    .campaign-facts {
      display: none;
    }
    .acknowledgement {
      top: 66px;
      left: 12px;
      max-width: calc(100% - 24px);
      font-size: 14px;
    }
    .roster-panel {
      inset: 66px 12px 12px;
      width: auto;
      padding: 16px;
      max-height: none;
    }
    .system-details {
      overflow: auto;
      min-height: 0;
      flex: 1;
    }
    .system-inspector {
      display: flex;
      flex-direction: column;
      inset: auto 12px 12px;
      width: auto;
      max-height: 44%;
      padding-bottom: max(16px, env(safe-area-inset-bottom));
      padding: 16px;
    }
    .system-inspector > p {
      font-size: 12px;
    }
    .system-inspector p {
      margin: 6px 0;
    }
    .system-inspector > :global(button) {
      background: linear-gradient(#163b4a, #0b2431);
      border-color: #8bd8e7;
      color: #effdff;
      flex-shrink: 0;
      margin-top: 12px;
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
