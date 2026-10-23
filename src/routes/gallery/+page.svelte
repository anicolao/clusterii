<script lang="ts">
  import GameMenu from "$lib/components/GameMenu.svelte";
  import CommanderPortrait from "$lib/components/CommanderPortrait.svelte";
  import CommanderDeck from "$lib/components/CommanderDeck.svelte";
  import CommandControl from "$lib/components/CommandControl.svelte";
  import { portraits } from "@shared/profile";
  let commandPreview = $state("systems");
  let portraitPreview = $state("No roster request");
  import { identityConversation } from "../dev/animations/identity-scenario";
  import CreditOffers from "$lib/components/CreditOffers.svelte";
  import ReturnBriefing from "$lib/components/ReturnBriefing.svelte";
  import RecoveryRecord from "$lib/components/RecoveryRecord.svelte";
  import { RecoveryValidation } from "$lib/recovery-store";
  import { ReceiptMismatch } from "@shared/command-receipt";
  import CampaignMaintenance from "$lib/components/CampaignMaintenance.svelte";
  let maintenancePaused = $state(false);
  let galleryMode = $state<"mock" | "real">("mock");
  import ChartControls from "$lib/components/galaxy/ChartControls.svelte";
  import type { StarClass } from "@shared/rules";
  let chartClass = $state<StarClass | "all">("all");
  let cameraAction = $state("No movement requested");
  import StellarArt from "$lib/components/StellarArt.svelte";
  import WorldArt from "$lib/components/WorldArt.svelte";
  import ScienceLedger from "$lib/components/ScienceLedger.svelte";
  import SystemLayers from "$lib/components/SystemLayers.svelte";
  import CommandIcon from "$lib/components/CommandIcon.svelte";
  import Conversations from "$lib/components/Conversations.svelte";
  import ArrivalReports from "$lib/components/ArrivalReports.svelte";
  import FleetContacts from "$lib/components/FleetContacts.svelte";
  import FleetRoute from "$lib/components/FleetRoute.svelte";
  import SystemFleets from "$lib/components/SystemFleets.svelte";
  import FleetSymbol from "$lib/components/FleetSymbol.svelte";
  import SystemObservation from "$lib/components/SystemObservation.svelte";
  import MarketFocus from "$lib/components/MarketFocus.svelte";
  import DevelopmentIcon from "$lib/components/DevelopmentIcon.svelte";
  import SystemConstruction from "$lib/components/SystemConstruction.svelte";
  import CampaignResearch from "$lib/components/CampaignResearch.svelte";
  import CampaignEconomy from "$lib/components/CampaignEconomy.svelte";
  import CampaignHistory from "$lib/components/CampaignHistory.svelte";
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
    historyRecords,
    productionFrame,
    researchFrame,
    researchScienceRate,
    constructionFrame,
    focusFrame,
    fleetFrame,
    cargoFrame,
    reorganizationFrame,
    cancellationFrame,
    observationFrame,
    observedTarget,
    legacyProductionView,
  } from "../dev/animations/scenarios";
  import SessionSecurity from "$lib/components/SessionSecurity.svelte";
  import CampaignStartStatus from "$lib/components/CampaignStartStatus.svelte";
  import CampaignRoster from "$lib/components/CampaignRoster.svelte";
  import FactionPicker from "$lib/components/FactionPicker.svelte";
  import {
    createCampaign,
    campaignDirectory,
    joinOrLeave,
  } from "@shared/campaign";
  import type { FactionId } from "@shared/rules";
  let faction = $state<FactionId>("heliac");
  const empty = createCampaign(
    "gallery",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Gallery specimen",
      capacity: 4,
      mode: "mock",
      development: true,
    },
    "c".repeat(64),
    0,
  );
  const roster = campaignDirectory(
    joinOrLeave(
      empty,
      { kind: "campaign.join", expectedRevision: 1, faction: "pelagic" },
      "specimen",
      { alias: "Envoy", portrait: "M1" },
      0,
    ),
  );
  import { base } from "$app/paths";
  import ChapterNav from "$lib/components/ChapterNav.svelte";
  import ActionButton from "$lib/components/ActionButton.svelte";
  import EntryButton from "$lib/components/EntryButton.svelte";
  import PortraitPicker from "$lib/components/PortraitPicker.svelte";
  import NameField from "$lib/components/NameField.svelte";
  import Feedback from "$lib/components/Feedback.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { icons } from "$lib/presentation";
  import type { Portrait } from "@shared/profile";
  let portrait = $state<Portrait>("M2");
  let alias = $state("The envoy");
  let clicks = $state(0);
  let scienceExampleOpen = $state(false);
  let scienceExampleButton: HTMLButtonElement;
  let chapter = $state(0);
  let narrow = $state(false);
