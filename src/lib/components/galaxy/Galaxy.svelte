<script lang="ts">
  import { tick, onDestroy } from "svelte";
  import type { Technology } from "@shared/production";
  import SystemObservation from "../SystemObservation.svelte";
  import type { Allocation } from "@shared/market-focus";
  import SystemConstruction from "../SystemConstruction.svelte";
  import type { Development } from "@shared/construction";
  import CampaignEconomy from "../CampaignEconomy.svelte";
  import CampaignHistory from "../CampaignHistory.svelte";
  import {
    HistoryEpochChanged,
    type HistoryCursor,
    type HistoryPage,
  } from "$lib/campaign-history";
  import { Canvas } from "@threlte/core";
  import Scene from "./Scene.svelte";
  import type { CampaignView } from "@shared/campaign";
  import ChartControls from "./ChartControls.svelte";
  import type { StarClass } from "@shared/rules";
  import StellarArt from "../StellarArt.svelte";
  import CampaignMaintenance from "../CampaignMaintenance.svelte";
  import CampaignRoster from "../CampaignRoster.svelte";
  import Feedback from "../Feedback.svelte";
  import ActionButton from "../ActionButton.svelte";
  import Icon from "../Icon.svelte";
  let {
    view,
    loadHistory,
    onback,
    onleave,
    onmaintenance,
    onresearch,
    onfocus,
    onbuild,
    oncancel,
    onmigrate,
    realAvailable = false,
    migration = null,
    onretry,
    message = "",
    commandKind = "",
    error = "",
    busy = false,
    pending = false,
  }: {
    view: CampaignView;
    loadHistory?: (cursor: HistoryCursor | null) => Promise<HistoryPage>;
    onback: () => void;
    onleave?: () => void;
    onmaintenance?: () => void;
    onfocus?: (allocation: Allocation) => void;
    onresearch?: (target: Technology) => void;
    onbuild?: (starId: string, type: Development) => void;
    oncancel?: (orderId: string) => void;
    onmigrate?: (mode: "mock" | "real") => void;
    realAvailable?: boolean;
    migration?: CampaignView["migration"];
    onretry?: () => void;
    message?: string;
    commandKind?: string;
    error?: string;
    busy?: boolean;
    pending?: boolean;
  } = $props();
  let observation = $state(false);
  let construction = $state(false);
  let economy = $state(false);
  let history = $state(false);
  let records = $state<CampaignView[]>([]);
  let cursor = $state<HistoryCursor | null>(null);
  let historyLoading = $state(false);
  let historyError = $state("");
  let historySerial = 0;
  let retryCursor: HistoryCursor | null = null;
  onDestroy(() => {
    historySerial++;
  });
  async function readHistory(after: HistoryCursor | null = null) {
    if (!loadHistory) return;
    const serial = ++historySerial;
    const openingControl =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    retryCursor = after;
    historyLoading = true;
    historyError = "";
    await tick();
    if (serial !== historySerial) return;
    if (history && document.activeElement === document.body)
      document.querySelector<HTMLElement>(".history-panel")?.focus();
    try {
      const page = await loadHistory(after);
      if (serial !== historySerial) return;
      records = after ? [...records, ...page.records] : page.records;
      cursor = page.cursor;
      if (!after) {
        await tick();
        document
          .querySelector(".history-panel .history-scroll")
          ?.scrollTo(0, 0);
      }
    } catch (error) {
      if (serial !== historySerial) return;
      historyError =
        error instanceof HistoryEpochChanged
          ? error.message
          : "History could not be recovered. Check your connection and retry. Your current records remain in place.";
    } finally {
      if (serial === historySerial) {
        historyLoading = false;
        await tick();
        if (
          history &&
          serial === historySerial &&
          document.activeElement === document.body
        ) {
          if (
            openingControl?.isConnected &&
            openingControl.closest(".history-panel")
          )
            openingControl.focus();
          else document.querySelector<HTMLElement>(".history-panel")?.focus();
        }
      }
    }
  }
  async function closeHistory() {
    history = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="history"]')?.focus();
  }
  let roster = $state(false);
  let selected = $state("");
  let stellarClass = $state<StarClass | "all">("all");
  let cameraRequest = $state({ action: "overview", starId: "", sequence: 0 });
  function move(
    action: "selected" | "home" | "overview" | "in" | "out" | "left" | "right",
  ) {
    if (action === "home" && view.own.home) selected = view.own.home;
    cameraRequest = {
      action,
      starId: action === "home" ? (view.own.home ?? "") : star.id,
      sequence: cameraRequest.sequence + 1,
    };
    void closeList();
  }
  const filtered = $derived(
    view.stars.filter(
      (s) => stellarClass === "all" || s.class === stellarClass,
    ),
  );
  let query = $state("");
  let listing = $state(false);
  async function openPanel(
    kind: "roster" | "systems" | "history" | "economy" | "construction",
  ) {
    construction = kind === "construction";
    economy = kind === "economy";
    history = kind === "history";
    if (history && !records.length) void readHistory();
    roster = kind === "roster";
    listing = kind === "systems";
    await tick();
    if (construction)
      document.querySelector<HTMLElement>(".construction-panel")?.focus();
    else if (economy)
      document.querySelector<HTMLElement>(".economy-panel")?.focus();
    else if (history)
      document.querySelector<HTMLElement>(".history-panel")?.focus();
    else if (listing) document.getElementById("system-search")?.focus();
    else document.querySelector<HTMLElement>(".roster-panel")?.focus();
  }
  async function closeRoster() {
    roster = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="roster"]')?.focus();
  }
  async function closeEconomy() {
    economy = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="economy"]')?.focus();
  }
  async function closeConstruction() {
    construction = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="construction"]')?.focus();
  }
  function panelKeys(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      void (construction
        ? closeConstruction()
        : economy
          ? closeEconomy()
          : history
            ? closeHistory()
            : roster
              ? closeRoster()
              : closeList());
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled),input,select,summary,a[href],[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === event.currentTarget)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
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
    filtered.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
  );
