<script lang="ts">
  import { tick } from "svelte";
  import ActionButton from "./ActionButton.svelte";
  let {
    paused = false,
    busy = false,
    pending = false,
    onchange,
    mode = "mock",
    exposed = true,
    realAvailable = false,
    migration = null,
    onmigrate,
  }: {
    paused?: boolean;
    busy?: boolean;
    pending?: boolean;
    onchange: () => void;
    mode?: "mock" | "real";
    exposed?: boolean;
    realAvailable?: boolean;
    migration?: null | {
      state: string;
      verified: number;
      targetMode: "mock" | "real";
    };
    onmigrate?: (mode: "mock" | "real") => void;
  } = $props();
  const radioName = $props.id();
  let target = $state<"mock" | "real">("mock");
  $effect(() => {
    target = mode;
  });
  let panel = $state<HTMLDetailsElement>();
  let requested = $state(false);
  let requestedMigration = $state(false);
  let migrationStatus = $state<HTMLParagraphElement>();
  $effect(() => {
    if (requestedMigration && migration) {
      requestedMigration = false;
      void tick().then(() => {
        if (migrationStatus?.isConnected) migrationStatus.focus();
      });
    } else if (requestedMigration && !busy && !pending) {
      requestedMigration = false;
      void tick().then(() => {
        if (panel?.isConnected && document.activeElement === document.body)
          panel.querySelectorAll("button").item(1)?.focus();
      });
    }
  });
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
    disabled={busy || pending || !!migration}
    onclick={() => {
      requested = true;
      onchange();
    }}>{paused ? "Resume campaign" : "Pause campaign"}</ActionButton
  >
  {#if onmigrate}
    <fieldset disabled={busy || pending || !!migration}>
      <legend>Encryption mode</legend>
      <label
        ><input
          type="radio"
          name={radioName}
          value="mock"
          bind:group={target}
        />Mock · inspectable</label
      >
      <label
        ><input
          type="radio"
          name={radioName}
          value="real"
          bind:group={target}
          disabled={!realAvailable}
        />Real · managed keys</label
      >
    </fieldset>
    <p>
      {exposed
        ? "This game has exposed mock data. Real encryption cannot undo prior exposure."
        : "This game has used only real encryption."} Changing to mock makes retained
      history inspectable.
    </p>
    {#if !paused}<p>Pause the campaign before changing encryption.</p>{/if}
    {#if migration}<p role="status" tabindex="-1" bind:this={migrationStatus}>
        Changing encryption: {migration.verified} retained versions verified. The
        existing game remains authoritative until verification finishes.
      </p>{/if}
    <ActionButton
      class="secondary"
      disabled={!paused ||
        target === mode ||
        busy ||
        pending ||
        !!migration ||
        (target === "real" && !realAvailable)}
      onclick={() => {
        requestedMigration = true;
        onmigrate?.(target);
      }}>Change encryption and resume</ActionButton
    >
  {/if}
</details>

<style>
  fieldset {
    border: 1px solid #877553;
    margin-top: 20px;
    padding: 12px;
    display: grid;
    gap: 8px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
  }
  input {
    width: 44px;
    height: 44px;
  }
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
