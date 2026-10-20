<script lang="ts">
  import { base } from "$app/paths";
  import type { StarClass } from "@shared/rules";
  let { stellarClass }: { stellarClass: StarClass } = $props();
  const index = $derived(["M", "G", "A", "O"].indexOf(stellarClass));
</script>

<div
  class="stellar-art"
  role="img"
  aria-label={`${stellarClass}-class stellar illustration`}
>
  <div class="tile">
    <img
      src={`${base}/art/stellar-classes.webp`}
      alt=""
      style={`left:${-(index % 2) * 100}%;top:${-Math.floor(index / 2) * 100}%`}
    />
  </div>
</div>

<style>
  .stellar-art {
    position: relative;
    overflow: hidden;
    height: 160px;
    width: 100%;
    border: 1px solid #6a767d66;
    pointer-events: none;
  }
  .tile {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    aspect-ratio: 1;
  }
  img {
    position: absolute;
    width: 200%;
    height: 200%;
    max-width: none;
  }
  @media (min-width: 2400px) {
    .stellar-art {
      height: 240px;
    }
  }
  @media (max-width: 700px) {
    .stellar-art {
      height: 68px;
    }
  }
</style>
