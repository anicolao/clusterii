<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignDirectory } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import CampaignRoster from "./CampaignRoster.svelte";
  let { game }: { game: CampaignDirectory } = $props();
</script>

<section class="admission-briefing" aria-label="Admission briefing">
  <picture aria-hidden="true"
    ><source
      media="(max-width: 600px)"
      srcset={base + "/art/entry-phone.webp"}
    /><img src={base + "/art/entry-desktop.webp"} alt="" /></picture
  >
  <div class="briefing-manifest">
    <p class="overline gold">Before you claim your seat</p>

    <h2>Campaign briefing</h2>
    <p>
      {game.capacity} empires · {game.capacity / 4} seats per faction · a full roster
      starts at the next quarter-hour. You may leave until the scheduled start.
    </p>
    <p>
      The design objective is shared victory: an eligible alliance holds {rules.victoryStarFraction *
        100}% of stars for {rules.victoryHoldTicks}
      ticks. Victory evaluation is not enabled in this development campaign.
    </p>
    <details>
      <summary>Review this campaign’s rules</summary>
      <p>
        {game.rulesetVersion} · Review status. A tick lasts {rules.tickSeconds /
          60} minutes. Starting holdings: {rules.startingAssets.credits} credits,
        {rules.startingAssets.fighters} fighters, {rules.startingAssets
          .infantry} infantry; {rules.startingAssets.markets} markets, {rules
          .startingAssets.camps} camp, {rules.startingAssets.bases} base and
        {rules.startingAssets.stations} station. Home systems match faction affinity.
        The faction selector shows the applicable production matrix.
      </p>
    </details>
    <CampaignRoster {game} />
  </div>
</section>

<style>
  .admission-briefing {
    position: relative;
    isolation: isolate;
    flex: 1;
    min-height: 100%;
    padding: 32px 5%;
    display: flex;
    justify-content: flex-end;
  }
  picture {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }
  picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0.8;
  }
  .briefing-manifest {
    width: min(100%, 900px);
    align-self: flex-start;
    padding: 32px;
    border: 1px solid #877553;
    background: linear-gradient(130deg, #07131cf5, #07131ce8);
    box-shadow: 0 20px 80px #0008;
  }
  h2 {
    font:
      500 38px "Cormorant Garamond",
      serif;
    margin: 12px 0 20px;
  }
  p {
    line-height: 1.65;
  }
  details {
    margin: 24px 0;
  }
  summary {
    color: #eac980;
    cursor: pointer;
    min-height: 48px;
    display: list-item;
    padding: 12px 4px;
  }
  summary:focus-visible {
    outline: 2px solid #9eeaff;
    outline-offset: 4px;
  }
  .briefing-manifest :global(.campaign-roster ul) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 2400px) {
    .admission-briefing {
      padding: 64px 8%;
    }
    .briefing-manifest {
      width: 1600px;
      padding: 64px;
      font-size: 28px;
    }
    h2 {
      font-size: 64px;
    }
    .overline {
      font-size: 22px;
    }
    summary {
      min-height: 72px;
    }
    .briefing-manifest :global(.campaign-roster h2) {
      font-size: 48px;
    }
    .briefing-manifest :global(.campaign-roster .overline) {
      font-size: 22px;
    }
    .briefing-manifest :global(.campaign-roster strong) {
      font-size: 30px;
    }
    .briefing-manifest :global(.campaign-roster li) {
      padding: 28px;
    }
  }
  @media (max-width: 600px) {
    .admission-briefing {
      padding: 16px 12px 24px;
    }
    .briefing-manifest {
      padding: 20px 16px;
    }
    h2 {
      font-size: 32px;
    }
    .briefing-manifest :global(.campaign-roster ul) {
      grid-template-columns: 1fr;
    }
  }
  @media (min-width: 601px) and (max-height: 800px) {
    .admission-briefing {
      padding: 20px 4%;
    }
    .briefing-manifest {
      padding: 20px 28px;
      width: 760px;
    }
    h2 {
      font-size: 32px;
      margin: 8px 0 12px;
    }
    details {
      margin: 16px 0;
    }
  }
</style>
