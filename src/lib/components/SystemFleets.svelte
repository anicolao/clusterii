<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import FleetSymbol from "./FleetSymbol.svelte";
  let {
    view,
    starId,
    pending = false,
    busy = false,
    message = "",
    error = "",
    onform,
    ondisband,
    onclose,
    onretry,
  }: {
    view: CampaignView;
    starId: string;
    pending?: boolean;
    busy?: boolean;
    message?: string;
    error?: string;
    onform: (fighters: number, infantry: number) => void;
    ondisband: (id: string) => void;
    onclose: () => void;
    onretry?: () => void;
  } = $props();
  let fighters = $state<number | undefined>(1),
    infantry = $state<number | undefined>(0),
    selected = $state<string | null>(null);
  const star = $derived(view.stars.find((s) => s.id === starId)!);
  const holding = $derived(view.holdings.find((s) => s.starId === starId));
  const fleets = $derived(
    view.military?.fleets.filter((f) => f.starId === starId) ?? [],
  );
  const orders = $derived(
    view.military?.orders.filter((o) => o.starId === starId) ?? [],
  );
  const reserved = $derived(
    orders
      .filter((o) => o.fleetId === null)
      .reduce(
        (sum, o) => ({
          fighters: sum.fighters + o.fighters,
          infantry: sum.infantry + o.infantry,
        }),
        { fighters: 0, infantry: 0 },
      ),
  );
  const available = $derived({
    fighters: (holding?.fighters ?? 0) - reserved.fighters,
    infantry: (holding?.infantry ?? 0) - reserved.infantry,
  });
  const fleet = $derived(fleets.find((f) => f.id === selected));
  const unified = $derived(
    holding?.orbit === "You" && holding?.surface === "You",
  );
  const count = $derived(
    (view.military?.fleets.length ?? 0) +
      (view.military?.orders.filter((o) => o.fleetId === null).length ?? 0),
  );
  const invalid = $derived(
    !view.military
      ? "Fleet preparation requires a production-enabled campaign."
      : view.pausedAt != null
        ? "Paused for development maintenance."
        : holding?.orbit !== "You"
          ? "Orbital control is required."
          : selected
            ? !fleet
              ? "This fleet is no longer stationed here."
              : orders.some((o) => o.fleetId === selected)
                ? "Disbanding is already scheduled."
                : fleet.infantry > 0 && !unified
                  ? "Unified control is required to return infantry."
                  : ""
            : !Number.isSafeInteger(fighters) ||
                !Number.isSafeInteger(infantry) ||
                fighters! < 1 ||
                infantry! < 0
              ? "Choose whole force counts with at least one fighter."
              : infantry! > fighters! * rules.infantryCapacityPerFighter
                ? "Each fighter carries up to ten infantry."
                : infantry! > 0 && !unified
                  ? "Unified control is required to embark infantry."
                  : fighters! > available.fighters ||
                      infantry! > available.infantry
                    ? "Choose forces that are available and not reserved."
                    : count >= rules.maximumFleetsPerPlayer
                      ? "Your empire has reached its fleet limit."
                      : "",
  );
</script>

