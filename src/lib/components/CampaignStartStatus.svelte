<script lang="ts">
  import { onMount } from "svelte";
  import type { CampaignDirectory } from "@shared/campaign";
  let { game, inspectTime }: { game: CampaignDirectory; inspectTime?: number } =
    $props();
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<p role="status" aria-label="Campaign start" aria-live="polite">
  {#if game.pausedAt != null}
    Paused for development maintenance. Admissions and scheduled start are
    stopped.
  {:else if game.phase === "scheduled" && game.startAt != null && (inspectTime ?? now) >= game.startAt}
    Awaiting home assignment. Your seat is saved; this view updates
    automatically. Scheduled for <time
      datetime={new Date(game.startAt).toISOString()}
      >{new Date(game.startAt).toLocaleString()}</time
    >.
  {:else if game.startAt}
    {game.phase === "active" ? "Began" : "Starts"}
    <time datetime={new Date(game.startAt).toISOString()}
      >{new Date(game.startAt).toLocaleString()}</time
    >.
    {game.phase === "scheduled"
      ? "The server assigns home systems at the scheduled start."
      : ""}
  {:else}
    Waiting for players. Every faction has {game.capacity / 4} seats; a full roster
    begins at the next quarter-hour.
  {/if}
</p>

<style>
  p {
    line-height: 1.5;
    color: var(--muted);
  }
</style>