</script>

<div class="galaxy-surface">
  <header
    class="command-rail"
    inert={roster || listing || history || economy || construction}
  >
    <div>
      <h1 id="galaxy-heading" tabindex="-1">{view.name}</h1>
      <span
        >{view.pausedAt != null
          ? "Paused · Development maintenance"
          : "Development · Rules under review"}</span
      >
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
      onclick={() => openPanel("roster")}
      data-focus="roster"
      aria-expanded={roster}>Roster</ActionButton
    ><ActionButton class="quiet" onclick={onback}>Campaigns</ActionButton>
  </header>
  {#if !roster}<div
      class="acknowledgement"
      inert={listing || history || economy || construction}
    >
      <Feedback {message} {error} />{#if onretry}<ActionButton
          disabled={busy}
          class="secondary"
          onclick={onretry}
          >{pending ? "Retry order" : "Reconnect"}</ActionButton
        >{/if}
    </div>{/if}
  <div
    class="chart"
    inert={roster || listing || history || economy || construction}
    aria-label="Interactive galaxy chart. Drag to orbit and scroll to zoom. Use the systems list for keyboard selection."
  >
    <Canvas renderMode="on-demand"
      ><Scene
        stars={view.stars}
        owned={view.holdings.map((h) => h.starId)}
        selected={star.id}
        {stellarClass}
        {cameraRequest}
        onselect={(id) => (selected = id)}
      /></Canvas
    >
  </div>
  <aside
    inert={roster || listing || history || economy || construction}
    class="system-inspector"
    class:observing={observation}
    aria-label="Selected system"
  >
    <p class="overline gold">{star.class}-class star</p>
    <h2><Icon kind="star" /> {star.name}</h2>
    <div class="knowledge-tabs" role="group" aria-label="System information">
      <ActionButton
        class="secondary"
        aria-pressed={!observation}
        onclick={() => (observation = false)}>System</ActionButton
      ><ActionButton
        class="secondary"
        aria-pressed={observation}
        onclick={() => (observation = true)}>Observation</ActionButton
      >
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (This bounded intelligence panel needs keyboard scrolling.) -->
    <div
      class="system-details"
      role="region"
      aria-label="System details"
      tabindex="0"
    >
      {#if observation}<SystemObservation {view} starId={star.id} />{:else}
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
      {/if}
    </div>
    <div class="system-actions">
      {#if holding && view.productionEnabled && onbuild}<ActionButton
          class="secondary"
          data-focus="construction"
          aria-expanded={construction}
          onclick={() => openPanel("construction")}>Develop</ActionButton
        >{/if}
      <ActionButton
        class="secondary"
        onclick={() => openPanel("systems")}
        data-focus="systems-list"
        aria-expanded={listing}>Systems list</ActionButton
      >
      {#if loadHistory}<ActionButton
          class="secondary"
          data-focus="history"
          aria-expanded={history}
          onclick={() => openPanel("history")}>History</ActionButton
        >{/if}
      <ActionButton
        class="secondary"
        data-focus="economy"
        aria-expanded={economy}
        onclick={() => openPanel("economy")}>Economy</ActionButton
      >
    </div>
  </aside>
  {#if construction}<div
      class="construction-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label="System construction panel"
      onkeydown={panelKeys}
    >
      <SystemConstruction
        {view}
        starId={star.id}
        onbuild={(type) => onbuild?.(star.id, type)}
        {oncancel}
        onclose={closeConstruction}
        {onretry}
        {busy}
        {pending}
        message={commandKind.startsWith("construction.") ? message : ""}
        {error}
      />
    </div>{/if}
  {#if economy}<div
      class="history-panel economy-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-label="Empire economy panel"
      onkeydown={panelKeys}
    >
      <CampaignEconomy
        {view}
        onclose={closeEconomy}
        {onresearch}
        {onfocus}
        {commandKind}
        {message}
        {error}
        {busy}
        {pending}
        {onretry}
      />
    </div>{/if}
  {#if history}<div
      class="history-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Campaign history panel"
      tabindex="-1"
      onkeydown={panelKeys}
    >
      <CampaignHistory
        {records}
        loading={historyLoading}
        error={historyError}
        earlier={!!cursor}
        newer={!!records.length && view.revision > records[0].revision}
        onearlier={() => readHistory(cursor)}
        onlatest={() => readHistory()}
        onretry={() => readHistory(retryCursor)}
        onclose={closeHistory}
      />
    </div>{/if}
  {#if roster}<div
      class="roster-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={panelKeys}
      aria-label="Campaign roster panel"
    >
      <CampaignRoster game={view} />
      <Feedback {message} {error} />
      {#if onretry}<ActionButton
          disabled={busy}
          class="secondary"
          onclick={onretry}
          >{pending ? "Retry order" : "Reconnect"}</ActionButton
        >{/if}
      <div class="roster-actions">
        <ActionButton class="secondary" onclick={closeRoster}
          >Close roster</ActionButton
        >{#if view.phase !== "active" && onleave}<ActionButton
            class="quiet"
            disabled={busy || pending || view.pausedAt != null}
            onclick={onleave}>Leave campaign</ActionButton
          >{/if}
      </div>
      {#if onmaintenance}<CampaignMaintenance
          paused={view.pausedAt != null}
          {busy}
          {pending}
          onchange={onmaintenance}
          {onmigrate}
          {realAvailable}
          {migration}
          mode={view.mode}
          exposed={view.mockExposed}
        />{/if}
    </div>{/if}
  {#if listing}<div
      class="systems-list"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={panelKeys}
      aria-label="Systems list"
    >
      <div class="list-body">
        <ChartControls
          bind:stellarClass
          onmove={move}
          homeAvailable={!!view.own.home}
        />
        <p>
          {filtered.length} systems · {stellarClass === "all"
            ? "All classes"
            : `${stellarClass} class`}
        </p>
        {#if stellarClass !== "all" && star.class !== stellarClass}<p>
            The selected system remains visible on the chart.
          </p>{/if}
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
      </div>
      <ActionButton class="secondary" onclick={() => closeList()}
        >Close list</ActionButton
      >
    </div>{/if}
</div>

<style>
  .knowledge-tabs {
    display: flex;
    gap: 8px;
    flex: none;
  }
  .knowledge-tabs :global(button) {
    min-height: 44px;
    flex: 1;
    padding: 8px;
  }
  .knowledge-tabs :global([aria-pressed="true"]) {
    border-color: #7ce9fa;
    background: #143944;
  }
  .construction-panel {
    position: absolute;
    inset: 58px 0 0;
    z-index: 6;
    background: #06121a;
    overflow: hidden;
  }
  @media (min-width: 2500px) {
    .construction-panel {
      top: 90px;
    }
  }
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
    overflow: hidden;
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
    background: #07131c;
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
  .history-panel {
    position: absolute;
    inset: 80px auto 24px 24px;
    width: min(620px, calc(100% - 48px));
    padding: 24px;
    z-index: 6;
    background: #07131c;
    border: 1px solid #b29e78;
    box-shadow: 0 20px 80px #000;
  }
  .roster-panel {
    position: absolute;
    inset: 80px 24px auto auto;
    max-height: calc(100% - 110px);
    overflow: auto;
    max-width: 860px;
    width: calc(100% - 48px);
    padding: 24px;
    background: #07131c;
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
  .system-actions {
    display: flex;
    flex-direction: column;
  }
  .system-details:focus-visible {
    outline: 2px solid #91dcec;
    outline-offset: 2px;
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
    background: #07131c;
    border: 1px solid #b29e78;
    padding: 24px;
    box-shadow: 0 10px 36px #0008;
  }
  .system-actions :global(button) {
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
    width: 360px;
    max-height: calc(100% - 110px);
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #07131c;
    padding: 20px;
    border: 1px solid #b29e78;
  }
  .list-body {
    overflow: auto;
    min-height: 0;
  }
  .systems-list > :global(button) {
    flex-shrink: 0;
  }
  .system-results {
    margin-top: 12px;
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
  .list-body :global(:focus-visible) {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  .list-body > label {
    display: block;
    margin-bottom: 12px;
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
    .history-panel {
      inset: 130px auto 40px 40px;
      width: 900px;
      padding: 32px;
    }
    .systems-list {
      width: 560px;
      font-size: 24px;
    }
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
    .system-actions :global(button) {
      font-size: 24px;
      min-height: 68px;
    }
  }
  @media (max-width: 700px) {
    .system-actions {
      flex-direction: row;
      gap: 8px;
    }
    .system-actions :global(button) {
      flex: 1;
      min-width: 0;
      padding: 8px;
      font-size: 13px;
    }
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
    .history-panel {
      inset: 66px 12px 12px;
      width: auto;
      padding: 16px;
    }
    .roster-panel {
      inset: 66px 12px 12px;
      width: auto;
      padding: 16px;
      max-height: none;
    }
    .system-details:focus-visible {
      outline: 2px solid #91dcec;
      outline-offset: 2px;
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
    .system-inspector.observing {
      height: 70%;
      max-height: 70%;
    }
    .system-inspector > p {
      font-size: 12px;
    }
    .system-inspector p {
      margin: 6px 0;
    }
    .system-actions :global(button) {
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
      inset: 66px 12px 12px;
      width: auto;
      max-height: none;
      z-index: 6;
    }
    .system-results {
      flex: 1;
    }
  }
</style>
