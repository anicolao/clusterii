<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import type { Layer } from "@shared/construction";
  import ActionButton from "./ActionButton.svelte";
  import DevelopmentIcon from "./DevelopmentIcon.svelte";
  let {
    holding,
    selected = $bindable<Layer | null>(null),
    onbuild,
    pending = false,
  }: {
    holding?: CampaignView["holdings"][number];
    selected?: Layer | null;
    onbuild?: (layer: Layer) => void;
    pending?: boolean;
  } = $props();
  const id = $props.id();
</script>

<section
  class="system-world"
  aria-label="System layers"
  style={`--world: url('${base}/art/system-orbit.webp')`}
>
  {#each ["orbit", "surface"] as area}
    {@const orbital = area === "orbit"}
    <section
      class="layer-instrument"
      class:orbital
      class:surface={!orbital}
      class:chosen={selected === area}
      aria-label={orbital ? "Orbital control" : "Surface control"}
    >
      <div class="layer-scene" aria-hidden="true">
        <img src={`${base}/art/system-orbit.webp`} alt="" />
      </div>
      <ActionButton
        class="layer-selector"
        aria-label={`Inspect ${orbital ? "Orbit" : "Surface"} · owner ${holding?.[area as Layer] ?? "Unknown"}`}
        aria-expanded={selected === area}
        aria-controls={`${id}-${area}`}
        data-focus={`layer-${area}`}
        onclick={() => (selected = selected === area ? null : (area as Layer))}
      >
        <DevelopmentIcon type={orbital ? "station" : "base"} />
        <span
          ><strong>{orbital ? "Orbit" : "Surface"}</strong><small
            >{orbital ? "Orbital control" : "Planetary control"}</small
          ></span
        >
        <span class="owner">{holding?.[area as Layer] ?? "Unknown"}</span><span
          aria-hidden="true">›</span
        >
      </ActionButton>
      {#if selected === area}<div id={`${id}-${area}`} class="layer-facts">
          <dl>
            {#if orbital}
              <div>
                <dt>Fighters</dt>
                <dd>{holding?.fighters ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Training camps</dt>
                <dd>{holding?.camps ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Space stations</dt>
                <dd>{holding?.stations ?? "Unknown"}</dd>
              </div>
            {:else}
              <div>
                <dt>Infantry</dt>
                <dd>{holding?.infantry ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Markets</dt>
                <dd>{holding?.markets ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Bases</dt>
                <dd>{holding?.bases ?? "Unknown"}</dd>
              </div>
            {/if}
          </dl>
          <p>
            {orbital
              ? "Fighters and science go to the orbital owner."
              : "Infantry go to the surface owner. Market credits remain held while control is split."}
          </p>
          {#if holding?.[area as Layer] === "You" && onbuild}<ActionButton
              class="layer-build"
              data-focus="construction"
              disabled={pending}
              onclick={() => onbuild?.(area as Layer)}
              >{orbital ? "Build in orbit" : "Build on surface"}</ActionButton
            >{/if}
        </div>{/if}
    </section>
  {/each}
  <section class="held-credits" aria-label="Held credits">
    <div>
      <h3>Held credits</h3>
      <strong
        >{holding?.escrowMilli === undefined
          ? "Unknown"
          : (holding.escrowMilli / 1000).toLocaleString("en-US")}</strong
      >
    </div>
    <p>Securing both layers releases held credits.</p>
  </section>
  <p class="art-caption">
    World and orbit illustration · not sensor intelligence
  </p>
</section>

<style>
  .system-world {
    min-height: 100%;
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 40%);
    grid-template-rows: 1fr 1fr;
    gap: 24px;
    padding: 28px;
    background: var(--world) center 20% / cover;
  }
  .layer-instrument {
    min-width: 0;
    border: 1px solid #8ed6e4;
    border-radius: 12px;
    background: linear-gradient(110deg, #081a28f5, #0b2430dc);
    box-shadow: 0 12px 32px #0008;
    align-self: start;
    grid-column: 2;
  }
  .orbital {
    grid-row: 1;
  }
  .surface {
    grid-row: 2;
    border-color: #c6a86d;
    background: linear-gradient(110deg, #201c16f5, #101f28e8);
    align-self: end;
  }
  .layer-scene {
    display: none;
  }
  :global(.layer-selector) {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px;
    background: transparent;
    border: 0;
    color: #d4f5fc;
    border-radius: 12px;
    text-align: left;
  }
  :global(.layer-selector) strong {
    font:
      500 28px "Cormorant Garamond",
      serif;
    text-transform: uppercase;
  }
  :global(.layer-selector) small {
    display: block;
    font-size: 12px;
    letter-spacing: 0.08em;
    margin-top: 3px;
  }
  .surface :global(.layer-selector) {
    color: #efd3a0;
  }
  .owner {
    margin-left: auto;
    font-size: 22px;
  }
  .chosen {
    box-shadow:
      0 0 0 1px #c8f6ff,
      0 12px 32px #0008;
  }
  .layer-facts {
    padding: 0 20px 18px;
  }
  dl {
    display: grid;
    gap: 6px;
    margin: 0;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #accad633;
    padding: 4px 0;
  }
  dd {
    margin: 0;
    color: #c6ecf4;
  }
  p {
    font-size: 14px;
    line-height: 1.4;
  }
  :global(.layer-build) {
    width: 100%;
    padding: 12px;
    min-height: 48px;
    background: #18414e;
    color: #e0f8ff;
    border-color: #9ed2dc;
  }
  .held-credits {
    grid-column: 1;
    grid-row: 2;
    align-self: end;
    max-width: 380px;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px;
    border: 1px solid #c4b58b55;
    border-radius: 12px;
    background: #07121be8;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .held-credits strong {
    font:
      500 44px "Cormorant Garamond",
      serif;
  }
  .held-credits p {
    margin: 0;
  }
  .art-caption {
    position: absolute;
    bottom: 0;
    left: 12px;
    margin: 0;
    padding: 4px;
    font-size: 10px;
    color: #d9e3e6;
    background: #03101ab8;
    pointer-events: none;
  }
  @media (min-width: 2500px) {
    .system-world {
      padding: 60px;
      gap: 50px;
    }
    :global(.layer-selector) {
      padding: 30px;
      gap: 28px;
    }
    :global(.layer-selector) strong {
      font-size: 48px;
    }
    :global(.layer-selector) small {
      font-size: 22px;
    }
    .owner {
      font-size: 40px;
    }
    :global(.layer-selector) :global(svg) {
      width: 56px;
      height: 56px;
    }
    .layer-facts {
      font-size: 30px;
      padding: 0 34px 30px;
    }
    .layer-facts p {
      font-size: 24px;
    }
    :global(.layer-build) {
      font-size: 28px;
      min-height: 76px;
    }
    .held-credits {
      max-width: 660px;
      padding: 30px;
      gap: 40px;
    }
    h3 {
      font-size: 24px;
    }
    .held-credits strong {
      font-size: 80px;
    }
    .held-credits p {
      font-size: 28px;
    }
    .art-caption {
      font-size: 16px;
    }
  }
  @media (min-width: 701px) and (max-height: 800px) {
    .system-world {
      padding: 14px;
      gap: 12px;
      grid-template-columns: 1fr minmax(320px, 42%);
    }
    :global(.layer-selector) {
      padding: 10px;
      gap: 10px;
    }
    :global(.layer-selector) strong {
      font-size: 24px;
    }
    .owner {
      font-size: 20px;
    }
    :global(.layer-selector) small {
      font-size: 10px;
    }
    .layer-facts {
      font-size: 13px;
      padding: 0 12px 10px;
    }
    .layer-facts p {
      margin: 6px 0;
      font-size: 12px;
    }
    dl {
      gap: 2px;
    }
    dl > div {
      padding: 2px 0;
    }
    :global(.layer-build) {
      min-height: 44px;
      padding: 8px;
    }
    .held-credits {
      padding: 12px;
    }
  }
  @media (max-width: 700px) {
    .system-world {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: transparent;
      padding: 0 0 24px;
    }
    .layer-instrument {
      width: 100%;
      flex-shrink: 0;
    }
    .layer-scene {
      display: block;
      height: 110px;
      overflow: hidden;
      border-radius: 11px 11px 0 0;
    }
    .layer-scene img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
    }
    .surface .layer-scene img {
      object-position: center 90%;
    }
    :global(.layer-selector) {
      padding: 10px;
      gap: 10px;
      min-height: 60px;
    }
    :global(.layer-selector) strong {
      font-size: 24px;
    }
    :global(.layer-selector) small {
      font-size: 10px;
    }
    .owner {
      font-size: 20px;
    }
    .layer-facts {
      padding: 0 12px 12px;
      font-size: 14px;
    }
    .layer-facts p {
      font-size: 12px;
    }
    .held-credits {
      width: 100%;
      max-width: none;
      padding: 12px;
      gap: 16px;
    }
    .held-credits strong {
      font-size: 36px;
    }
    h3 {
      font-size: 12px;
    }
    .held-credits p {
      font-size: 12px;
    }
  }
</style>
