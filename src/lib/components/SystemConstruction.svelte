<script lang="ts">
  import { base } from "$app/paths";
  import { tick } from "svelte";
  import type { MotionInspection } from "$lib/motion";
  import type { CampaignView } from "@shared/campaign";
  import {
    buildCost,
    developmentField,
    developments,
    layer,
    type Development,
  } from "@shared/construction";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  let {
    inspect,
    view,
    starId,
    onbuild,
    oncancel,
    onclose,
    onretry,
    busy = false,
    pending = false,
    message = "",
    error = "",
  }: {
    inspect?: MotionInspection;
    view: CampaignView;
    starId: string;
    onbuild?: (type: Development) => void;
    oncancel?: (orderId: string) => void;
    onclose: () => void;
    onretry?: () => void;
    busy?: boolean;
    pending?: boolean;
    message?: string;
    error?: string;
  } = $props();
  const names = {
    market: "Market",
    camp: "Training camp",
    base: "Base",
    station: "Space station",
  };
  const outputs = {
    market: "credits",
    camp: "fighters",
    base: "infantry",
    station: "science",
  };
  let chosen = $state<Development>("market");
  const star = $derived(view.stars.find((s) => s.id === starId)!);
  const holding = $derived(view.holdings.find((h) => h.starId === starId));
  const orders = $derived(
    view.construction?.orders.filter((o) => o.starId === starId) ?? [],
  );
  const capacity = $derived(
    rules.developmentTypeBaseCapacity +
      (view.economy?.research.levels.terraforming ?? 0),
  );
  function count(type: Development) {
    return (
      (holding?.[developmentField[type]] ?? 0) +
      orders.filter((o) => o.type === type).length
    );
  }
  const quote = $derived(buildCost(chosen, count(chosen)));
  const balance = $derived(view.empire?.creditsMilli ?? 0);
  const constraint = $derived(
    !view.productionEnabled || view.phase !== "active"
      ? "Construction begins after home assignment in a production-enabled campaign."
      : view.pausedAt != null
        ? "Construction is paused. Resume the campaign to submit an order."
        : holding?.[layer(chosen)] !== "You"
          ? `Control this system’s ${layer(chosen)} to build here.`
          : count(chosen) >= capacity
            ? "This development has reached its capacity. Research terraforming to expand it."
            : orders.filter((o) => layer(o.type) === layer(chosen)).length >=
                rules.constructionQueuePerLayer
              ? "This layer’s queue is full. Wait for completion or cancel an order."
              : balance < quote
                ? "More credits are needed. Wait for production or choose another development."
                : "",
  );
  const id = $props.id();
  let commit: HTMLDivElement;
  async function build(event: SubmitEvent) {
    event.preventDefault();
    if (constraint || busy || pending || !onbuild) return;
    commit?.focus();
    onbuild(chosen);
    await tick();
    if (document.activeElement === document.body) commit?.focus();
  }
  async function cancel(orderId: string) {
    if (busy || pending || !oncancel) return;
    commit?.focus();
    oncancel(orderId);
    await tick();
    if (document.activeElement === document.body) commit?.focus();
  }
  const amount = (milli: number) =>
    (milli / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });
</script>

<section
  class="construction"
  aria-label="System construction"
  style={`--construction-art: url('${base}/art/construction-${chosen}.webp')`}
