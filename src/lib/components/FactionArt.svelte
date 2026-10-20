<script lang="ts">
  import { base } from "$app/paths";
  import { rules, type FactionId } from "@shared/rules";
  let { faction }: { faction: FactionId } = $props();
  const index = $derived(rules.factions.findIndex((f) => f.id === faction));
</script>

<div class="faction-art" aria-hidden="true">
  <div class="tile">
    <img
      src={`${base}/art/faction-envoys.webp`}
      alt=""
      style={`left:${-(index % 2) * 100}%;top:${-Math.floor(index / 2) * 100}%`}
    />
  </div>
</div>

<style>
  .faction-art {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
  .tile {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
  }
  .faction-art img {
    position: absolute;
    width: 200%;
    height: 200%;
    max-width: none;
    object-fit: cover;
  }
</style>