</script>

<section aria-label="Local presentation controls"><GameMenu /></section>

<svelte:head
  ><title>Production gallery — Cluster</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<div class="dev-shell">
  <header>
    <p class="overline gold">Developer review</p>
    <h1>Production component gallery</h1>
    <p>
      These are the same components used by the entry and identity screens. Tab
      to inspect real keyboard focus; select portraits and activate controls.
      Samples do not submit game commands.
    </p>
    <nav>
      <a href={`${base}/dev/animations/`}>Animation lab</a><a href={`${base}/`}
        >Player entry</a
      >
    </nav>
  </header>
  <ActionButton class="secondary" onclick={() => (narrow = !narrow)}
    >{narrow ? "Use wide specimens" : "Use phone-width specimens"}</ActionButton
  >
  <div class="samples" class:narrow>
    <section>
      <h2>Illustrated navigation</h2>
      <EntryButton
        label="Play"
        illustration="planet"
        focusId="gallery-play"
        onclick={() => clicks++}
      /><EntryButton
        label="Learn the game"
        illustration="observatory"
        focusId="gallery-learn"
        onclick={() => clicks++}
      /><EntryButton
        label="Continue"
        detail="The Cygnus Compact"
        illustration="planet"
        focusId="gallery-continue"
        onclick={() => clicks++}
      /><EntryButton
        label="Opening the gates…"
        illustration="planet"
        focusId="gallery-pending"
        disabled
        onclick={() => {}}
      />
      <p>
        44 px minimum targets; illustrated entry controls scale at phone and 4K
        breakpoints.
      </p>
    </section>
    <section>
      <h2>Actions and focus</h2>
      <ChapterNav
        labels={["The galaxy", "Conquest", "Your empire", "Diplomacy"]}
        selected={chapter}
        onselect={(i) => (chapter = i)}
      />
      {#each ["primary", "secondary", "quiet"] as variant}<div class="row">
          <ActionButton class={variant} onclick={() => clicks++}
            >{variant} action <Icon kind="arrow" /></ActionButton
          ><ActionButton class={variant} disabled
            >{variant} disabled</ActionButton
          >
        </div>{/each}<ActionButton class="primary" disabled
        >Awaiting acknowledgement…</ActionButton
      >
      <p role="status">Activated {clicks} controls</p>
    </section>
    <section>
      <h2>Identity fields</h2>
      <div class="field-specimen">
        <NameField id="gallery-name" bind:value={alias} />
      </div>
      <div class="field-specimen">
        <NameField
          id="gallery-invalid"
          value={"A".repeat(25)}
          invalid
          errorId="gallery-validation"
        /><Feedback
          error="Choose a name of 2–24 characters and a portrait."
          errorId="gallery-validation"
        />
      </div>
      <div class="field-specimen">
        <NameField id="gallery-disabled" value="Pending draft" disabled />
      </div>
      <PortraitPicker
        bind:value={portrait}
        group="gallery-portrait"
      /><PortraitPicker value="G1" disabled group="gallery-disabled-portrait" />
    </section>
    <section>
      <h2>Feedback and recovery</h2>
      <Feedback
        error={new ReceiptMismatch().message}
        errorId="gallery-receipt"
      />
      <Feedback message="Sending your identity…" /><Feedback
        message="Identity saved. Your next campaign will know you by this name."
      /><Feedback
        error="Another device changed your identity. Your draft is preserved. Save again to replace that version."
        errorId="gallery-conflict"
      /><Feedback
        error="Your connection was interrupted. Reconnect to recover updates; your draft is preserved."
        errorId="gallery-network"
        reconnect={() => clicks++}
      />
    </section>
    <section class="faction-specimens">
      <h2>Faction selection</h2>
      <p>
        Production faction art, selected radios and quota-disabled seats. These
        deterministic reducer specimens never enter a live campaign.
      </p>
      <FactionPicker bind:value={faction} game={roster} />
      <h3>Pending selection</h3>
      <FactionPicker value="heliac" game={roster} disabled />
    </section>
    <section>
      <h2>Stationed fleets · shared manifest and icon</h2>
      <FleetSymbol /><span>Fleet</span>
      {#each ["ready", "pending", "error", "paused", "formed"] as state}{@const sample =
          fleetFrame(state === "formed" ? 3400 : state === "ready" ? 0 : 2400)}
        <div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <SystemFleets
            view={state === "paused" ? { ...sample, pausedAt: 1 } : sample}
            starId={sample.own.home!}
            pending={state === "pending" || state === "error"}
            message={state === "pending" ? "Awaiting acknowledgement…" : ""}
            error={state === "error"
              ? "The connection was interrupted. Your manifest and pending order are preserved."
              : ""}
            onform={() => {}}
            ondisband={() => {}}
            oncargo={() => {}}
            onsplit={() => {}}
            onmerge={() => {}}
            oncancel={() => {}}
            onroute={() => {}}
            onclose={() => {}}
            onretry={() => {}}
          />
        </div>{/each}
      <h2>Fleet cargo · shared load and unload controls</h2>
      <p>
        Select the stationed fleet, then Load or Unload to inspect the manifest
        controls in each state.
      </p>
      {#each ["ready", "pending", "error", "paused", "loaded"] as state}{@const sample =
          cargoFrame(state === "loaded" ? 3400 : state === "ready" ? 0 : 2400)}
        <h3>Cargo · {state}</h3>
        <div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <SystemFleets
            view={state === "paused" ? { ...sample, pausedAt: 1 } : sample}
            starId={sample.own.home!}
            pending={state === "pending" || state === "error"}
            message={state === "pending" ? "Awaiting acknowledgement…" : ""}
            error={state === "error"
              ? "The connection was interrupted. Your cargo and pending order are preserved."
              : ""}
            onform={() => {}}
            ondisband={() => {}}
            oncargo={() => {}}
            onsplit={() => {}}
            onmerge={() => {}}
            oncancel={() => {}}
            onroute={() => {}}
            onclose={() => {}}
            onretry={() => {}}
          />
        </div>
      {/each}
      <h2>Fleet reorganization · shared split and merge controls</h2>
      {#each [false, true] as merge}{#each [2400, 3400] as time}{@const sample =
            reorganizationFrame(time, merge)}
          <h3>
            {merge ? "Merge" : "Split"} · {time < 3200
              ? "accepted"
              : "complete"}
          </h3>
          <div
            style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
          >
            <SystemFleets
              view={sample}
              starId={sample.own.home!}
              onform={() => {}}
              ondisband={() => {}}
              oncargo={() => {}}
              onsplit={() => {}}
              onmerge={() => {}}
              oncancel={() => {}}
              onroute={() => {}}
              onclose={() => {}}
            />
          </div>
        {/each}{/each}
      <h2>Invalid saved order · retry and explicit local discard</h2>
      {#each [false, true] as confirming}<RecoveryRecord
          reason={new RecoveryValidation("").message}
          {confirming}
          onretry={() => {}}
          onforget={() => {}}
        />{/each}
      <h2>Browser drafts · recovery, conflict and saved</h2>
      {#each [0, 1200, 2200, 3200, 4800] as time}<div
          style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
        >
          <Conversations
            {...draftRecoveryFrame(time)}
            oncommand={() => {}}
            onearlier={() => {}}
            onlatest={() => {}}
            onretryHistory={() => {}}
            onclose={() => {}}
            onretryDraft={() => {}}
            onuseSavedDraft={() => {}}
            onreplaceDraft={() => {}}
          />
        </div>{/each}
      <h2>Commander identity · distinct seats in the same faction</h2>
      <section
        aria-label="Eight-seat commander identity"
        style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
      >
        <Conversations
          {...identityConversation}
          oncommand={() => {}}
          onearlier={() => {}}
          onlatest={() => {}}
          onretryHistory={() => {}}
          onclose={() => {}}
        />
      </section>
      <h2>Credit offers · exact terms and atomic settlement</h2>
      {#each [0, 500, 1200, 2200, 3200, 4800] as time}<div
          style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
        >
          <CreditOffers
            {...creditFrame(time)}
            oncommand={() => {}}
            onclose={() => {}}
            onretry={() => {}}
            onhistory={() => {}}
          />
        </div>{/each}
      <h2>Return briefing · recovery and visit acknowledgement</h2>
      {#each [0, 1200, 1600, 1800, 2200, 3200, 3800, 4200, 4800, 5300] as time}<div
          style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
        >
          <ReturnBriefing
            {...briefingFrame(time)}
            onearlier={() => {}}
            onlatest={() => {}}
            onretry={() => {}}
            oninspect={() => {}}
            onconfirm={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Selected earlier history · scope and acceptance</h2>
      {#each [-1, 0, 1200] as time}<div
          style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
        >
          <Conversations
            {...sharingFrame(time)}
            oncommand={() => {}}
            onearlier={() => {}}
            onlatest={() => {}}
            onretryHistory={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Private conversations · invitation and recipient history</h2>
      {#each [0, 1200, 2200, 4800] as time}<div
          style="height:min(900px,90svh);min-height:550px;margin-bottom:32px"
        >
          <Conversations
            {...conversationFrame(time)}
            oncommand={() => {}}
            onearlier={() => {}}
            onlatest={() => {}}
            onretryHistory={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Arrival reports · split occupation and conquest</h2>
      {#each [0, 700, 1200, 2200, 3200] as time}<div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <ArrivalReports
            {...arrivalFrame(time)}
            onearlier={() => {}}
            onlatest={() => {}}
            onretry={() => {}}
            onclose={() => {}}
            oninspect={() => {}}
          />
        </div>{/each}
      <h2>Fleet contacts · acquired and last-seen intelligence</h2>
      {#each [0, 700, 1200, 2200, 3200] as time}{@const sample =
          contactsFrame(time)}
        <div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <FleetContacts
            {...sample}
            onearlier={() => {}}
            onlatest={() => {}}
            onretry={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Fleet routing · real catalogue and authoritative states</h2>
      {#each [0, 2400, 3400, 5000] as time}<div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <FleetRoute
            view={travelFrame(time)}
            fleetId={travelFleetId}
            waypoints={[travelDestination]}
            oncommit={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Fleet cancellation · reservations released</h2>
      {#each [0, 2400] as time}{@const sample = cancellationFrame(time)}
        <div
          style="height:min(850px,90svh);min-height:550px;margin-bottom:32px"
        >
          <SystemFleets
            view={sample}
            starId={sample.own.home!}
            message={time
              ? "Fleet order cancelled. Reservations released; no forces moved."
              : ""}
            onform={() => {}}
            ondisband={() => {}}
            oncargo={() => {}}
            onsplit={() => {}}
            onmerge={() => {}}
            oncancel={() => {}}
            onroute={() => {}}
            onclose={() => {}}
          />
        </div>
      {/each}
      <h2>Stellar observations · entitled report states</h2>
      {#each [0, 1200, 3400] as time}<div
          style="max-width:420px;padding:20px;border:1px solid #42616d;margin-bottom:20px"
        >
          <SystemObservation
            view={observationFrame(time)}
            starId={observedTarget}
          />
        </div>{/each}
      <div style="max-width:420px;padding:20px">
        <SystemObservation
          view={{ ...observationFrame(0), scanningEnabled: false }}
          starId={observedTarget}
        />
      </div>
      <h2>Market focus · production allocation and icons</h2>
      {#each ["market", "camp", "base", "station"] as type}<DevelopmentIcon
          type={type as "market" | "camp" | "base" | "station"}
        /><span>{type}</span>{/each}
      {#each ["ready", "pending", "error", "paused", "applied"] as state}<div
          style="height: min(850px,90svh); min-height:550px;margin-bottom:32px"
        >
          <MarketFocus
            focus={focusFrame(
              state === "applied" ? 3400 : state === "ready" ? 0 : 2400,
            )}
            paused={state === "paused"}
            pending={state === "pending" || state === "error"}
            message={state === "pending" ? "Awaiting acknowledgement…" : ""}
            error={state === "error"
              ? "The connection was interrupted. Your allocation is preserved."
              : ""}
            onapply={() => {}}
            onclose={() => {}}
            onretry={() => {}}
          />
        </div>{/each}
      <h2>Construction · shared illustrated instrument</h2>
      {#each ["ready", "pending", "error", "paused", "completed"] as state}{@const sample =
          constructionFrame(
            state === "completed" ? 3400 : state === "ready" ? 0 : 2400,
          )}
        <div
          style="height: min(850px, 90svh); min-height: 550px; margin-bottom: 32px;"
        >
          <SystemConstruction
            view={state === "paused" ? { ...sample, pausedAt: 1 } : sample}
            starId={sample.own.home!}
            pending={state === "pending"}
            error={state === "error"
              ? "The connection was interrupted. Your selection and pending order are preserved."
              : ""}
            onbuild={() => {}}
            oncancel={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Research · shared selection and acknowledgement</h2>
      {#each ["ready", "pending", "error", "disabled", "applied"] as state}<div
          role="region"
          aria-label={`Research specimen ${state}`}
          style="max-width:620px;margin-bottom:32px"
        >
          <CampaignResearch
            scanningEnabled={true}
            travelEnabled={true}
            constructionEnabled={true}
            research={researchFrame(state === "applied" ? 3400 : 2400)}
            scienceMilli={researchScienceRate(
              state === "applied" ? 3400 : 2400,
            )}
            pending={state === "pending"}
            paused={state === "disabled"}
            error={state === "error"
              ? "The connection was interrupted. Your selection and pending order are preserved."
              : ""}
            onselect={() => {}}
          />
        </div>{/each}
      <h2>Economy · shared production ledger</h2>
      {#each [productionFrame(0).view, productionFrame(1200).view, productionFrame(2400).view, legacyProductionView] as sample}<div
          style="height:650px;max-width:620px;margin-bottom:32px"
        >
          <CampaignEconomy
            view={sample}
            inspectTime={productionFrame(1200).clock}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Campaign history · shared instrument</h2>
      {#each ["ready", "loading", "error"] as state}<div
          style="height: 540px; max-width: 620px; margin-bottom: 32px;"
        >
          <CampaignHistory
            records={historyRecords}
            loading={state === "loading"}
            error={state === "error"
              ? "History could not be recovered. Retry keeps your place."
              : ""}
            earlier
            newer
            onearlier={() => {}}
            onlatest={() => {}}
            onretry={() => {}}
            onclose={() => {}}
          />
        </div>{/each}
      <h2>Account sessions</h2>
      <SessionSecurity onconfirm={() => {}} />
      <SessionSecurity pending onconfirm={() => {}} />
      <SessionSecurity
        error="Sessions could not be ended. Confirm your identity and retry the same request."
        onconfirm={() => {}}
      />
      <h2>Campaign roster</h2>
      <CampaignRoster game={roster} />
      <h3>Scheduled start</h3>
      <CampaignStartStatus
        game={{ ...roster, phase: "scheduled", startAt: 4102444800000 }}
      />
      <h3>Awaiting assignment</h3>
      <CampaignStartStatus
        game={{ ...roster, phase: "scheduled", startAt: 1 }}
      />
      <h3>Paused start</h3>
      <CampaignStartStatus
        game={{ ...roster, phase: "scheduled", startAt: 1, pausedAt: 1 }}
      />
      <h3>Started</h3>
      <CampaignStartStatus game={{ ...roster, phase: "active", startAt: 1 }} />
    </section>
    <section>
      <h2>Galaxy view controls</h2>
      <ChartControls
        bind:stellarClass={chartClass}
        onmove={(action) => (cameraAction = action)}
      />
      <p role="status">{cameraAction} · {chartClass}</p>
      <p>
        Home centering is disabled until the server assigns a home system. These
        controls use the production camera interaction.
      </p>
    </section>
    <section>
      <h2>Stellar class illustrations</h2>
      <WorldArt />
      <h2>Science sources · shared production instrument</h2>
      <button
        bind:this={scienceExampleButton}
        onclick={() => (scienceExampleOpen = true)}
        >Open science source specimen</button
      >
      {#if scienceExampleOpen}<div style="height: 700px; max-height: 80svh;">
          <ScienceLedger
            view={productionFrame(1200).view}
            onclose={() => {
              scienceExampleOpen = false;
              scienceExampleButton?.focus();
            }}
          />
        </div>{/if}
      <h2>System layers · shared scene instruments</h2>
      <p>
        Component specimen from the existing reducer-backed development
        scenario; not live authorization evidence.
      </p>
      <div style="height: 650px; overflow: auto; margin-bottom: 24px;">
        <SystemLayers holding={productionFrame(1200).view.holdings[0]} />
      </div>
      <div aria-label="Galaxy command symbols">
        {#each ["systems", "economy", "conversations", "history", "arrivals", "contacts"] as const as kind}<span
            ><CommandIcon {kind} /> {kind}</span
          >{/each}
      </div>
      <section aria-label="Commander instrument gallery">
        <h3>Commander instruments</h3>
        <CommanderDeck
          menuLabel="Commander menu"
          roster={productionFrame(1200).view.roster}
          own={productionFrame(1200).view.own}
          onroster={() =>
            (portraitPreview = "Roster requested by gallery control")}
        />
        <p role="status" aria-label="Portrait control demonstration">
          {portraitPreview}
        </p>
      </section>
      <section aria-label="Command control gallery">
        <h3>Shared galaxy command instruments</h3>
        <p>
          Production controls, including selected and disabled gallery states.
          Cosmetic saved portraits never determine mechanical faction. Atlas
          provenance: docs/art/PRODUCTION_ASSETS.md.
        </p>
        <p role="status" aria-label="Command selection demonstration">
          Selected command preview: {commandPreview}
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          {#each ["systems", "economy", "conversations", "history", "arrivals", "contacts"] as const as kind}
            <CommandControl
              {kind}
              label={kind}
              current={commandPreview === kind}
              onclick={() => (commandPreview = kind)}
            />
          {/each}
          <CommandControl
            kind="systems"
            label="Disabled gallery example"
            disabled
          />
        </div>
      </section>
      <section aria-label="Cosmetic portrait atlas">
        <h3>Cosmetic portrait atlas</h3>
        <div style="display:flex;flex-wrap:wrap;gap:16px;margin-block:24px">
          {#each portraits as portrait}<figure style="width:120px;margin:0">
              <CommanderPortrait {portrait} />
              <figcaption>{portrait} · cosmetic portrait</figcaption>
            </figure>{/each}
        </div>
      </section>
      {#each ["M", "G", "A", "O"] as stellarClass}<StellarArt
          stellarClass={stellarClass as "M" | "G" | "A" | "O"}
        />{/each}
      <p>Decorative class illustrations carry no system intelligence.</p>
    </section>
    <section>
      <h2>Icon inventory</h2>
      <p>
        Decorative glyphs are hidden from assistive technology. The adjacent
        control text supplies the accessible name.
      </p>
      <div class="icon-grid">
        {#each Object.keys(icons) as kind}<div>
            <Icon kind={kind as keyof typeof icons} /><code>{kind}</code>
          </div>{/each}
      </div>
    </section>
    <section aria-label="Campaign maintenance controls">
      <h2>Development maintenance</h2>
      <CampaignMaintenance
        paused={maintenancePaused}
        mode={galleryMode}
        realAvailable
        onmigrate={(mode) => {
          galleryMode = mode;
          maintenancePaused = false;
        }}
        onchange={() => (maintenancePaused = !maintenancePaused)}
      />
      <CampaignMaintenance busy onchange={() => {}} />
    </section>
    <section>
      <h2>Asset provenance</h2>
      <p>
        The entry landscape, phone landscape, navigation atlas and eight
        portrait atlas are commissioned imagegen assets. Fonts are locally
        bundled Cormorant Garamond and Atkinson Hyperlegible under their
        supplied OFL licences. No generated lettering is used.
      </p>
      <a
        href="https://github.com/anicolao/clusterii/blob/feat/campaign-admission/docs/art/PRODUCTION_ASSETS.md"
        >Exact prompts and source assets</a
      >
      <p>
        Button focus, selected and disabled styles come from production CSS;
        motion comes from the shared feedback action.
      </p>
    </section>
  </div>
</div>

<style>
  .dev-shell {
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
  nav,
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin: 16px 0;
  }
  a {
    color: var(--gold);
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 12px;
  }
  .samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr));
    gap: 24px;
    margin-top: 24px;
  }
  .faction-specimens {
    grid-column: 1 / -1;
  }
  .samples.narrow {
    grid-template-columns: minmax(0, 393px);
  }
  section {
    min-width: 0;
    border: 1px solid #6b716f;
    padding: 24px;
    background: #091722;
  }
  section :global(.entry-button) {
    width: 100%;
    margin-bottom: 12px;
  }
  .field-specimen {
    margin-bottom: 24px;
  }
  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }
  .icon-grid div {
    display: grid;
    text-align: center;
    gap: 8px;
  }
  .icon-grid :global(span) {
    font-size: 32px;
  }
  @media (max-width: 700px) {
    .dev-shell {
      padding: 16px;
    }
    section {
      padding: 16px;
    }
    h1 {
      font-size: 38px;
    }
  }
</style>
