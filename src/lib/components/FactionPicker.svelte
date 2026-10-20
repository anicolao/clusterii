<script lang="ts">
  import { rules, type FactionId } from "@shared/rules";
  import type { CampaignDirectory } from "@shared/campaign";
  import FactionArt from "./FactionArt.svelte";
  let {
    value = $bindable<FactionId>("heliac"),
    game,
    disabled = false,
  }: {
    value?: FactionId;
    game: CampaignDirectory;
    disabled?: boolean;
  } = $props();
  const chosen = $derived(rules.factions.find((f) => f.id === value)!);
</script>

<section class="faction-picker" aria-label="Choose your faction">
  <div class="hero"><FactionArt faction={value} /></div>
  <div class="faction-content">
    <p class="overline gold">Four peoples. A shared galaxy.</p>
    <h1>Choose your faction</h1>
    <fieldset {disabled}>
      <legend class="sr-only">Faction</legend>
      <div class="faction-options">
        {#each rules.factions as f}
          {@const remaining =
            game.capacity / 4 -
            game.roster.filter((s) => s.faction === f.id).length}
          <label class:selected={value === f.id}
            ><input
              type="radio"
              name="faction"
              value={f.id}
              bind:group={value}
              disabled={remaining === 0}
            /><span class="thumbnail"
              ><FactionArt faction={f.id as FactionId} /></span
            ><span
              >{f.name}<small
                >{remaining} seat{remaining === 1 ? "" : "s"} open</small
              ></span
            ></label
          >
        {/each}
      </div>
    </fieldset>
    <article>
      <h2>{chosen.name}</h2>
      <p class="affinity">{chosen.homeClass}-class affinity</p>
      <p>
        Lead the {chosen.species} civilization. Your favored stars produce {chosen
          .affinity[chosen.homeClass as keyof typeof chosen.affinity]}×
        resources. Affinity changes production, never combat strength.
      </p>
      <dl>
        {#each rules.starClasses as starClass}<div>
            <dt>{starClass} class</dt>
            <dd>
              {chosen.affinity[starClass as keyof typeof chosen.affinity]}×
            </dd>
          </div>{/each}
      </dl>
    </article>
  </div>
</section>

<style>
  .faction-picker {
    position: relative;
    min-height: 520px;
    isolation: isolate;
    overflow: hidden;
    background: #081521;
  }
  .hero {
    position: absolute;
    inset: 0 0 0 35%;
    max-width: 1000px;
    margin-left: auto;
    z-index: -2;
    opacity: 0.8;
  }
  .faction-picker:before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(90deg, #07131c 20%, #07131ccc 47%, #07131c11),
      linear-gradient(0deg, #07131c 2%, transparent 65%);
  }
  .faction-content {
    padding: 36px;
    max-width: 760px;
  }
  h1 {
    font:
      500 48px "Cormorant Garamond",
      serif;
    margin: 12px 0 24px;
  }
  h2 {
    font:
      500 36px "Cormorant Garamond",
      serif;
    margin: 0 0 8px;
  }
  .faction-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    max-width: 560px;
  }
  label {
    position: relative;
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 78px;
    padding: 7px;
    border: 1px solid #8d806b;
    background: #081521e8;
    cursor: pointer;
  }
  label.selected {
    border-color: #e6c88d;
    box-shadow: 0 0 15px #e6c88d45;
  }
  label:has(input:focus-visible) {
    outline: 3px solid #ffe1a4;
    outline-offset: 4px;
  }
  label:has(input:disabled) {
    opacity: 0.5;
    cursor: default;
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    margin: 0;
    cursor: inherit;
  }
  .thumbnail {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
  }
  small {
    display: block;
    color: var(--muted);
    margin-top: 4px;
    font-size: 14px;
  }
  article {
    max-width: 450px;
    margin-top: 28px;
  }
  article p {
    font-size: 17px;
    line-height: 1.5;
  }
  .affinity {
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  dl {
    display: flex;
    gap: 24px;
  }
  dt {
    font-size: 14px;
    color: var(--muted);
  }
  dd {
    margin: 6px 0 0;
  }
  @media (max-width: 700px) {
    .hero {
      inset: 0 0 auto;
      height: 350px;
      opacity: 1;
    }
    .faction-picker:before {
      background: linear-gradient(0deg, #07131c 55%, transparent 95%);
    }
    .faction-content {
      padding: 270px 20px 24px;
    }
    h1 {
      font-size: 36px;
    }
    .faction-options {
      gap: 8px;
      grid-template-columns: 1fr 1fr;
    }
    label {
      display: block;
      padding: 5px;
      font-size: 14px;
    }
    .thumbnail {
      display: block;
      width: 70px;
      height: 70px;
      margin-bottom: 6px;
    }
    article {
      margin-top: 24px;
    }
    dl {
      gap: 18px;
    }
    .overline {
      font-size: 11px;
    }
  }
</style>
