<script lang="ts">
  import CreditOffers from "$lib/components/CreditOffers.svelte";
  import ReturnBriefing from "$lib/components/ReturnBriefing.svelte";
  import RecoveryRecord from "$lib/components/RecoveryRecord.svelte";
  import { RecoveryValidation } from "$lib/recovery-store";
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import Feedback from "$lib/components/Feedback.svelte";
  import ActionButton from "$lib/components/ActionButton.svelte";
  import NameField from "$lib/components/NameField.svelte";
  import PortraitPicker from "$lib/components/PortraitPicker.svelte";
  import Conversations from "$lib/components/Conversations.svelte";
  import ArrivalReports from "$lib/components/ArrivalReports.svelte";
  import FleetContacts from "$lib/components/FleetContacts.svelte";
  import FleetRoute from "$lib/components/FleetRoute.svelte";
  import SystemFleets from "$lib/components/SystemFleets.svelte";
  import SystemObservation from "$lib/components/SystemObservation.svelte";
  import MarketFocus from "$lib/components/MarketFocus.svelte";
  import SystemConstruction from "$lib/components/SystemConstruction.svelte";
  import CampaignResearch from "$lib/components/CampaignResearch.svelte";
  import CampaignEconomy from "$lib/components/CampaignEconomy.svelte";
  import CampaignHistory from "$lib/components/CampaignHistory.svelte";
  import SessionSecurity from "$lib/components/SessionSecurity.svelte";
  import CampaignStartStatus from "$lib/components/CampaignStartStatus.svelte";
  import {
    conversationFrame,
    briefingFrame,
    creditFrame,
    sharingFrame,
    draftRecoveryFrame,
    arrivalFrame,
    contactsFrame,
    travelFrame,
    travelFleetId,
    travelDestination,
    scheduledFrame,
    scenarios,
    duration,
    historyRecords,
    productionFrame,
    researchFrame,
    constructionFrame,
    focusFrame,
    fleetFrame,
    cargoFrame,
    reorganizationFrame,
    cancellationFrame,
    observationFrame,
    observedTarget,
  } from "./scenarios";
  let selected = $state("accepted");
  let time = $state(0);
  let speed = $state(1);
  let playing = $state(false);
  const scenario = $derived(scenarios.find((s) => s.id === selected)!);
  const frame = $derived(
    [...scenario.frames].reverse().find((f) => f.at <= time)!,
  );
  function reset() {
    time = 0;
    playing = false;
  }
  function replay() {
    time = 0;
    playing = true;
  }
  onMount(() => {
    let id = 0;
    let previous = performance.now();
    function update(now: number) {
      if (playing) {
        time = Math.min(duration, time + (now - previous) * speed);
        if (time === duration) playing = false;
      }
      previous = now;
      id = requestAnimationFrame(update);
    }
    id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  });
</script>

