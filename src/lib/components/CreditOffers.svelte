<script lang="ts">
  import type { MotionInspection } from "$lib/motion";
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import type { TradeAction } from "@shared/trades";
  import { rules } from "@shared/rules";
  import {
    creditMilli,
    tradeRecords,
    type CreditDraft,
  } from "$lib/credit-offers";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  let {
    view,
    selected = $bindable(""),
    inspect,
    draft = $bindable({ seat: "", give: "10", request: "0" }),
    commandId = "",
    commandOfferId = "",
    commandKind = "",
    message = "",
    error = "",
    pending = false,
    busy = false,
    records = [],
    oncommand,
    onclose,
    onretry,
    onhistory,
  }: {
    view: CampaignView;
    selected?: string;
    inspect?: MotionInspection;
    draft?: CreditDraft;
    commandId?: string;
    commandOfferId?: string;
    commandKind?: string;
    message?: string;
    error?: string;
    pending?: boolean;
    busy?: boolean;
    records?: CampaignView[];
    oncommand: (action: TradeAction) => void;
    onclose: () => void;
    onretry: () => void;
    onhistory: () => void;
  } = $props();
  let acknowledgement = $state<HTMLDivElement>();
  function commit(action: TradeAction) {
    acknowledgement?.focus();
    oncommand(action);
  }
  let selectedCommand = $state("");
  const own = $derived(view.own.seat);
  const give = $derived(creditMilli(draft.give)),
    request = $derived(creditMilli(draft.request));
  const seat = $derived(draft.seat === "" ? -1 : Number(draft.seat));
  const valid = $derived(
    Number.isInteger(seat) &&
      seat >= 0 &&
      seat < view.roster.length &&
      seat !== own &&
      give != null &&
      request != null &&
      give + request > 0 &&
      give <= (view.empire?.creditsMilli ?? 0),
  );
  const outcomes = $derived(tradeRecords([...records, view]));
  const offer = $derived(
    view.trades?.offers.find((offer) => offer.id === selected),
  );
  const outcome = $derived(outcomes.find((outcome) => outcome.id === selected));
  const current = $derived(offer ?? outcome);
  const scoped = $derived(commandKind.startsWith("trade."));
  const feedbackId = $derived(
    commandKind === "trade.offer"
      ? `offer:${own}:${commandId}`
      : commandOfferId,
  );
  const matching = $derived(
    outcomes.find((outcome) => outcome.id === feedbackId),
  );
  const relevant = $derived(
    scoped &&
      (selected === feedbackId || (!selected && commandKind === "trade.offer")),
  );
  const feedback = $derived(
    relevant && matching
      ? `Offer ${matching.result} · confirmed tick ${matching.settledTick}.`
      : relevant && offer?.state === "accepted"
        ? `Both sides are reserved. Settlement is scheduled for tick ${offer.effectiveTick}.`
        : relevant && offer?.state === "withdrawing"
          ? `Withdrawal is scheduled for tick ${offer.effectiveTick}.`
          : relevant
            ? message
            : "",
  );
  const canAct = $derived(
    !busy && !pending && view.pausedAt == null && view.phase === "active",
  );
  const credits = (milli: number) =>
    (milli / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });
  const name = (index: number) => view.roster[index]?.alias ?? "Commander";
  $effect(() => {
    if (
      scoped &&
      commandId &&
      commandKind === "trade.offer" &&
      selectedCommand !== commandId
    ) {
      const id = `offer:${own}:${commandId}`;
      if (
        view.trades?.offers.some((offer) => offer.id === id) ||
        outcomes.some((offer) => offer.id === id)
      ) {
        selected = id;
        selectedCommand = commandId;
      }
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape closes this nested instrument and restores its opening control.) -->
<section
  onkeydown={(event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onclose();
    }
  }}
  class="credit-offers"
  aria-label="Credit offers"
  style={`background:linear-gradient(#071820cf,#071820f5),url(${base}/art/construction-market.webp) center/cover`}
>
  <header>
    <p class="overline gold">Private exchange</p>
    <h2 tabindex="-1">Credit offers</h2>
    <p>Both sides settle together.</p>
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users scroll the bounded offer details without moving the commitment rail.) -->
  <div
    class="offer-reading"
    role="region"
    aria-label="Offer details"
    tabindex="0"
  >
    <nav aria-label="Credit offers">
      <ActionButton
        class="secondary"
        aria-pressed={!selected}
        onclick={() => (selected = "")}>New offer</ActionButton
      >
      {#each view.trades?.offers ?? [] as item (item.id)}<ActionButton
          class="secondary"
          aria-pressed={selected === item.id}
          onclick={() => (selected = item.id)}
          >{item.issuer === own ? "To" : "From"}
          {name(item.issuer === own ? item.counterpart : item.issuer)} · {item.state}</ActionButton
        >{/each}
      {#each outcomes as item (item.id)}<ActionButton
          class="secondary"
          aria-pressed={selected === item.id}
          onclick={() => (selected = item.id)}
          >{item.result} · {name(
            item.issuer === own ? item.counterpart : item.issuer,
          )} · tick {item.settledTick}</ActionButton
        >{/each}
      <ActionButton class="secondary" onclick={onhistory}
        >Earlier offers</ActionButton
      >
    </nav>
    {#if !view.trades?.enabled}<p>
        This campaign retains its earlier economy. Credit offers are available
        in new development campaigns.
      </p>
    {:else if current}<section aria-label="Offer review">
        <h3>{name(current.issuer)} → {name(current.counterpart)}</h3>
        <dl>
          <div>
            <dt>{name(current.issuer)} gives</dt>
            <dd>{credits(current.giveMilli)} credits</dd>
          </div>
          <div>
            <dt>{name(current.counterpart)} gives</dt>
            <dd>{credits(current.requestMilli)} credits</dd>
          </div>
          <div>
            <dt>Expires at the beginning of tick</dt>
            <dd>{current.expiresTick}</dd>
          </div>
        </dl>
        {#if outcome}<p role="status" aria-label="Offer outcome">
            Offer {outcome.result} · confirmed tick {outcome.settledTick}. {outcome.result ===
            "settled"
              ? "Both sides transferred once."
              : "Reserved credits returned to their owners."}
          </p>
        {:else if offer?.state === "accepted"}<p
            role="status"
            aria-label="Offer schedule"
          >
            Both sides are reserved. Settlement is scheduled for tick {offer.effectiveTick}.
          </p>
        {:else if offer?.state === "withdrawing"}<p
            role="status"
            aria-label="Offer schedule"
          >
            Withdrawal is scheduled for tick {offer.effectiveTick}.
          </p>
        {:else}<p>
            The issuer’s offered credits are reserved. Acceptance reserves the
            other side and schedules atomic settlement. Expiry returns reserved
            credits without an exchange.
          </p>{/if}
      </section>
    {:else}<section aria-label="Compose credit offer">
        <h3>Set the terms</h3>
        <label
          >Other commander<select
            bind:value={draft.seat}
            disabled={busy || pending}
            ><option value="">Choose a commander</option
            >{#each view.roster as commander, index}{#if index !== own}<option
                  value={String(index)}>{commander.alias}</option
                >{/if}{/each}</select
          ></label
        ><label
          >Credits you offer<input
            inputmode="decimal"
            bind:value={draft.give}
            disabled={busy || pending}
          /></label
        ><label
          >Credits you request<input
            inputmode="decimal"
            bind:value={draft.request}
            disabled={busy || pending}
          /></label
        >
        <p>
          Use up to three decimal places. A zero return side is a gift. Offered
          credits are reserved on acknowledgement; an unaccepted offer expires
          after {rules.tradeExpiryTicks} ticks.
        </p>
        {#if !valid}<p>
            Choose another commander and affordable amounts. At least one side
            must be greater than zero.
          </p>{/if}
      </section>{/if}
  </div>
  <footer>
    <p class="balance">
      Available: {credits(view.empire?.creditsMilli ?? 0)} credits{#if view.pausedAt != null}
        · Campaign paused{/if}
    </p>
    <div
      role="group"
      aria-label="Exchange acknowledgement"
      tabindex="-1"
      bind:this={acknowledgement}
    >
      <Feedback {inspect} message={feedback} error={relevant ? error : ""} />
    </div>
    <div class="commitment">
      <ActionButton class="secondary" onclick={onclose}
        >Return to economy</ActionButton
      >{#if relevant && error}<ActionButton
          class="secondary"
          onclick={onretry}
          disabled={busy}
          >{pending ? "Check order" : "Refresh terms"}</ActionButton
        >{/if}
      {#if !selected && view.trades?.enabled}<ActionButton
          class="primary"
          disabled={!canAct || !valid}
          onclick={() =>
            commit({
              kind: "trade.offer",
              expectedRevision: view.revision,
              seat,
              giveMilli: give!,
              requestMilli: request!,
            })}
          >{pending
            ? "Awaiting acknowledgement…"
            : busy
              ? "Preparing offer…"
              : "Share credit offer"}</ActionButton
        >
      {:else if offer?.state === "open"}{#if offer.counterpart === own}<ActionButton
            class="primary"
            disabled={!canAct ||
              offer.requestMilli > (view.empire?.creditsMilli ?? 0)}
            onclick={() =>
              commit({
                kind: "trade.accept",
                expectedRevision: view.revision,
                offerId: offer.id,
              })}
            >{pending
              ? "Awaiting acknowledgement…"
              : busy
                ? "Preparing acceptance…"
                : "Accept exact terms"}</ActionButton
          >{:else}<ActionButton
            class="primary"
            disabled={!canAct}
            onclick={() =>
              commit({
                kind: "trade.withdraw",
                expectedRevision: view.revision,
                offerId: offer.id,
              })}
            >{pending
              ? "Awaiting acknowledgement…"
              : busy
                ? "Preparing withdrawal…"
                : "Withdraw offer"}</ActionButton
          >{/if}{/if}
    </div>
  </footer>
</section>

<style>
  .credit-offers {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    container-type: inline-size;
  }
  header,
  footer {
    padding: 24px 32px;
    background: #071820d9;
  }
  header {
    border-bottom: 1px solid #537781;
  }
  h2 {
    font:
      500 48px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  h3 {
    font:
      500 30px "Cormorant Garamond",
      serif;
    margin: 8px 0 20px;
  }
  p {
    line-height: 1.5;
  }
  .offer-reading {
    overflow: auto;
    min-height: 0;
    padding: 24px 32px;
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
    gap: 32px;
    align-content: start;
    scrollbar-gutter: stable;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  nav :global(button) {
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: left;
    min-height: 44px;
  }
  label {
    display: grid;
    gap: 8px;
    margin: 16px 0;
  }
  input,
  select {
    min-height: 48px;
    max-width: 100%;
    min-width: 0;
    padding: 10px;
    background: #07131c;
    color: #f6eedf;
    border: 1px solid #86979d;
    font: inherit;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 0;
    border-bottom: 1px solid #536b70;
  }
  dd {
    margin: 0;
    font-weight: bold;
  }
  footer {
    border-top: 1px solid #536b70;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .balance {
    margin: 0 0 8px;
  }
  .commitment {
    display: flex;
    gap: 12px;
  }
  .commitment :global(button) {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: normal;
    min-height: 48px;
  }
  footer :global(.feedback:empty) {
    display: none;
  }
  @media (min-width: 2400px) {
    .credit-offers {
      font-size: 24px;
    }
    header,
    footer,
    .offer-reading {
      padding: 40px 56px;
    }
    h2 {
      font-size: 72px;
    }
    h3 {
      font-size: 42px;
    }
  }
  @container (max-width:700px) {
    header,
    footer,
    .offer-reading {
      padding: 16px;
      font-size: 16px;
    }
    h2 {
      font-size: 34px;
    }
    h3 {
      font-size: 28px;
    }
    .offer-reading {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
    nav {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    dl > div {
      gap: 12px;
    }
    .commitment {
      gap: 8px;
    }
    .commitment :global(button) {
      padding: 12px 8px;
    }
  }
  @media (max-height: 700px) {
    header,
    footer {
      padding-top: 12px;
      padding-bottom: 12px;
    }
    header p {
      margin: 6px 0;
    }
    h2 {
      font-size: 36px;
    }
  }
</style>
