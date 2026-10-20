<script lang="ts">
  import ActionButton from "./ActionButton.svelte";
  import { feedbackMotion, type MotionInspection } from "$lib/motion";
  let {
    message = "",
    error = "",
    reconnect,
    errorId = "identity-error",
    inspect,
  }: {
    message?: string;
    error?: string;
    reconnect?: () => void;
    errorId?: string;
    inspect?: MotionInspection;
  } = $props();
</script>

<div use:feedbackMotion={{ key: message + error, inspect }}>
  <p class="notice" role="status">{message}</p>
  {#if error}<p id={errorId} class="notice error" role="alert">{error}</p>
    {#if reconnect}<ActionButton class="secondary" onclick={reconnect}
        >Reconnect</ActionButton
      >{/if}
  {/if}
</div>
