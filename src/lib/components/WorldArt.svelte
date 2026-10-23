<script lang="ts">
  import { base } from "$app/paths";
</script>

<figure class="world-art">
  <img src={`${base}/art/system-orbit.webp`} alt="" />
  <figcaption>
    World and orbit illustration · not sensor intelligence
  </figcaption>
</figure>

<style>
  figure {
    position: relative;
    margin: 0;
    width: 100%;
    aspect-ratio: 1.8;
    overflow: hidden;
    border: 1px solid #c0aa7244;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  figcaption {
    position: absolute;
    bottom: 0;
    inset-inline: 0;
    padding: 16px 8px 6px;
    background: linear-gradient(transparent, #030b11e8);
    color: #d3ddd9;
    font-size: 10px;
  }
  @media (min-width: 2500px) {
    figcaption {
      font-size: 16px;
    }
  }
</style>
