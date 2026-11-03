<script lang="ts">
  import { base } from "$app/paths";
  import { untrack, tick } from "svelte";
  import { developments, type Development } from "@shared/construction";
  import {
    validAllocation,
    type Allocation,
    type MarketFocus,
  } from "@shared/market-focus";
  import type { ProductionLedger } from "@shared/production";
  import type { MotionInspection } from "$lib/motion";
  import DevelopmentIcon from "./DevelopmentIcon.svelte";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import type { MarketAllocationDraft } from "$lib/market-draft";
  import MarketRules from "./MarketRules.svelte";
  let {
    focus,
    draft = $bindable<MarketAllocationDraft>({
      ...untrack(() => focus.orders.at(-1)?.allocation ?? focus.allocation),
    }),
    ledger,
    paused = false,
    busy = false,
    pending = false,
    message = "",
    error = "",
    onapply,
    onclose,
    onretry,
    inspect,
  }: {
    focus: MarketFocus;
    draft?: MarketAllocationDraft;
    ledger?: ProductionLedger | null;
    paused?: boolean;
    busy?: boolean;
    pending?: boolean;
    message?: string;
    error?: string;
    onapply?: (allocation: Allocation) => void;
    onclose: () => void;
    onretry?: () => void;
    inspect?: MotionInspection;
  } = $props();
  const names = {
    market: "Market",
    camp: "Training camp",
    base: "Base",
    station: "Space station",
  };
  const total = $derived(
    developments.reduce((sum, type) => sum + (draft[type] ?? 0), 0),
  );
  const valid = $derived(validAllocation(draft));
  const unchanged = $derived(
    developments.every(
      (type) =>
        draft[type] ===
        (focus.orders.at(-1)?.allocation ?? focus.allocation)[type],
    ),
  );
  const constraint = $derived(
    paused
      ? "Market orders are paused. Resume the campaign to apply focus."
      : !valid
        ? "Allocate exactly 100 whole points across the four developments."
        : unchanged
          ? "This allocation is already configured."
          : "",
  );
  const amount = (value: number) =>
    (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });
  const id = $props.id();
  let commit: HTMLDivElement;
  async function apply(event: SubmitEvent) {
    event.preventDefault();
    if (constraint || busy || pending || !onapply || !validAllocation(draft))
      return;
    commit?.focus();
    onapply({ ...draft });
    await tick();
    if (document.activeElement === document.body) commit?.focus();
  }
  function keepFocusedControlVisible(region: HTMLDivElement) {
    let connected = true;
    const reveal = () => {
      const control = document.activeElement;
      if (
        !connected ||
        !region.clientHeight ||
        !(control instanceof HTMLElement) ||
        control === region ||
        !region.contains(control)
      )
        return;
      const bounds = control.getBoundingClientRect();
      const viewport = region.getBoundingClientRect();
      const style = getComputedStyle(control);
      const ring = control.matches(":focus-visible")
        ? Math.max(
            0,
            parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
          )
        : 0;
      const top = viewport.top + region.clientTop;
      const bottom = top + region.clientHeight;
      // Only adjust this bounded reader; preserve keyboard focus and page position.
      if (bounds.top - ring < top)
        region.scrollTop += Math.floor(bounds.top - ring - top);
      else if (bounds.bottom + ring > bottom)
        region.scrollTop += Math.ceil(bounds.bottom + ring - bottom);
    };
    const afterUpdate = () => {
      void tick().then(reveal);
    };
    const observer = new ResizeObserver(reveal);
    observer.observe(region);
    region.addEventListener("focusin", afterUpdate);
    region.addEventListener("input", afterUpdate);
    return {
      destroy() {
        connected = false;
        observer.disconnect();
        region.removeEventListener("focusin", afterUpdate);
        region.removeEventListener("input", afterUpdate);
      },
    };
  }
  function change(type: Development, amount: number) {
    draft[type] = Math.min(100, Math.max(0, (draft[type] ?? 0) + amount));
  }
