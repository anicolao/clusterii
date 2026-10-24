<script lang="ts">
  import { base } from "$app/paths";
  import { Canvas } from "@threlte/core";
  import type { CampaignView } from "@shared/campaign";
  import type { FleetContact } from "@shared/fleet-contacts";
  import Scene from "./galaxy/Scene.svelte";
  import FleetSymbol from "./FleetSymbol.svelte";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  let {
    view,
    contacts,
    selected = $bindable(""),
    loading = false,
    error = "",
    earlier = false,
    newer = false,
    onearlier,
    onlatest,
    onretry,
    onclose,
  }: {
    view: CampaignView;
    contacts: FleetContact[];
    selected?: string;
    loading?: boolean;
    error?: string;
    earlier?: boolean;
    newer?: boolean;
    onearlier: () => void;
    onlatest: () => void;
    onretry: () => void;
    onclose: () => void;
  } = $props();
  const contact = $derived(
    contacts.find((c) => c.id === selected) ?? contacts[0],
  );
</script>

<div class="contact-host">
  <section class="contacts" aria-label="Fleet contacts">
    <div
      class="contact-chart"
      data-galaxy-viewport
      aria-label="Last observed fleet positions. Select a contact in the list to center its recorded location."
    >
      <Canvas renderMode="on-demand"
        ><Scene
          stars={view.stars}
          selected=""
          stellarClass="all"
          {contacts}
          selectedContact={contact?.id ?? ""}
          cameraRequest={{ action: "overview", starId: "", sequence: 0 }}
        /></Canvas
      >
      <p>
        Observed positions · tick {view.production?.tick ?? 0}<br />Contacts do
        not track hidden movement.
      </p>
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded contact detail is keyboard scrollable.) -->
    <div
      class="contact-details history-scroll"
      role="region"
      aria-label="Contact details"
      tabindex="0"
    >
      <p class="overline">Your acquired intelligence</p>
      <h2>Fleet contacts</h2>
      {#if !view.fleetContactsEnabled}<p>
          This older campaign has no fleet scans. Its stellar observations and
          history remain available. Create a new development campaign for fleet
          contacts.
        </p>{:else}
        <p>
          Last seen in loaded history. A missed scan does not confirm movement,
          changes or destruction.
        </p>
        <Feedback
          message={loading ? "Loading authorized contact records…" : ""}
          {error}
        />
        {#if contact}<article aria-label="Selected fleet contact">
            <img
              class="contact-art"
              src={`${base}/art/fleet-preparation.webp`}
              alt=""
            />
            <h3><FleetSymbol /> {contact.owner} · Fleet {contact.number}</h3>
            <p class="observed">
              Observed tick {contact.observedTick} · {contact.observedTick ===
              view.production?.tick
                ? "Current tick observation"
                : "Last seen; current position unknown"}
            </p>
            <dl>
              <dt>Fighters observed</dt>
              <dd>{contact.fighters}</dd>
              <dt>Infantry observed</dt>
              <dd>{contact.infantry}</dd>
              <dt>Observed coordinates (ly)</dt>
              <dd>
                {contact.x.toFixed(2)}, {contact.y.toFixed(2)}, {contact.z.toFixed(
                  2,
                )}
              </dd>
            </dl>
            <p>Route and destination are private.</p>
          </article>{:else if !loading}<p>
            No fleet contacts in the records loaded.
          </p>{/if}
        <div class="contact-list" role="group" aria-label="Observed fleets">
          {#each contacts as item}<ActionButton
              class="secondary"
              aria-pressed={contact?.id === item.id}
              onclick={() => (selected = item.id)}
              >{item.owner} · Fleet {item.number}<span
                >Observed tick {item.observedTick}</span
              ></ActionButton
            >{/each}
        </div>
        {#if !loading && !error}<p>
            {newer
              ? "New records are available. Refresh to recover observations between loaded pages."
              : earlier
                ? "Earlier records may contain other last-seen contacts."
                : "Beginning of your available history."}
          </p>{/if}
      {/if}
    </div>
    <footer>
      {#if error}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onretry}>Retry contact history</ActionButton
        >{/if}{#if newer}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onlatest}>Refresh observations</ActionButton
        >{/if}{#if earlier}<ActionButton
          class="secondary"
          disabled={loading}
          onclick={onearlier}>Earlier observations</ActionButton
        >{/if}<ActionButton class="secondary" onclick={onclose}
        >Back to galaxy</ActionButton
      >
    </footer>
  </section>
</div>

<style>
  .contact-host {
    height: 100%;
    min-width: 0;
    min-height: 0;
    container-type: inline-size;
    container-name: fleet-contacts;
  }
  .contacts {
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 560px);
    grid-template-rows: minmax(0, 1fr) auto;
    background: #07131c;
    color: #f1ede1;
    min-height: 0;
  }
  .contact-chart {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    grid-row: 1/3;
    min-height: 0;
  }
  .contact-chart > p {
    position: absolute;
    top: 12px;
    left: 16px;
    background: #07131cdd;
    padding: 8px;
    pointer-events: none;
    color: #dccbb5;
  }
  .contact-details {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scroll-padding-block: 16px;
    padding: 24px;
    line-height: 1.5;
  }
  h2 {
    font:
      500 40px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h3 {
    font:
      500 28px "Cormorant Garamond",
      serif;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0;
  }
  .contact-art {
    width: 100%;
    height: 110px;
    object-fit: cover;
    object-position: center 45%;
    border: 1px solid #5b574b;
  }
  article {
    border-left: 2px solid #c7a47e;
    padding-left: 16px;
  }
  .observed {
    color: #e8c9a4;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  dd {
    margin: 0;
  }
  .contact-list {
    display: grid;
    gap: 8px;
  }
  .contacts :global(button) {
    min-height: 48px;
    padding: 10px 14px;
    font: inherit;
    background: #102b39;
    color: #f1ede1;
    border: 1px solid #66828a;
    text-align: left;
  }
  .contact-list :global(button) {
    scroll-margin-block: 16px;
    display: flex;
    flex-direction: column;
  }
  .contact-list :global(button[aria-pressed="true"]) {
    border: 2px solid #dfbd93;
    background: #23343b;
  }
  .contact-list :global(span) {
    color: #c4b69e;
    font-size: 14px;
  }
  footer {
    padding: 16px 24px max(16px, env(safe-area-inset-bottom));
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    border-top: 1px solid #39525c;
    z-index: 2;
  }
  footer :global(button) {
    flex: 1;
    text-align: center;
  }
  @container fleet-contacts (min-width: 2300px) {
    .contacts {
      font-size: 24px;
      grid-template-columns: minmax(0, 1fr) minmax(620px, 30vw);
    }
    h2 {
      font-size: 56px;
    }
    h3 {
      font-size: 40px;
    }
    .contacts :global(button) {
      min-height: 64px;
    }
    .contact-list :global(span) {
      font-size: 20px;
    }
  }
  @container fleet-contacts (max-width: 760px) {
    .contacts {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(140px, 24svh) minmax(0, 1fr) auto;
    }
    .contact-chart {
      grid-row: 1;
    }
    .contact-chart > p {
      font-size: 13px;
      top: 0;
    }
    .contact-details {
      padding: 16px 20px;
    }
    .contact-art {
      height: 64px;
    }
    h3 {
      font-size: 26px;
    }
    h2 {
      font-size: 32px;
    }
    footer {
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
    dl {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    dd {
      overflow-wrap: anywhere;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      scroll-behavior: auto;
    }
  }
</style>
