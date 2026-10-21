<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import type { BriefingEvent } from "$lib/return-briefing";
  import ActionButton from "./ActionButton.svelte";
  import DevelopmentIcon from "./DevelopmentIcon.svelte";
  import FleetSymbol from "./FleetSymbol.svelte";
  import StellarArt from "./StellarArt.svelte";
  import FactionArt from "./FactionArt.svelte";
  let {
    event,
    snapshot,
    onclick,
  }: { event: BriefingEvent; snapshot: CampaignView; onclick: () => void } =
    $props();
  const star = $derived(
    snapshot.stars.find((star) => star.id === event.starId),
  );
</script>

<article>
  <ActionButton
    class="briefing-report"
    aria-label={`Inspect ${event.title}`}
    {onclick}
  >
    <span class="symbol" aria-hidden="true"
      >{#if event.category === "Arrivals and losses"}<FleetSymbol
        />{:else}<DevelopmentIcon
          type={event.category === "Economy"
            ? "market"
            : event.category === "Control"
              ? "base"
              : "station"}
        />{/if}</span
    >
    <span class="illustration" aria-hidden="true"
      >{#if star}<StellarArt
          stellarClass={star.class}
        />{:else if event.category === "Messages"}<FactionArt
          faction={snapshot.roster[event.authorSeat!].faction}
        />{:else}<img
          src={`${base}/art/${event.category === "Research" ? "construction-station" : "construction-market"}.webp`}
          alt=""
        />{/if}</span
    >
    <span class="copy"
      ><strong>{event.title}</strong><span>{event.detail}</span><small
        >Confirmed tick {event.tick}</small
      ></span
    >
    <span class="chevron" aria-hidden="true">›</span>
  </ActionButton>
</article>

<style>
  article {
    container-type: inline-size;
    margin: 12px 0;
  }
  article :global(.briefing-report) {
    display: grid;
    grid-template-columns: 36px 88px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 16px;
    padding: 16px;
    width: 100%;
    max-width: 100%;
    text-align: left;
    white-space: normal;
    background: #0a202be6;
    border: 1px solid #537781;
    border-radius: 12px;
    color: #f6eedf;
  }
  .symbol {
    color: #8edbe5;
    display: flex;
    justify-content: center;
  }
  .illustration {
    display: block;
    height: 74px;
    overflow: hidden;
    border-radius: 8px;
    pointer-events: none;
  }
  .illustration :global(.stellar-art),
  .illustration :global(.faction-art),
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .copy {
    display: grid;
    gap: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
    line-height: 1.45;
  }
  strong {
    font-size: 20px;
  }
  .copy > span {
    font-weight: 400;
  }
  small {
    color: #d8c598;
    font-weight: 400;
  }
  .chevron {
    font-size: 30px;
    color: #8edbe5;
  }
  @media (min-width: 2400px) {
    article :global(.briefing-report) {
      grid-template-columns: 44px 128px minmax(0, 1fr) 32px;
      gap: 24px;
      padding: 24px;
    }
    .illustration {
      height: 100px;
    }
    strong {
      font-size: 28px;
    }
  }
  @media (max-width: 700px) {
    article :global(.briefing-report) {
      grid-template-columns: 58px minmax(0, 1fr) 16px;
      gap: 12px;
      padding: 12px;
    }
    .symbol {
      display: none;
    }
    .illustration {
      height: 58px;
    }
    strong {
      font-size: 18px;
    }
  }
  @container (max-width: 550px) {
    article :global(.briefing-report) {
      grid-template-columns: 58px minmax(0, 1fr) 16px;
      gap: 12px;
      padding: 12px;
    }
    .symbol {
      display: none;
    }
    .illustration {
      height: 58px;
    }
    strong {
      font-size: 18px;
    }
  }
</style>
