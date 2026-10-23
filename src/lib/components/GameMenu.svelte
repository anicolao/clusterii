<script lang="ts">
  import { tick } from "svelte";
  import MarketRules from "./MarketRules.svelte";
  import ActionButton from "./ActionButton.svelte";
  import PresentationSettings from "./PresentationSettings.svelte";
  let dialog: HTMLDialogElement;
  let readingRegion: HTMLDivElement;
  let readingRules = $state(false);
  let navigationSerial = 0;
  async function showRules(value: boolean) {
    const serial = ++navigationSerial;
    readingRules = value;
    await tick();
    if (!dialog.open || serial !== navigationSerial) return;
    if (value) dialog.querySelector<HTMLElement>("h2")?.focus();
    else dialog.querySelector<HTMLButtonElement>("[data-rules-entry]")?.focus();
  }
  function cancel(event: Event) {
    if (readingRules) {
      event.preventDefault();
      void showRules(false);
    }
  }
  let opener: HTMLElement | null = null;
  function open(event: MouseEvent) {
    opener = event.currentTarget as HTMLElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("h2")?.focus();
  }
  function containFocus(event: KeyboardEvent) {
    if (
      readingRules &&
      event.target === readingRegion &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.key === "Home" || event.key === "End")
    ) {
      // Native End can scroll the document when this bounded region has no overflow.
      event.preventDefault();
      readingRegion.scrollTop =
        event.key === "Home" ? 0 : readingRegion.scrollHeight;
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]',
      ),
    ).filter((control) => control.checkVisibility());
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialog.querySelector("h2"))
    ) {
      event.preventDefault();
      last.focus();
    }
  }
  function restore() {
    navigationSerial++;
    readingRules = false;
    if (opener?.isConnected) opener.focus();
  }
</script>

<ActionButton class="quiet" onclick={open} aria-haspopup="dialog"
  >Menu</ActionButton
>
<dialog
  bind:this={dialog}
  aria-label="Game menu"
  onclose={restore}
  oncancel={cancel}
  onkeydown={containFocus}
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named bounded reading region needs keyboard scrolling.) -->
  <div
    class="menu-content"
    bind:this={readingRegion}
    role="region"
    tabindex={readingRules ? 0 : undefined}
    aria-label={readingRules ? "Rules reading" : "Presentation reading"}
  >
    <p class="overline">{readingRules ? "Field guide" : "Your presentation"}</p>
    <h2 tabindex="-1">{readingRules ? "Rules" : "Game menu"}</h2>
    {#if readingRules}
      <p class="navigation-note">
        The campaign continues while you read. Back returns to this menu; Return
        to game closes this view. Neither leaves the campaign nor surrenders
        your seat.
      </p>
      <MarketRules />
      <p class="navigation-note">
        This reference covers market focus. Construction and route rules remain
        available in their respective panels.
      </p>
    {:else}
      <PresentationSettings />
    {/if}
  </div>
  <form method="dialog">
    {#if readingRules}
      <ActionButton
        type="button"
        class="secondary"
        onclick={() => showRules(false)}>Back to menu</ActionButton
      >
    {:else}
      <ActionButton
        type="button"
        class="secondary"
        data-rules-entry
        onclick={() => showRules(true)}>Rules</ActionButton
      >
    {/if}
    <ActionButton class="secondary">Return to game</ActionButton>
  </form>
</dialog>

<style>
  dialog {
    color: #f3eee2;
    background: #091a27;
    border: 1px solid var(--gold);
    padding: 0;
    width: min(480px, calc(100vw - 24px));
    max-height: calc(100svh - 24px);
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  dialog::backdrop {
    background: #020913d9;
  }
  .menu-content {
    overflow-y: auto;
    padding: 24px;
    min-height: 0;
  }
  h2 {
    font-family: "Cormorant Garamond", serif;
    font-size: 32px;
    margin: 8px 0 24px;
  }
  .navigation-note {
    line-height: 1.5;
    color: var(--muted);
  }
  .menu-content:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: -3px;
  }
  form {
    display: flex;
    gap: 12px;
    flex: none;
    border-top: 1px solid #46515a;
    padding: 12px 24px max(12px, env(safe-area-inset-bottom));
  }
  form :global(button) {
    flex: 1;
    min-width: 0;
    white-space: normal;
  }
</style>