>
  <header>
    <p class="overline gold">{star.class}-class · Your developments</p>
    <h2>{star.name}</h2>
    <p>Available credits <strong>{amount(balance)}</strong></p>
  </header>
  <form onsubmit={build}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded details support keyboard scrolling.) -->
    <div
      class="construction-scroll"
      role="region"
      aria-label="Construction details"
      tabindex="0"
    >
      <fieldset>
        <legend>Choose a development</legend>
        <div class="choices">
          {#each developments as type}<label class:selected={chosen === type}>
              <input
                type="radio"
                name={`development-${id}`}
                value={type}
                bind:group={chosen}
                disabled={busy || pending}
              />
              <img src={`${base}/art/construction-${type}.webp`} alt="" />
              <span
                ><strong>{names[type]}</strong><small
                  >{layer(type) === "orbit" ? "Orbit" : "Surface"} · Produces {outputs[
                    type
                  ]}</small
                ><small
                  >{holding?.[layer(type)] === "You"
                    ? `${holding?.[developmentField[type]] ?? 0} completed · ${orders.filter((o) => o.type === type).length} queued`
                    : "Control required"}</small
                ></span
              >
            </label>{/each}
        </div>
      </fieldset>
      <div class="queue-details">
        <h3>Construction queues</h3>
        <p>
          Each layer builds one development at a time. Four advances complete a
          build; its first advance follows the tick when it starts.
        </p>
        {#if !orders.length}<p>No construction queued.</p>{/if}
        {#each ["surface", "orbit"] as queueLayer}{@const queue = orders.filter(
            (o) => layer(o.type) === queueLayer,
          )}{#if queue.length}<h4>
              {queueLayer === "surface" ? "Surface" : "Orbit"}
            </h4>
            <ol>
              {#each queue as order}{@const cancellation =
                  view.construction?.cancellations.find(
                    (c) => c.orderId === order.id,
                  )}
                <li>
                  <div>
                    <strong>{names[order.type]}</strong><span
                      >{order.startedTick === null
                        ? `Queued · eligible tick ${order.effectiveTick}`
                        : `${order.progress} / ${rules.developments[order.type].buildTicks} advances`}
                      · Paid {amount(order.paidMilli)}</span
                    ><span
                      >{cancellation
                        ? `Cancellation queued for tick ${cancellation.effectiveTick}`
                        : `Cancel refund now: ${amount(order.progress ? Math.floor(order.paidMilli / 2) : order.paidMilli)} credits. Progress at the execution tick determines the refund.`}</span
                    >
                  </div>
                  {#if oncancel}<ActionButton
                      type="button"
                      class="secondary"
                      disabled={busy ||
                        pending ||
                        !!cancellation ||
                        view.pausedAt != null}
                      onclick={() => cancel(order.id)}
                      aria-label={`Cancel ${names[order.type].toLowerCase()} order`}
                      >Cancel</ActionButton
                    >{/if}
                </li>{/each}
            </ol>{/if}{/each}
        {#if view.construction?.ledger.some((event) => event.starId === starId)}<h3
          >
            Last settled construction
          </h3>
          <ul>
            {#each view.construction.ledger.filter((event) => event.starId === starId) as event}<li
              >
                {names[event.type]} · {event.result}{event.refundMilli
                  ? ` · ${amount(event.refundMilli)} credits returned`
                  : ""}
              </li>{/each}
          </ul>{/if}
        <p class="review-note">
          Development rules under review. Completion dividends use equal market
          focus; new markets qualify from the following tick.
        </p>
      </div>
    </div>
    <div
      class="commit"
      bind:this={commit}
      tabindex="-1"
      role="group"
      aria-label="Construction commitment"
    >
      <div class="quote">
        <h3>{names[chosen]}</h3>
        <p>Cost <strong>{amount(quote)}</strong></p>
        <p>
          Balance after <strong
            >{balance >= quote ? amount(balance - quote) : "—"}</strong
          >
        </p>
      </div>
      {#if constraint}<p class="constraint">{constraint}</p>{/if}
      {#if message || error}<Feedback
          {inspect}
          {message}
          {error}
          errorId={`${id}-construction-error`}
        />{/if}
      <div class="actions">
        <ActionButton type="button" class="secondary" onclick={onclose}
          >Back to galaxy</ActionButton
        ><ActionButton
          type="submit"
          disabled={!onbuild || !!constraint || busy || pending}
          >{busy || pending
            ? "Awaiting acknowledgement…"
            : `Build ${names[chosen].toLowerCase()}`}</ActionButton
        >{#if onretry}<ActionButton
            type="button"
            class="secondary"
            disabled={busy}
            onclick={onretry}
            >{pending ? "Retry order" : "Reconnect"}</ActionButton
          >{/if}
      </div>
    </div>
  </form>
</section>

<style>
  .construction {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background:
      linear-gradient(180deg, #06121aaa, #06121a00 30%, #06121a 72%),
      var(--construction-art) center/cover;
    isolation: isolate;
    container-type: inline-size;
  }
  header {
    padding: 24px 32px;
    background: linear-gradient(90deg, #06121aee, transparent);
    flex-shrink: 0;
  }
  h2 {
    font:
      500 clamp(32px, 3vw, 60px) "Cormorant Garamond",
      serif;
    margin: 4px 0;
  }
  header p {
    margin: 4px 0;
  }
  form {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  fieldset {
    padding: 0;
    border: 0;
    margin: 0;
  }
  legend {
    font-weight: 600;
    padding: 0 0 10px;
  }
  .construction-scroll {
    overflow: auto;
    min-height: 0;
    max-height: 58%;
    padding: 18px 32px;
    background: linear-gradient(transparent, #06121af0 30%);
    scroll-padding: 16px;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  label {
    position: relative;
    border: 1px solid #506b79;
    border-radius: 6px;
    overflow: hidden;
    background: #071822;
    cursor: pointer;
  }
  label.selected {
    border-color: #a7efff;
    box-shadow: 0 0 14px #50cce750;
  }
  label:has(:focus-visible) {
    outline: 2px solid #b5f4ff;
    outline-offset: 3px;
  }
  input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  img {
    width: 100%;
    height: clamp(72px, 12vh, 170px);
    object-fit: cover;
    display: block;
  }
  label span {
    display: block;
    padding: 12px;
  }
  small {
    display: block;
    color: #bcced7;
    line-height: 1.5;
  }
  strong {
    font-weight: 600;
  }
  .queue-details {
    padding: 16px 0;
  }
  .queue-details p {
    max-width: 75ch;
    line-height: 1.5;
  }
  .queue-details ol {
    padding-left: 24px;
  }
  .queue-details li {
    padding: 10px 0;
  }
  .queue-details li div span {
    display: block;
    margin-top: 6px;
    color: #bcced7;
  }
  .queue-details li:has(:global(button)) {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: center;
  }
  h3 {
    font:
      500 26px "Cormorant Garamond",
      serif;
    margin: 0;
  }
  h4 {
    margin: 16px 0 4px;
  }
  .commit {
    flex-shrink: 0;
    padding: 16px 32px max(16px, env(safe-area-inset-bottom));
    background: #06121a;
    border-top: 1px solid #61777e;
  }
  .commit:focus-visible {
    outline: 2px solid #a7efff;
    outline-offset: -3px;
  }
  .quote {
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .quote h3 {
    margin-right: auto;
  }
  .quote p {
    margin: 0;
  }
  .quote strong {
    display: block;
    font-size: 24px;
  }
  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 12px;
  }
  .actions :global(button[type="submit"]) {
    min-width: 220px;
    background: #79e3f1;
    border-color: #b4f8ff;
    color: #04121b;
    box-shadow: 0 0 16px #53ccdd44;
  }
  .actions :global(button:disabled) {
    box-shadow: none;
  }
  .constraint {
    color: #f3bf93;
    margin: 10px 0 0;
  }
  .review-note {
    color: #c6b28a;
  }
  @media (min-width: 2500px) {
    header {
      padding: 40px 64px;
    }
    .construction-scroll {
      padding: 24px 64px;
      font-size: 24px;
    }
    .commit {
      padding: 24px 64px;
      font-size: 24px;
    }
    .actions :global(button) {
      font-size: 24px;
      min-height: 64px;
    }
  }
  @container (max-width: 700px) {
    header {
      padding: 16px 20px;
    }
    header p {
      font-size: 14px;
    }
    .construction-scroll {
      max-height: 100%;
      padding: 14px 20px;
      background: #06121ae8;
      margin-top: 80px;
    }
    .choices {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    label {
      display: flex;
      min-height: 78px;
    }
    img {
      width: 100px;
      height: auto;
      object-fit: cover;
    }
    label span {
      padding: 8px;
      min-width: 0;
    }
    small {
      font-size: 12px;
    }
    .commit {
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
    .quote {
      gap: 16px;
    }
    .quote h3 {
      font-size: 22px;
    }
    .quote p {
      font-size: 12px;
    }
    .quote strong {
      font-size: 18px;
    }
    .actions {
      gap: 8px;
      flex-wrap: wrap;
    }
    .actions :global(button) {
      flex: 1;
      padding: 10px;
      font-size: 14px;
    }
    .actions :global(button[type="submit"]) {
      min-width: 0;
    }
    .constraint {
      font-size: 13px;
    }
    .queue-details li:has(:global(button)) {
      align-items: flex-start;
    }
    .queue-details {
      font-size: 14px;
    }
  }
  @media (max-height: 760px) and (min-width: 701px) {
    header {
      padding: 12px 24px;
    }
    header h2 {
      font-size: 30px;
    }
    .construction-scroll {
      max-height: 76%;
      padding: 12px 24px;
    }
    .commit {
      padding: 10px 24px;
    }
    .actions {
      margin-top: 8px;
    }
    img {
      height: 72px;
    }
  }
</style>
