<script lang="ts">
  import type { CampaignView } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import CommanderPortrait from "./CommanderPortrait.svelte";
  import GameMenu from "./GameMenu.svelte";
  let {
    roster,
    own,
    onroster,
  }: {
    roster: CampaignView["roster"];
    own: CampaignView["own"];
    onroster: () => void;
  } = $props();
  const faction = (id: string) =>
    rules.factions.find((f) => f.id === id)?.name ?? id;
</script>

<nav class="commander-deck" aria-label="Campaign commanders">
  <GameMenu commander={{ ...own.profile, faction: faction(own.faction) }} />
  {#each roster as seat, index}
    {#if index !== own.seat}
      <button
        class="commander-card peer"
        onclick={onroster}
        aria-label={`Inspect roster: ${seat.alias}, ${faction(seat.faction)}`}
        title={`${seat.alias} · ${faction(seat.faction)} · Portrait is cosmetic`}
      >
        <CommanderPortrait portrait={seat.portrait} />
        <strong>{seat.alias}</strong><span>{faction(seat.faction)}</span>
      </button>
    {/if}
  {/each}
</nav>

<style>
  nav {
    display: flex;
    gap: 10px;
    max-width: min(50vw, 600px);
    overflow-x: auto;
    padding: 7px;
    margin: -7px;
    scrollbar-width: thin;
  }
  nav :global(.commander-card) {
    display: flex;
    flex-direction: column;
    flex: 0 0 102px;
    width: 102px;
    padding: 0 0 6px;
    gap: 4px;
    border: 1px solid #8095a077;
    border-radius: 8px;
    background: linear-gradient(#102330, #050e18);
    color: #e8e6db;
    text-align: center;
    box-shadow:
      inset 0 1px #d6e6ed44,
      0 4px 12px #0008;
  }
  nav :global(.commander-card:hover) {
    border-color: #9fe7f1;
  }
  nav :global(.commander-card strong) {
    font-size: 14px;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-inline: 4px;
    font-weight: 400;
  }
  nav :global(.commander-card > span:not(.commander-portrait)) {
    font-size: 14px;
    line-height: 1.15;
    padding-inline: 4px;
  }
  nav :global(.commander-portrait) {
    border-radius: 7px 7px 0 0;
  }
  nav :global(.own-commander) {
    border-color: #9ee7ef;
    box-shadow:
      inset 0 0 12px #65cce326,
      0 0 15px #65cce326;
  }
  @media (min-width: 2500px) {
    nav {
      max-width: 920px;
      gap: 18px;
    }
    nav :global(.commander-card) {
      flex-basis: 172px;
      width: 172px;
      gap: 8px;
    }
    nav :global(.commander-card strong),
    nav :global(.commander-card > span:not(.commander-portrait)) {
      font-size: 22px;
    }
  }
  @media (min-width: 701px) and (max-height: 800px) {
    nav :global(.commander-card) {
      flex-basis: 80px;
      width: 80px;
    }
  }
  @media (max-width: 700px) {
    nav {
      max-width: none;
      overflow: visible;
    }
    .peer {
      display: none;
    }
    nav :global(.own-commander) {
      flex-basis: 48px;
      width: 48px;
      padding: 0;
    }
    nav :global(.own-commander strong),
    nav :global(.own-commander > span:not(.commander-portrait)) {
      display: none;
    }
    nav :global(.commander-portrait) {
      border-radius: 7px;
    }
  }
</style>