</script>

<section class="focus-instrument" aria-label="Market focus">
  <header
    style={`background-image:linear-gradient(90deg,#04131be8,#04131b75),url(${base}/art/construction-market.webp)`}
  >
    <p class="overline gold">Your markets</p>
    <h2 tabindex="-1">Market focus</h2>
  </header>
  <form onsubmit={apply}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded allocation details support keyboard scrolling.) -->
    <div
      class="focus-scroll"
      use:keepFocusedControlVisible
      role="region"
      aria-label="Focus allocation details"
      tabindex="0"
    >
      <p>
        Allocate 100 points across the developments you expect other empires to
        complete.
      </p>
      <div class="allocations">
        {#each developments as type}<fieldset>
            <legend>{names[type]}</legend>
            <div class="focus-entry">
              <div class="allocation-icon"><DevelopmentIcon {type} /></div>
              <div class="allocation-bar">
                <progress
                  aria-label={`${names[type]} allocation`}
                  max="100"
                  value={draft[type] ?? 0}
                ></progress><small>Current {focus.allocation[type]}</small>
              </div>
              <ActionButton
                class="secondary"
                aria-label={`Decrease ${names[type]} focus`}
                disabled={busy || pending || (draft[type] ?? 0) <= 0}
                onclick={() => change(type, -1)}>−</ActionButton
              ><label for={`${id}-${type}`}
                ><span class="sr-only">{names[type]} points</span><input
                  id={`${id}-${type}`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  bind:value={draft[type]}
                  disabled={busy || pending}
                /></label
              ><ActionButton
                class="secondary"
                aria-label={`Increase ${names[type]} focus`}
                disabled={busy || pending || (draft[type] ?? 0) >= 100}
                onclick={() => change(type, 1)}>+</ActionButton
              >
            </div>
          </fieldset>{/each}
      </div>
      <MarketRules />
      {#if ledger}<section aria-label="Confirmed market income">
          <h3>Confirmed last tick</h3>
          <dl>
            <div>
              <dt>Production credits</dt>
              <dd>
                {amount(
                  ledger.creditsMilli -
                    (ledger.marketDividendsMilli ?? 0) -
                    ledger.releasedEscrowMilli,
                )}
              </dd>
            </div>
            <div>
              <dt>Market returns included</dt>
              <dd>{amount(ledger.marketDividendsMilli ?? 0)}</dd>
            </div>
            <div>
              <dt>Held this tick · not spendable</dt>
              <dd>{amount(ledger.escrowMilli)}</dd>
            </div>
          </dl>
        </section>{/if}
      <section aria-label="Focus timing">
        <h3>When it takes effect</h3>
        <p>
          Other empires’ completions create a shared dividend pool; a higher
          allocation increases your markets’ share for that type. Future
          purchases and returns are uncertain. The order applies at its next
          eligible tick. Dividends use the focus frozen at the beginning of that
          tick, so your new allocation first affects the following tick. Your
          own builds never pay your markets.
        </p>
        {#if focus.orders.length}<h3>Accepted orders</h3>
          <ol>
            {#each focus.orders as order}<li>
                Applies tick {order.effectiveTick} · dividends from tick {order.effectiveTick +
                  1}<span
                  >{developments
                    .map((type) => `${names[type]} ${order.allocation[type]}`)
                    .join(" · ")}</span
                >
              </li>{/each}
          </ol>{/if}
        {#if focus.lastApplied}<p
            role="status"
            aria-label="Applied market focus"
          >
            Focus applied at tick {focus.lastApplied.effectiveTick}. Dividends
            use it from tick {focus.lastApplied.effectiveTick + 1}.
          </p>{/if}
        <p class="gold">
          Development campaign · Market dividend rules remain under review.
        </p>
      </section>
    </div>
    <footer>
      <div class="allocation-total">
        <strong>{total} / 100 allocated</strong><span
          >{total <= 100
            ? `${100 - total} remaining`
            : `${total - 100} over allocation`}</span
        >
      </div>
      <div
        bind:this={commit}
        tabindex="-1"
        role="group"
        aria-label="Market focus acknowledgement"
      >
        <Feedback {message} {error} {inspect} />{#if constraint}<p>
            {constraint}
          </p>{/if}
      </div>
      <div class="actions">
        <ActionButton class="secondary" onclick={onclose}
          >Back to economy</ActionButton
        >{#if error && pending && onretry}<ActionButton
            class="secondary"
            onclick={onretry}
            disabled={busy}>Reconnect</ActionButton
          >{/if}<ActionButton
          class="primary"
          type="submit"
          disabled={!!constraint || busy || pending || !onapply}
          >Apply focus</ActionButton
        >
      </div>
    </footer>
  </form>
</section>

<style>
  .focus-instrument {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    container-type: inline-size;
  }
  header {
    flex: none;
    padding: 20px;
    background-size: cover;
    background-position: center;
    margin-bottom: 12px;
  }
  h2 {
    font:
      500 34px "Cormorant Garamond",
      serif;
    margin: 0;
  }
  header p {
    margin: 6px 0;
  }
  form {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .focus-scroll {
    min-height: 0;
    flex: 1;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0 8px 20px 0;
  }
  .focus-scroll > p {
    max-width: 78ch;
    line-height: 1.6;
  }
  .allocations {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  fieldset {
    min-width: 0;
    margin: 0;
    padding: 12px;
    border: 1px solid #42616d;
    border-radius: 4px;
    background: #081c26;
  }
  legend {
    font-weight: 700;
    padding: 0 6px;
  }
  .allocation-icon {
    color: #d7c8a0;
    display: flex;
    align-items: center;
    height: 48px;
  }
  .allocation-bar {
    flex: 1;
    min-width: 20px;
    display: grid;
    align-content: center;
    gap: 6px;
    height: 48px;
  }
  progress {
    width: 100%;
    height: 10px;
    accent-color: #7ce9fa;
  }
  small {
    font-size: 12px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .focus-entry {
    display: flex;
    align-items: end;
    gap: 8px;
  }
  .focus-entry label {
    display: flex;
    flex-direction: column;
    width: 80px;
    flex: none;
    min-width: 0;
    font-size: 14px;
    gap: 6px;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    min-height: 48px;
    border: 1px solid #7198a6;
    background: #03131c;
    color: #fff;
    padding: 8px;
    font:
      700 22px "Atkinson Hyperlegible",
      sans-serif;
  }
  .focus-entry :global(button) {
    min-width: 48px;
    min-height: 48px;
  }
  input:focus-visible {
    outline: 2px solid #7ce9fa;
    outline-offset: 3px;
  }
  dl {
    display: grid;
    gap: 10px;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
  h3 {
    font:
      500 26px "Cormorant Garamond",
      serif;
  }
  li {
    margin-bottom: 12px;
  }
  li span {
    display: block;
    line-height: 1.6;
  }
  footer {
    flex: none;
    border-top: 1px solid #42616d;
    padding: 16px 0 max(0px, env(safe-area-inset-bottom));
    background: #04131b;
  }
  .allocation-total {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
  }
  .actions :global(button) {
    min-width: 150px;
  }
  .actions :global(.primary) {
    background: #7ce9fa;
    color: #03131c;
    box-shadow: 0 0 20px #65d9e733;
  }
  footer p {
    font-size: 14px;
    margin: 10px 0;
  }
  footer [tabindex]:focus-visible {
    outline: 2px solid #7ce9fa;
    outline-offset: 3px;
  }
  @container (max-width:600px) {
    .allocations {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    fieldset {
      padding: 10px;
    }

    .actions :global(button) {
      min-width: 0;
      flex: 1;
    }
    .allocation-total {
      font-size: 15px;
    }
    header {
      padding-bottom: 10px;
    }
  }
</style>
