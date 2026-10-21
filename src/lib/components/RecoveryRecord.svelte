<script lang="ts">
  import { tick } from "svelte";
  import ActionButton from "./ActionButton.svelte";
  let {
    reason,
    onretry,
    onforget,
    confirming = $bindable(false),
  }: {
    reason: string;
    onretry: () => void | Promise<void>;
    onforget: () => void | Promise<void>;
    confirming?: boolean;
  } = $props();
  let heading: HTMLHeadingElement;
  let region: HTMLElement;
  let busy = $state(false);
  async function cancel() {
    confirming = false;
    await tick();
    region.querySelector<HTMLElement>('[data-focus="forget-record"]')?.focus();
  }
  async function act(action: () => void | Promise<void>) {
    if (busy) return;
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }
  async function confirm() {
    confirming = true;
    await tick();
    heading?.focus();
  }
</script>

<section
  bind:this={region}
  class="recovery-record"
  aria-label="Saved order recovery"
>
  <p class="overline">This browser · recovery record</p>
  <h1 bind:this={heading} tabindex="-1">
    {confirming ? "Forget this saved record?" : "Saved order needs review"}
  </h1>
  <p role="alert">{reason}</p>
  <p>
    Forgetting this browser’s record does not cancel an order. An order already
    accepted by the campaign remains effective. Review the campaign’s history
    before placing another order.
  </p>
  <div class="actions">
    {#if confirming}<ActionButton
        class="secondary"
        disabled={busy}
        onclick={cancel}>Keep saved record</ActionButton
      ><ActionButton
        class="primary"
        disabled={busy}
        onclick={() => act(onforget)}
        >Confirm forgetting local record</ActionButton
      >
    {:else}<ActionButton
        class="secondary"
        disabled={busy}
        data-focus="forget-record"
        onclick={confirm}>Forget this browser’s record</ActionButton
      ><ActionButton
        class="primary"
        disabled={busy}
        onclick={() => act(onretry)}>Retry order recovery</ActionButton
      >{/if}
  </div>
</section>

<style>
  .recovery-record {
    width: min(100%, 48rem);
    margin: auto;
    padding: clamp(1.25rem, 4vw, 3rem);
    border: 1px solid var(--line);
    background: var(--panel);
    box-sizing: border-box;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1.15;
  }
  p {
    line-height: 1.6;
  }
  .actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 2rem;
  }
  .actions :global(button) {
    flex: 1 1 15rem;
  }
</style>
