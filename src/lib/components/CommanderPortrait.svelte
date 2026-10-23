<script lang="ts">
  import { base } from "$app/paths";
  import { portraits, type Portrait } from "@shared/profile";
  let { portrait }: { portrait: Portrait } = $props();
  const index = $derived(portraits.indexOf(portrait));
</script>

<span
  class="commander-portrait"
  aria-hidden="true"
  style={`--portrait-column:${index % 4};--portrait-row:${Math.floor(index / 4)}`}
>
  <img src={`${base}/art/portraits.webp`} alt="" />
</span>

<style>
  span {
    display: block;
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    width: 100%;
  }
  img {
    position: absolute;
    width: 400%;
    max-width: none;
    height: 200%;
    left: calc(var(--portrait-column) * -100%);
    top: calc(var(--portrait-row) * -100%);
  }
</style>
