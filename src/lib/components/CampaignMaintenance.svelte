<script lang="ts">
  import { tick } from "svelte";
  import ActionButton from "./ActionButton.svelte";
  let {
    paused = false,
    busy = false,
    pending = false,
    onchange,
  }: {
    paused?: boolean;
    busy?: boolean;
    pending?: boolean;
    onchange: () => void;
  } = $props();
  let panel = $state<HTMLDetailsElement>();
  let requested = $state(false);
  $effect(() => {
    if (requested && !busy && !pending) {
      requested = false;
      void tick().then(() => {
        if (
          panel?.isConnected &&
          (document.activeElement === document.body ||
            panel.contains(document.activeElement))
        )
          panel.querySelector("button")?.focus();
      });
    }
  });
</script>

<details class="maintenance" bind:this={panel}>
  <summary>Development controls</summary>
  <p>
    {paused
      ? "This campaign is paused. Admissions and scheduled start remain stopped until it resumes."
      : "Pause this development campaign before maintenance. Members retain access to their chart; new admissions and scheduled start stop."}
  </p>
  <ActionButton
    class="secondary"
    disabled={busy || pending}
    onclick={() => {
      requested = true;
      onchange();
    }}>{paused ? "Resume campaign" : "Pause campaign"}</ActionButton
  >
</details>

<style>
  .maintenance {
    border-top: 1px solid #877553;
    margin-top: 20px;
    padding-top: 12px;
  }
  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--gold);
  }
  p {
    line-height: 1.5;
    color: var(--muted);
    max-width: 65ch;
  }
</style>
