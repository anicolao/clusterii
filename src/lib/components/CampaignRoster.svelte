<script lang="ts">
  import type { CampaignDirectory } from "@shared/campaign";
  import CampaignStartStatus from "./CampaignStartStatus.svelte";
  import { rules } from "@shared/rules";
  let { game }: { game: CampaignDirectory } = $props();
</script>

<section class="campaign-roster" aria-label="Campaign roster">
  <h2>{game.roster.length} / {game.capacity} empires assembled</h2>
  <CampaignStartStatus {game} />
  <ul>
    {#each rules.factions as faction}<li>
        <span class="overline gold">{faction.name}</span
        >{#each game.roster.filter((seat) => seat.faction === faction.id) as seat}<strong
            >{seat.alias}</strong
          >{/each}<span
          >{game.capacity / 4 -
            game.roster.filter((seat) => seat.faction === faction.id).length} seats
          open</span
        >
      </li>{/each}
  </ul>
</section>

<style>
  h2 {
    font:
      500 30px "Cormorant Garamond",
      serif;
    margin: 12px 0;
  }
  ul {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border: 1px solid #877553;
    background: #091725;
  }
  .overline {
    font-size: 12px;
  }
  strong {
    font-weight: 400;
    font-size: 20px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 900px) {
    ul {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 500px) {
    ul {
      grid-template-columns: 1fr;
    }
  }
</style>
