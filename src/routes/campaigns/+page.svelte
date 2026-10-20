<script lang="ts">
  import { ReceiptMismatch } from "@shared/command-receipt";
  import {
    campaignFeedback,
    campaignPendingMessage,
    campaignNetworkMessage,
  } from "$lib/campaign-feedback";
  import {
    requestedCampaign,
    rememberCampaign,
  } from "$lib/campaign-navigation";
  import { goto } from "$app/navigation";
  import { onMount, tick } from "svelte";
  import { base } from "$app/paths";
  import type {
    CampaignAction,
    CampaignDirectory,
    CampaignView,
  } from "@shared/campaign";
  import { rules, type FactionId } from "@shared/rules";
  import type { PendingCampaign } from "$lib/campaign-session";
  import ActionButton from "$lib/components/ActionButton.svelte";
  import Feedback from "$lib/components/Feedback.svelte";
  import FactionPicker from "$lib/components/FactionPicker.svelte";
  import CampaignRoster from "$lib/components/CampaignRoster.svelte";
  import PortraitPicker from "$lib/components/PortraitPicker.svelte";
  import type { Portrait } from "@shared/profile";
  let portrait = $state<Portrait>("G1");
  import Galaxy from "$lib/components/galaxy/Galaxy.svelte";
  let service: typeof import("$lib/campaign-session");
  let account = $state<string | null>(null);
  let access = $state<"loading" | "signed-out" | "restricted" | "developer">(
    "loading",
  );
  let games = $state<CampaignDirectory[]>([]);
  let memberships = $state<string[]>([]);
  let section = $state<"joined" | "joinable">("joined");
  const listed = $derived(
    games.filter((game) =>
      section === "joined"
        ? memberships.includes(game.id)
        : game.phase === "waiting" && !memberships.includes(game.id),
    ),
  );
  let stopMemberships = () => {};
  let selected = $state<string | null>(null);
  let view = $state<CampaignView | null>(null);
  let loading = $state(false);
  let creating = $state(false);
  let name = $state("");
  let capacity = $state(4);
  let encryption = $state<"mock" | "real">("mock");
  let realAvailable = $state(false);
  let faction = $state<FactionId>("heliac");
  let joinTab = $state<"faction" | "portrait" | "briefing">("faction");
  let pending = $state<PendingCampaign | null>(null);
  let busy = $state(false);
  let message = $state("");
  let error = $state("");
  let remedy = $state<"network" | "validation" | "conflict" | null>(null);
  let title = $state<HTMLHeadingElement>();
  let generation = 0;
  let selection = 0;
  let stopDirectory = () => {};
  let stopView = () => {};
  let stopReceipt = () => {};
  let timer: ReturnType<typeof setTimeout>;
  const game = $derived(games.find((g) => g.id === selected));
  $effect(() => {
    if (game?.migration && pending?.kind === "campaign.migrate") {
      clearTimeout(timer);
      message =
        "Encryption change is in progress. The campaign remains paused during verification.";
    }
  });
  function failed(failure?: unknown) {
    if (failure instanceof ReceiptMismatch) {
      stopReceipt();
      clearTimeout(timer);
      pending = null;
      busy = false;
      message = "";
      error = failure.message;
      remedy = "validation";
      void tick().then(() =>
        document.querySelector<HTMLElement>('[role="alert"]')?.focus(),
      );
      return;
    }
    error = campaignNetworkMessage;
    remedy = "network";
    busy = false;
    clearTimeout(timer);
  }
  async function select(id: string) {
    const current = ++selection;
    const session = generation;
    let focused = false;
    stopView();
    selected = id;
    void goto(`${base}/campaigns/?campaign=${encodeURIComponent(id)}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
    view = null;
    loading = true;
    creating = false;
    try {
      const stop = await service.observeCampaign(
        id,
        account!,
        (next) => {
          if (session !== generation || current !== selection) return;
          view = next;
          if (next?.phase === "active" && account)
            rememberCampaign(account, next.id);
          loading = false;
          if (!focused) {
            focused = true;
            void tick().then(() => {
              if (session !== generation || current !== selection) return;
              if (next) document.getElementById("galaxy-heading")?.focus();
              else title?.focus();
            });
          }
        },
        failed,
      );
      if (session !== generation || current !== selection) stop();
      else stopView = stop;
    } catch (reason) {
      if (session === generation && current === selection) {
        loading = false;
        if (
          reason &&
          typeof reason === "object" &&
          "code" in reason &&
          reason.code === "functions/not-found"
        ) {
          error =
            "This campaign is no longer available. Return to all campaigns to choose another.";
          remedy = "validation";
        } else failed();
      }
    }
    await tick();
    if (view) document.getElementById("galaxy-heading")?.focus();
    else title?.focus();
  }
  async function recover() {
    if (!account || !service) return;
    error = "";
    remedy = null;
    const session = generation;
    try {
      if (!(await service.developerAccess())) {
        access = "restricted";
        return;
      }
      if (session !== generation) return;
      access = "developer";
      realAvailable = await service.encryptionAvailable();
      if (session !== generation) return;
      stopDirectory();
      stopMemberships();
      stopMemberships = service.observeMemberships(
        account,
        (ids) => {
          if (session === generation) memberships = ids;
        },
        failed,
      );
      stopDirectory = service.observeDirectory((next) => {
        if (session === generation) games = next;
      }, failed);
      if (selected) await select(selected);
      if (pending) dispatch();
    } catch {
      if (session === generation) failed();
    }
  }
  onMount(() => {
    let disposed = false;
    let stopAuth = () => {};
    void Promise.all([import("$lib/session"), import("$lib/campaign-session")])
      .then(([auth, campaigns]) => {
        if (disposed) return;
        service = campaigns;
        stopAuth = auth.observeAccount((user) => {
          generation++;
          selection++;
          stopDirectory();
          stopView();
          stopReceipt();
          clearTimeout(timer);
          memberships = [];
          stopMemberships();
          games = [];
          view = null;
          selected = requestedCampaign(location.search);
          pending = null;
          busy = false;
          error = "";
          message = "";
          remedy = null;
          account = user?.uid ?? null;
          access = user ? "loading" : "signed-out";
          if (user) void recover();
        });
      })
      .catch(failed);
    return () => {
      disposed = true;
      generation++;
      selection++;
      stopAuth();
      stopMemberships();
      stopDirectory();
      stopView();
      stopReceipt();
      clearTimeout(timer);
    };
  });
  function dispatch() {
    if (!pending || !account) return;
    const command = pending;
    const session = generation;
    busy = true;
    error = "";
    remedy = null;
    message = campaignPendingMessage;
    stopReceipt();
    clearTimeout(timer);
    stopReceipt = service.sendCampaign(
      account,
      command,
      (receipt) => {
        if (session !== generation) return;
        stopReceipt();
        clearTimeout(timer);
        busy = false;
        pending = null;
        const feedback = campaignFeedback(command.kind, receipt);
        message = feedback.message;
        error = feedback.error;
        remedy = feedback.remedy;
        if (
          receipt.status === "accepted" &&
          !["campaign.pause", "campaign.resume"].includes(command.kind)
        )
          void select(receipt.gameId);
      },
      failed,
    );
    timer = setTimeout(() => {
      busy = false;
      message = "";
      error = "Still waiting for acknowledgement. Retry checks the same order.";
      remedy = "network";
    }, 20000);
  }
  async function send(id: string, action: CampaignAction) {
    if (busy || pending) return;
    busy = true;
    error = "";
    const session = generation;
    try {
      const mode =
        action.kind === "campaign.create"
          ? action.mode
          : (game?.mode ?? view?.mode);
      if (!mode) throw new Error("Campaign encryption has not been recovered");
      const command = await service.prepareCampaign(
        id,
        action,
        mode,
        action.kind === "campaign.create"
          ? 1
          : (game?.encryptionEpoch ?? view?.encryptionEpoch ?? 1),
      );
      if (session !== generation) return;
      pending = command;
      dispatch();
    } catch {
      if (session === generation) failed();
    }
  }
  async function back() {
    stopView();
    selection++;
    view = null;
    selected = null;
    void goto(`${base}/campaigns/`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
    creating = false;
    loading = false;
    error = "";
    remedy = null;
    await tick();
    title?.focus();
  }
</script>

<svelte:head><title>Campaigns — Cluster</title></svelte:head>
<main class="campaign-shell" class:commanding={!!view}>
  {#if view}<Galaxy
      {view}
      {message}
      {error}
      {busy}
      pending={!!pending}
      onback={back}
      {realAvailable}
      migration={game?.migration ?? null}
      onmigrate={(targetMode) =>
        send(view!.id, {
          kind: "campaign.migrate",
          expectedRevision: game?.revision ?? view!.revision,
          targetMode,
        })}
      onmaintenance={() =>
        send(view!.id, {
          kind: view!.pausedAt != null ? "campaign.resume" : "campaign.pause",
          expectedRevision: game?.revision ?? view!.revision,
        })}
      onleave={() =>
        send(view!.id, {
          kind: "campaign.leave",
          expectedRevision: game?.revision ?? view!.revision,
        })}
      onretry={pending ? dispatch : remedy === "network" ? recover : undefined}
    />
  {:else}
    <header>
      <a href={`${base}/`}>CLUSTER</a><span class="overline"
        >Campaign command</span
      ><a href={`${base}/`}>Your identity</a>
    </header>
    <div class="development-banner">
      Development campaign · Rules under review
    </div>
    <div class="campaign-body">
      {#if access !== "developer"}
        <section class="briefing">
          <h1 bind:this={title} tabindex="-1">
            {access === "loading"
              ? "Opening your campaigns…"
              : access === "signed-out"
                ? "Your command awaits"
                : "Development access"}
          </h1>
          <p>
            {access === "signed-out"
              ? "Sign in and save your identity to continue."
              : access === "restricted"
                ? "Campaign testing is limited to developer accounts. Public campaigns open with secure encryption and approved rules."
                : "Checking your account’s campaign access."}
          </p>
          <a
            class="return"
            href={`${base}/${access === "signed-out" && selected ? `?campaign=${encodeURIComponent(selected)}` : ""}`}
            >{access === "signed-out"
              ? "Sign in to continue"
              : "Return to entry"}</a
          >
        </section>
      {:else}
        <div class="page-heading">
          <h1 bind:this={title} tabindex="-1">
            {game?.name ??
              (creating ? "Assemble a galaxy" : "Your next alliance")}
          </h1>
          {#if selected || creating}<ActionButton
              class="quiet"
              onclick={back}
              disabled={!!pending || busy}>All campaigns</ActionButton
            >{:else}<ActionButton
              class="primary"
              onclick={() => {
                creating = true;
                void tick().then(() => title?.focus());
              }}>Create campaign</ActionButton
            >{/if}
        </div>
        {#if !game || loading || creating}<div class="directory-feedback">
            <Feedback
              {message}
              {error}
              reconnect={remedy === "network" && !pending ? recover : undefined}
            />
            {#if pending}<ActionButton
                class="primary retry"
                disabled={busy}
                onclick={dispatch}
                >{busy
                  ? "Awaiting acknowledgement…"
                  : "Retry order"}</ActionButton
              >{/if}
          </div>{/if}
        {#if creating}
          <form
            id="create-campaign"
            class="briefing"
            onsubmit={(event) => {
              event.preventDefault();
              void send(crypto.randomUUID(), {
                kind: "campaign.create",
                expectedRevision: 0,
                name,
                capacity,
                mode: encryption,
                development: true,
              });
            }}
          >
            <p class="overline gold">A shared beginning</p>
            <p>
              Choose a name and roster size. Each faction receives an equal
              share of seats. A full roster begins at the next quarter-hour
              boundary.
            </p>
            <label for="campaign-name">Campaign name</label><input
              id="campaign-name"
              bind:value={name}
              minlength="2"
              maxlength="40"
              required
              disabled={busy || !!pending}
            />
            <fieldset disabled={busy || !!pending}>
              <legend>Empires</legend>
              <div class="capacity">
                {#each rules.playerCounts as count}<label
                    ><input
                      type="radio"
                      name="capacity"
                      value={count}
                      bind:group={capacity}
                    />{count}</label
                  >{/each}
              </div>
            </fieldset>
            <p class="scope">
              Development campaigns are available only to developer accounts.
              Public competitive play remains closed during review.
            </p>
            <fieldset class="encryption-settings">
              <legend>Development encryption</legend>
              <label
                ><input
                  type="radio"
                  name="encryption"
                  value="mock"
                  bind:group={encryption}
                /> Mock codec · inspectable data</label
              >
              <label
                ><input
                  type="radio"
                  name="encryption"
                  value="real"
                  bind:group={encryption}
                  disabled={!realAvailable}
                /> Real encryption · managed keys</label
              >
              <p>
                {realAvailable
                  ? "Real mode encrypts campaign commands, canonical history and member views. Public admission remains closed during review."
                  : "Managed encryption is not configured for this emulator. Real mode never falls back to the mock codec."}
              </p>
            </fieldset>
          </form>
        {:else if selected}
          {#if loading}<p role="status">Recovering your campaign…</p>
          {:else if game}<div
              class="join-tabs"
              role="group"
              aria-label="Join campaign details"
            >
              {#each ["faction", "portrait", "briefing"] as tab}<ActionButton
                  class="quiet"
                  aria-pressed={joinTab === tab}
                  onclick={() => (joinTab = tab as typeof joinTab)}
                  >{tab === "faction"
                    ? "Faction"
                    : tab === "portrait"
                      ? "Portrait"
                      : "Briefing & roster"}</ActionButton
                >{/each}
            </div>
            {#if joinTab === "faction"}<FactionPicker
                bind:value={faction}
                {game}
                disabled={busy || !!pending || game.phase !== "waiting"}
              />
            {:else if joinTab === "portrait"}<section
                class="roster portrait-task"
              >
                <h2>Your face in this galaxy</h2>
                <p>
                  Portrait changes appearance. Your faction determines affinity.
                </p>
                <div class="portrait-choice">
                  <PortraitPicker
                    bind:value={portrait}
                    disabled={busy || !!pending}
                  />
                </div>
              </section>
            {:else}<section class="roster">
                <h2>Campaign briefing</h2>
                <p>
                  {game.capacity} empires · {game.capacity / 4} seats per faction
                  · a full roster starts at the next quarter-hour. You may leave until
                  the scheduled start.
                </p>
                <p>
                  The design objective is shared victory: an eligible alliance
                  holds {rules.victoryStarFraction * 100}% of stars for {rules.victoryHoldTicks}
                  ticks. This development slice supports admission and galaxy inspection;
                  economy, conquest and victory do not run yet.
                </p>
                <details>
                  <summary>Review this campaign’s rules</summary>
                  <p>
                    {game.rulesetVersion} · Review status. A tick lasts {rules.tickSeconds /
                      60} minutes. Starting holdings: {rules.startingAssets
                      .credits} credits,
                    {rules.startingAssets.fighters} fighters, {rules
                      .startingAssets.infantry} infantry; {rules.startingAssets
                      .markets} markets, {rules.startingAssets.camps} camp, {rules
                      .startingAssets.bases} base and
                    {rules.startingAssets.stations} station. Home systems match faction
                    affinity. The faction selector shows the applicable production
                    matrix.
                  </p>
                </details>
                <CampaignRoster {game} />
              </section>{/if}
          {/if}
        {:else}<section class="campaign-list" aria-label="Campaign directory">
            <div
              class="directory-tabs"
              role="group"
              aria-label="Campaign sections"
            >
              <ActionButton
                class="secondary"
                aria-pressed={section === "joined"}
                onclick={() => (section = "joined")}
                >Your campaigns ({memberships.length})</ActionButton
              ><ActionButton
                class="secondary"
                aria-pressed={section === "joinable"}
                onclick={() => (section = "joinable")}
                >Joinable campaigns</ActionButton
              >
            </div>
            {#if listed.length === 0}<p>
                No campaigns in this section. Create a galaxy or browse joinable
                campaigns.
              </p>{/if}
            {#each listed as item}<ActionButton
                class="campaign-card"
                onclick={() => select(item.id)}
                ><span class="overline">{item.phase}</span><strong
                  >{item.name}</strong
                ><span
                  >{item.roster.length} / {item.capacity} empires · {item.capacity *
                    32} stars</span
                ><span>Open campaign →</span></ActionButton
              >{/each}
          </section>
        {/if}
      {/if}
    </div>
    {#if creating && access === "developer"}<footer class="commit-rail">
        <span
          >{capacity} empires<small
            >{encryption === "real"
              ? "Managed encryption"
              : "Inspectable development data"}</small
          ></span
        >
        <ActionButton
          class="primary"
          type="submit"
          form="create-campaign"
          disabled={busy ||
            !!pending ||
            (encryption === "real" && !realAvailable)}
          >Create galaxy</ActionButton
        >
      </footer>{/if}
    {#if game && !loading && !creating}<footer class="commit-rail">
        <div class="rail-feedback">
          <Feedback
            {message}
            {error}
            reconnect={remedy === "network" && !pending ? recover : undefined}
          />
        </div>
        <span
          >{rules.factions.find((f) => f.id === faction)?.name}<small
            >{game.roster.length}/{game.capacity} empires · Development</small
          ></span
        ><ActionButton
          class="primary"
          disabled={busy ||
            (!pending &&
              (game.pausedAt != null ||
                game.phase !== "waiting" ||
                game.roster.filter((s) => s.faction === faction).length >=
                  game.capacity / 4))}
          onclick={() =>
            pending
              ? dispatch()
              : send(game.id, {
                  kind: "campaign.join",
                  expectedRevision: game.revision,
                  faction,
                  portrait,
                })}
          >{busy
            ? "Awaiting acknowledgement…"
            : pending
              ? "Retry order"
              : "Claim your seat"}</ActionButton
        >
      </footer>{/if}
  {/if}
</main>

<style>
  .directory-feedback {
    width: min(720px, calc(100% - 24px));
    margin: 0 auto;
  }
  .campaign-shell {
    align-items: stretch;
    height: 100svh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse at top right, #233548, #07121d 70%);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 24px;
    border-bottom: 1px solid #827354;
    flex-shrink: 0;
  }
  header a {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--gold);
    text-decoration: none;
  }
  header a:first-child {
    font:
      500 28px "Cormorant Garamond",
      serif;
    letter-spacing: 0.16em;
  }
  .development-banner {
    padding: 5px 24px;
    background: #372d1c;
    color: #f5d29b;
    font-size: 14px;
    flex-shrink: 0;
  }
  .join-tabs {
    display: flex;
    gap: 8px;
    position: sticky;
    top: 0;
    z-index: 3;
    background: #07121ef8;
    padding: 4px 16px;
    border-bottom: 1px solid #64747d;
  }
  .join-tabs :global(button) {
    flex: 1;
    min-height: 44px;
  }
  .join-tabs :global([aria-pressed="true"]) {
    color: #b3f2ff;
    border-bottom-color: #8fdbeb;
  }
  .commit-rail :global(.primary) {
    background: linear-gradient(#214a59, #0d2736);
    color: #effdff;
    border-color: #99e7f5;
    box-shadow:
      inset 0 0 12px #67dfff33,
      0 0 12px #53d8f522;
  }
  .commit-rail {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 12px 24px max(12px, env(safe-area-inset-bottom));
    background: #07121ef5;
    border-top: 1px solid #9b8b69;
    flex-shrink: 0;
    z-index: 5;
  }
  .rail-feedback {
    width: 100%;
  }
  .rail-feedback :global(.notice) {
    margin: 0;
  }
  .rail-feedback:empty {
    display: none;
  }
  .commit-rail small {
    display: block;
    color: var(--muted);
    font-size: 13px;
    margin-top: 4px;
  }
  .commanding {
    display: block;
  }
  .campaign-body {
    overflow: auto;
    min-height: 0;
    flex: 1;
  }
  .page-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 10px 24px;
  }
  h1 {
    font:
      500 30px "Cormorant Garamond",
      serif;
    margin: 0;
  }
  h2 {
    font:
      500 30px "Cormorant Garamond",
      serif;
  }
  .briefing {
    max-width: 720px;
    padding: 36px;
    margin: 20px auto;
    background: #091725e8;
    border: 1px solid #8e7c59;
  }
  p {
    line-height: 1.6;
  }
  .briefing > label {
    display: block;
    margin: 24px 0 8px;
  }
  #campaign-name {
    width: 100%;
    min-height: 52px;
    background: #07111c;
    color: inherit;
    padding: 12px;
    border: 1px solid #ad9a76;
    font: inherit;
  }
  fieldset {
    margin: 24px 0;
  }
  .encryption-settings {
    margin: 24px 0;
    border: 1px solid #87919a;
    padding: 16px;
  }
  .encryption-settings label {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 52px;
  }
  .encryption-settings input {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }
  .capacity {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }
  .capacity label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 52px;
    flex: 1;
    border: 1px solid #9b8765;
    position: relative;
  }
  .capacity label:has(:checked) {
    background: #80623555;
    border-color: #f5d29b;
  }
  .capacity input {
    width: 44px;
    height: 44px;
  }
  .scope {
    color: var(--muted);
    font-size: 15px;
  }
  .return {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    color: var(--gold);
  }
  .directory-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .directory-tabs :global([aria-pressed="true"]) {
    border-color: var(--gold);
    color: var(--gold);
    background: #5b482944;
  }
  .campaign-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px 28px 40px;
  }
  .campaign-list :global(.campaign-card) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 20px;
    min-height: 100px;
    background:
      radial-gradient(ellipse at top right, #53607966, transparent), #091725;
    border: 1px solid #a08c66;
    text-align: left;
  }
  .campaign-list strong {
    font:
      500 36px "Cormorant Garamond",
      serif;
  }
  .roster {
    padding: 24px 28px;
    background: #091725;
  }
  .portrait-choice {
    max-width: 600px;
    margin: 20px 0;
  }
  summary {
    min-height: 48px;
    cursor: pointer;
    padding: 14px 0;
    color: var(--gold);
  }
  :global(.retry) {
    margin: 0 28px 20px;
  }
  .campaign-body :global(.feedback) {
    margin: 0 28px;
  }
  @media (max-width: 700px) {
    .commit-rail {
      padding: 10px 12px max(10px, env(safe-area-inset-bottom));
      gap: 8px;
    }
    .commit-rail > span {
      font-size: 13px;
      max-width: 130px;
    }
    .commit-rail :global(button) {
      padding: 12px 16px;
      flex: 1;
    }

    header {
      padding: 8px 16px;
    }
    header .overline {
      display: none;
    }
    .development-banner {
      padding: 4px 16px;
      font-size: 11px;
    }
    .page-heading {
      padding: 8px 16px;
      align-items: center;
    }
    h1 {
      font-size: 26px;
    }
    .briefing {
      margin: 0 12px 20px;
      padding: 24px;
    }
    .directory-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .directory-tabs :global([aria-pressed="true"]) {
      border-color: var(--gold);
      color: var(--gold);
      background: #5b482944;
    }
    .campaign-list {
      padding: 12px 16px 24px;
      grid-template-columns: 1fr;
    }
    .roster {
      padding: 20px 16px;
    }
  }
</style>