<svelte:head
  ><title>Animation lab — Cluster</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<div class="lab">
  <header>
    <p class="overline gold">Developer review</p>
    <h1>Command feedback lab</h1>
    <p>
      Deterministic production-component scenarios. Shared profile and campaign
      validation produces the accepted/rejected outcomes. Playback changes
      presentation time only; no service or game state is fabricated.
    </p>
    <nav>
      <a href={`${base}/gallery/`}>Component gallery</a><a href={`${base}/`}
        >Player entry</a
      >
    </nav>
  </header>
  <section class="controls" aria-label="Playback controls">
    <label
      >Scenario<select
        aria-label="Scenario"
        bind:value={selected}
        onchange={reset}
        >{#each scenarios as item}<option value={item.id}>{item.label}</option
          >{/each}</select
      ></label
    >
    <label
      >Playback speed<select bind:value={speed}
        ><option value={0.25}>¼×</option><option value={0.5}>½×</option><option
          value={1}>1×</option
        ><option value={2}>2×</option></select
      ></label
    >
    <ActionButton class="primary" onclick={replay}>Replay</ActionButton
    ><ActionButton class="secondary" onclick={() => (playing = !playing)}
      >{playing ? "Pause" : "Resume"}</ActionButton
    ><ActionButton class="secondary" onclick={reset}>Reset</ActionButton>
    <label class="seek"
      >Inspect frame: {Math.round(time)} ms<input
        type="range"
        min="0"
        max={duration}
        step="1"
        bind:value={time}
        oninput={() => (playing = false)}
      /></label
    >
  </section>
  <div class="comparison">
    {#each [false, true] as reduced}<section
        class="specimen"
        aria-label={reduced
          ? "Reduced motion comparison"
          : "Standard motion comparison"}
      >
        <h2>{reduced ? "Reduced motion" : "Standard motion"}</h2>
        <p class="overline">Same outcome · {frame.feedback.remedy}</p>
        {#if selected === "invalid-recovery"}{#key frame.at}<RecoveryRecord
              reason={new RecoveryValidation("").message}
              confirming={time >= 1200}
              onretry={() => {
                time = 0;
              }}
              onforget={() => {}}
            />{/key}{:else if selected === "draft-recovery"}<div
            style="height:min(900px,90svh);min-height:550px"
          >
            {#key frame.at}<Conversations
                {...draftRecoveryFrame(time)}
                inspect={{ time: time - frame.at, reduced }}
                oncommand={() => {}}
                onearlier={() => {}}
                onlatest={() => {}}
                onretryHistory={() => {}}
                onclose={() => {}}
                onretryDraft={() => (time = 1200)}
                onuseSavedDraft={() => (time = 4800)}
                onreplaceDraft={() => (time = 3200)}
              />{/key}
          </div>{:else if selected === "credit-offers"}<div
            style="height:min(900px,90svh);min-height:550px"
          >
            {#key frame.at}<CreditOffers
                {...creditFrame(time)}
                inspect={{ time: time - frame.at, reduced }}
                oncommand={() => (time = 500)}
                onclose={() => (time = 0)}
                onretry={() => (time = 500)}
                onhistory={() => {}}
              />{/key}
          </div>{:else if selected === "return-briefing"}<div
            style="height:min(900px,90svh);min-height:550px"
          >
            <ReturnBriefing
              {...briefingFrame(time)}
              message={frame.feedback.message}
              error={frame.feedback.error}
              inspect={{ time: time - frame.at, reduced }}
              onearlier={() => (time = 1200)}
              onlatest={() => (time = 1200)}
              onretry={() => (time = 1200)}
              oninspect={() => {}}
              onconfirm={() => (time = 3200)}
              onclose={() => (time = 0)}
            />
          </div>{:else if selected === "conversations" || selected === "conversation-sharing"}<div
            style="height:min(900px,90svh);min-height:550px"
          >
            {#key frame.at}<Conversations
                {...selected === "conversation-sharing"
                  ? sharingFrame(time)
                  : conversationFrame(time)}
                pending={(time >= 500 && time < 1200) ||
                  (selected === "conversations" && time >= 3200 && time < 4800)}
                message={frame.feedback.message}
                error={frame.feedback.error}
                inspect={{ time: time - frame.at, reduced }}
                oncommand={() => {}}
                onearlier={() => {}}
                onlatest={() => {}}
                onretryHistory={() => {}}
                onretry={() => {}}
                onclose={() => {}}
              />{/key}
          </div>{:else if selected === "arrivals"}<div
            style="height:min(850px,90svh);min-height:550px"
          >
            {#key frame.at}<ArrivalReports
                {...arrivalFrame(time)}
                inspect={{ time: time - frame.at, reduced }}
                onearlier={() => {}}
                onlatest={() => {}}
                onretry={() => {}}
                onclose={() => {}}
                oninspect={() => {}}
              />{/key}
          </div>{:else if selected === "contacts"}{@const sample =
            contactsFrame(time)}
          <div style="height:min(850px,90svh);min-height:550px">
            <FleetContacts
              {...sample}
              onearlier={() => {}}
              onlatest={() => {}}
              onretry={() => {}}
              onclose={() => {}}
            />
          </div>{:else if selected === "travel"}<div
            style="height:min(850px,90svh);min-height:550px"
          >
            {#key frame.at}<FleetRoute
                view={travelFrame(time)}
                fleetId={travelFleetId}
                waypoints={[travelDestination]}
                pending={time < 2200}
                message={frame.feedback.message}
                error={frame.feedback.error}
                oncommit={() => {}}
                onclose={() => {}}
                onretry={() => {}}
              />{/key}
          </div>{:else if selected === "fleet-cancel" || selected === "fleet" || selected === "cargo" || selected === "split" || selected === "merge"}<div
            style="height:min(850px,90svh);min-height:550px"
          >
            {#key frame.at}{@const sample =
                selected === "fleet-cancel"
                  ? cancellationFrame(time)
                  : selected === "split" || selected === "merge"
                    ? reorganizationFrame(time, selected === "merge")
                    : selected === "cargo"
                      ? cargoFrame(time)
                      : fleetFrame(time)}<SystemFleets
                view={sample}
                starId={sample.own.home!}
                pending={time < 2200}
                message={frame.feedback.message}
                error={frame.feedback.error}
                onform={() => {}}
                ondisband={() => {}}
                oncargo={() => {}}
                onsplit={() => {}}
                onmerge={() => {}}
                oncancel={() => {}}
                onroute={() => {}}
                onclose={() => {}}
                onretry={() => {}}
              />{/key}
          </div>{:else if selected === "observation"}<SystemObservation
            view={observationFrame(time)}
            starId={observedTarget}
          />{:else if selected === "market-focus"}<div
            style="height: min(850px,90svh);min-height:550px"
          >
            {#key frame.at}
              <MarketFocus
                focus={focusFrame(time)}
                inspect={{ time: time - frame.at, reduced }}
                pending={time < 2200}
                message={frame.feedback.message}
                error={frame.feedback.error}
                onapply={() => {}}
                onclose={() => {}}
                onretry={() => {}}
              />
            {/key}
          </div>{:else if selected === "construction"}<div
            style="height: min(800px, 85svh); min-height: 550px;"
          >
            <SystemConstruction
              inspect={{ time: time - frame.at, reduced }}
              view={constructionFrame(time)}
              starId={constructionFrame(time).own.home!}
              pending={time < 1000}
              message={frame.feedback.message}
              error={frame.feedback.error}
              onbuild={() => {}}
              oncancel={() => {}}
              onclose={() => {}}
            />
          </div>
        {:else if selected === "research"}<CampaignResearch
            research={researchFrame(time)}
            inspect={{ time: time - frame.at, reduced }}
            pending={time < 1000}
            message={frame.feedback.message}
            error={frame.feedback.error}
            onselect={reset}
            onretry={frame.feedback.remedy === "network" ? reset : undefined}
          />
        {:else if selected === "production"}<div style="height:650px">
            <CampaignEconomy
              view={productionFrame(time).view}
              inspectTime={productionFrame(time).clock}
              onclose={reset}
            />
          </div>
        {:else if selected === "history-recovery"}<div style="height: 540px">
            <CampaignHistory
              records={time >= 3200 ? historyRecords : []}
              inspect={{ time: time - frame.at, reduced }}
              errorId={reduced
                ? "reduced-history-error"
                : "standard-history-error"}
              loading={time < 1000 || (time >= 2200 && time < 3200)}
              error={frame.feedback.error}
              onearlier={() => {}}
              onlatest={() => {
                time = 0;
                playing = true;
              }}
              onretry={() => {
                time = 2200;
                playing = true;
              }}
              onclose={reset}
            />
          </div>
        {:else if selected === "session-ended"}
          {#if time < 1200}<SessionSecurity
              pending
              onconfirm={() => {}}
            />{:else}<Feedback
              message={frame.feedback.message}
              inspect={{ time: time - frame.at, reduced }}
            />{/if}
        {:else if selected === "campaign-start"}
          <CampaignStartStatus
            game={scheduledFrame(time).game}
            inspectTime={scheduledFrame(time).clock}
          />
        {:else}
          {#if !selected.startsWith("campaign-")}<NameField
              id={reduced ? "reduced-name" : "standard-name"}
              value="Preserved draft"
              disabled={frame.feedback.message === "Sending your identity…"}
            /><PortraitPicker
              value="M2"
              disabled
              group={reduced ? "reduced-portraits" : "standard-portraits"}
            />{/if}<Feedback
            message={frame.feedback.message}
            error={frame.feedback.error}
            errorId={reduced ? "reduced-error" : "standard-error"}
            reconnect={frame.feedback.remedy === "network"
              ? () => {
                  time = 2200;
                  playing = true;
                }
              : undefined}
            inspect={{ time: time - frame.at, reduced }}
          />
        {/if}
      </section>{/each}
  </div>
  <p class="explanation">
    The 180 ms feedback reveal uses the exact animation action shipped in
    identity. Reduced motion displays the same result immediately. Seek to a
    transition boundary and step milliseconds to inspect opacity and movement.
    Reconnect advances the deterministic receipt sequence; live networking is
    tested in the emulator browser journey.
  </p>
</div>

<style>
  .lab {
    max-width: 1200px;
    margin: auto;
    padding: 32px;
  }
  header {
    max-width: 760px;
  }
  h1 {
    font:
      500 48px "Cormorant Garamond",
      serif;
  }
  h2 {
    font:
      500 32px "Cormorant Garamond",
      serif;
  }
  p {
    line-height: 1.6;
  }
  nav {
    display: flex;
    gap: 24px;
  }
  a {
    color: var(--gold);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 16px;
    margin: 24px 0;
    padding: 20px;
    border: 1px solid #6b716f;
  }
  .controls label {
    min-width: 0;
    max-width: 100%;
    display: grid;
    gap: 8px;
  }
  select {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    background: #13232f;
    color: inherit;
    font: inherit;
    padding: 8px;
    border: 1px solid #6b716f;
  }
  .seek {
    flex-basis: 100%;
  }
  .seek input {
    min-height: 44px;
    width: 100%;
  }
  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .specimen {
    padding: 24px;
    background: #091722;
    border: 1px solid #6b716f;
    min-width: 0;
  }
  .explanation {
    max-width: 760px;
  }
  @media (max-width: 700px) {
    .lab {
      padding: 16px;
    }
    .comparison {
      grid-template-columns: 1fr;
    }
    .specimen {
      padding: 16px;
    }
    h1 {
      font-size: 38px;
    }
  }
</style>