<section class="fleet-instrument" aria-label="Fleet preparation">
  <header>
    <img
      src={`${base}/art/fleet-preparation.webp`}
      alt="Fighter transport stationed at an orbital hangar above a planet"
    />
    <div class="title">
      <p class="overline">{star.name} · Orbital forces</p>
      <h2><FleetSymbol /> Fleet preparation</h2>
    </div>
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded manifest supports keyboard scrolling.) -->
  <div
    class="fleet-content"
    tabindex="0"
    role="region"
    aria-label="Fleet manifest and orders"
  >
    <nav aria-label="Stationed fleets">
      <ActionButton
        class="secondary"
        aria-pressed={selected === null}
        onclick={() => (selected = null)}>New fleet</ActionButton
      >{#each fleets as f}<ActionButton
          class="secondary"
          aria-pressed={selected === f.id}
          onclick={() => (selected = f.id)}>Fleet {f.number}</ActionButton
        >{/each}
    </nav>
    {#if selected}<h3>{fleet ? `Fleet ${fleet.number}` : "Fleet returned"}</h3>
      {#if fleet}<dl>
          <div>
            <dt>Fighters</dt>
            <dd>{fleet.fighters}</dd>
          </div>
          <div>
            <dt>Embarked infantry</dt>
            <dd>{fleet.infantry}</dd>
          </div>
          <div>
            <dt>Transport capacity</dt>
            <dd>{fleet.fighters * rules.infantryCapacityPerFighter}</dd>
          </div>
        </dl>
        <p>
          Stationed at {star.name}. Disbanding returns these forces to the
          system at its scheduled tick.
        </p>{/if}
    {:else}<h3>Assemble a fleet</h3>
      <p>
        Reserve local forces now. They assemble at the order’s scheduled tick.
      </p>
      <div class="counts">
        <label
          >Fighters<input
            aria-label="Fighters"
            aria-describedby="fighter-availability"
            type="number"
            min="1"
            max={available.fighters}
            step="1"
            bind:value={fighters}
          /><span id="fighter-availability"
            >{available.fighters} available · {reserved.fighters} reserved</span
          ></label
        ><label
          >Infantry<input
            aria-label="Infantry"
            aria-describedby="infantry-availability"
            type="number"
            min="0"
            max={unified ? available.infantry : 0}
            step="1"
            bind:value={infantry}
          /><span id="infantry-availability"
            >{unified ? available.infantry : 0} available · {reserved.infantry} reserved</span
          ></label
        >
      </div>
      <p>
        Each fighter carries ten infantry. Embarkation requires your control of
        orbit and surface.
      </p>{/if}
    {#if orders.length}<section aria-label="Accepted fleet orders">
        <h3>Accepted orders</h3>
        {#each orders as o}<p>
            {o.fleetId ? "Disband" : "Form"} · {o.fighters} fighters · {o.infantry}
            infantry · tick {o.effectiveTick}
          </p>{/each}
      </section>{/if}
    {#each view.military?.ledger.filter((e) => e.starId === starId) ?? [] as e}<p
        class="outcome"
        role="status"
      >
        {e.result === "formed"
          ? "Fleet formed"
          : e.result === "disbanded"
            ? "Fleet disbanded"
            : "Fleet order could not execute; its reservation was released"} · {e.fighters}
        fighters · {e.infantry} infantry.
      </p>{/each}
  </div>
  <footer>
    <div class="feedback">
      <Feedback {message} {error} />{#if invalid}<p>{invalid}</p>{/if}
    </div>
    <div class="actions">
      <ActionButton class="secondary" onclick={onclose}
        >Back to system</ActionButton
      >{#if error && pending && onretry}<ActionButton
          disabled={busy}
          onclick={onretry}>Check fleet order</ActionButton
        >{:else}<ActionButton
          disabled={pending || !!invalid}
          onclick={() =>
            selected ? ondisband(selected) : onform(fighters!, infantry!)}
          >{selected ? "Disband fleet" : "Form fleet"}</ActionButton
        >{/if}
    </div>
  </footer>
</section>

<style>
  .fleet-instrument {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 560px);
    grid-template-rows: minmax(0, 1fr) auto;
    background: #06121b;
    color: #f1ede1;
  }
  header {
    position: relative;
    grid-row: 1/3;
    min-height: 0;
    overflow: hidden;
  }
  header img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 55% center;
  }
  .title {
    position: absolute;
    inset: 0 0 auto;
    padding: 32px;
    background: linear-gradient(#03101bee, transparent);
    text-shadow: 0 2px 6px #000;
  }
  h2 {
    font:
      500 40px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h3 {
    font:
      500 30px "Cormorant Garamond",
      serif;
    margin: 20px 0 12px;
  }
  .fleet-content {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 24px;
    line-height: 1.5;
  }
  nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .fleet-instrument :global(button.secondary) {
    background: #0b2532;
    color: #f1ede1;
    border: 1px solid #6b858b;
    min-height: 44px;
    padding: 10px 14px;
  }
  .fleet-instrument :global(button[aria-pressed="true"]) {
    border-color: #8ae8f2;
    background: #174451;
  }
  .counts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .counts label {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .counts span {
    font-size: 14px;
    color: #c2d0d5;
  }
  .counts input {
    min-width: 0;
    width: 100%;
    min-height: 48px;
    box-sizing: border-box;
    font: inherit;
    font-size: 22px;
    color: #fff;
    background: #0d2530;
    border: 1px solid #6b858b;
    padding: 8px;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 12px 0;
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
  .outcome {
    color: #9becdd;
  }
  footer {
    padding: 16px 24px max(16px, env(safe-area-inset-bottom));
    border-top: 1px solid #39525c;
    background: #081923;
    line-height: 1.5;
  }
  .actions :global(button:not(.secondary)) {
    background: #d7bf87;
    border: 1px solid #ead498;
    color: #101e25;
    font-weight: 700;
    padding: 10px 14px;
  }
  .actions :global(button:disabled) {
    background: #243640;
    border-color: #536670;
    color: #c2d0d5;
    opacity: 1;
  }
  .actions {
    display: flex;
    gap: 12px;
  }
  .actions :global(button) {
    flex: 1;
    min-height: 52px;
  }
  .feedback p {
    margin: 4px 0 12px;
  }
  .feedback {
    font-size: 16px;
  }
  .overline {
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #f4d399;
  }
  @media (max-width: 760px) {
    .fleet-instrument {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 150px minmax(0, 1fr) auto;
    }
    header {
      grid-row: auto;
    }
    header img {
      object-position: center 45%;
    }
    .title {
      padding: 12px 20px;
    }
    h2 {
      font-size: 30px;
    }
    .fleet-content {
      padding: 12px 20px;
    }
    h3 {
      font-size: 26px;
      margin: 12px 0;
    }
    footer {
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
    .actions :global(button:not(.secondary)) {
      background: #d7bf87;
      border: 1px solid #ead498;
      color: #101e25;
      font-weight: 700;
      padding: 10px 14px;
    }
    .actions :global(button:disabled) {
      background: #243640;
      border-color: #536670;
      color: #c2d0d5;
      opacity: 1;
    }
    .actions {
      gap: 8px;
    }
    .counts {
      gap: 12px;
    }
  }
  @media (min-width: 2500px) {
    .fleet-instrument {
      grid-template-columns: minmax(0, 1fr) minmax(680px, 30%);
      font-size: 24px;
    }
    h2 {
      font-size: 60px;
    }
    h3 {
      font-size: 42px;
    }
    .overline,
    .counts span {
      font-size: 20px;
    }
    .counts input {
      font-size: 30px;
      min-height: 64px;
    }
    .feedback {
      font-size: 24px;
    }
  }
  @media (max-height: 650px) {
    .fleet-instrument {
      grid-template-rows: minmax(0, 1fr) auto;
    }
    .title {
      padding: 16px;
    }
    header {
      grid-row: 1/3;
    }
  }
  @media (max-width: 760px) and (max-height: 650px) {
    .fleet-instrument {
      grid-template-rows: 100px minmax(0, 1fr) auto;
    }
    header {
      grid-row: auto;
    }
  }
</style>
