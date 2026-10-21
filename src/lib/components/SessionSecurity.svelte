<script lang="ts">
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  let {
    pending = false,
    error = "",
    onconfirm,
  }: { pending?: boolean; error?: string; onconfirm: () => void } = $props();
</script>

<section aria-label="Sign out all devices">
  <h2>End every session</h2>
  <p>
    Confirm your Google identity to sign out here and on your other devices.
    Your saved identity and campaigns remain. Unacknowledged orders may be
    cancelled; unsaved drafts on those devices will be cleared.
  </p>
  <ActionButton class="secondary" disabled={pending} onclick={onconfirm}
    >{pending ? "Ending sessions…" : "Confirm with Google"}</ActionButton
  >
  <Feedback
    {error}
    message={pending ? "Keep this window open while your sessions end." : ""}
    errorId="session-error"
  />
</section>

<style>
  h2 {
    font:
      500 32px "Cormorant Garamond",
      serif;
  }
  p {
    color: var(--muted);
    line-height: 1.6;
    max-width: 48ch;
  }
</style>
