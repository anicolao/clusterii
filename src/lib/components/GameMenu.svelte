<script lang="ts">
  import ActionButton from "./ActionButton.svelte";
  import PresentationSettings from "./PresentationSettings.svelte";
  let dialog: HTMLDialogElement;
  let opener: HTMLElement | null = null;
  function open(event: MouseEvent) {
    opener = event.currentTarget as HTMLElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("h2")?.focus();
  }
  function containFocus(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
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
  onkeydown={containFocus}
>
  <div class="menu-content">
    <p class="overline">Your presentation</p>
    <h2 tabindex="-1">Game menu</h2>
    <PresentationSettings />
  </div>
  <form method="dialog">
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
  form {
    flex: none;
    border-top: 1px solid #46515a;
    padding: 12px 24px max(12px, env(safe-area-inset-bottom));
  }
  form :global(button) {
    width: 100%;
  }
</style>
