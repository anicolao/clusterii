<script lang="ts">
  import { rules, type FactionId } from "@shared/rules";
  import type { CampaignDirectory } from "@shared/campaign";
  import Icon from "./Icon.svelte";
  import FactionArt from "./FactionArt.svelte";
  let {
    value = $bindable<FactionId>("heliac"),
    game,
    disabled = false,
    group = "faction",
  }: {
    value?: FactionId;
    game: CampaignDirectory;
    disabled?: boolean;
    group?: string;
  } = $props();
  const chosen = $derived(rules.factions.find((f) => f.id === value)!);
</script>

<section class="faction-picker" aria-label="Choose your faction">
  <div class="hero"><FactionArt faction={value} /></div>
  <div class="faction-content">
    <header>
      <p class="overline gold">Four peoples. A shared galaxy.</p>
      <h1>Choose your faction</h1>
    </header>
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
              name={group}
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
      <p class="affinity">
        <Icon kind="star" />
        {chosen.homeClass}-class affinity
      </p>
      <p>
        Lead the {chosen.species} civilization. Your favored stars produce {chosen
          .affinity[chosen.homeClass as keyof typeof chosen.affinity]}×
        resources. Affinity changes production, never combat strength.
      </p>
      <dl aria-label="Production affinity by stellar class">
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
    min-height: 560px;
    height: 100%;
    isolation: isolate;
    overflow: hidden;
    background: #07131c;
  }
  .hero {
    position: absolute;
    inset: 0 0 0 25%;
    z-index: -2;
    pointer-events: none;
  }
  .faction-picker:before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(90deg, #07131cf5 5%, #07131c70 35%, transparent 65%),
      linear-gradient(0deg, #07131c 0%, #07131cc9 25%, transparent 66%);
    pointer-events: none;
  }
  .faction-content {
    display: grid;
    grid-template-columns: minmax(220px, 0.72fr) minmax(280px, 1fr) minmax(
        0,
        0.7fr
      );
    grid-template-rows: auto 1fr;
    gap: 24px 32px;
    padding: 28px 36px;
    min-height: 560px;
    height: 100%;
  }
  header {
    grid-column: 1/-1;
  }
  h1 {
    font:
      500 clamp(32px, 3.6vw, 56px) "Cormorant Garamond",
      serif;
    margin: 8px 0 0;
    letter-spacing: 0.045em;
  }
  h2 {
    font:
      500 36px "Cormorant Garamond",
      serif;
    margin: 0 0 10px;
  }
  fieldset {
    margin: 0;
    min-width: 0;
    align-self: end;
  }
  .faction-options {
    display: grid;
    gap: 12px;
  }
  label {
    position: relative;
    display: flex;
    gap: 14px;
    align-items: center;
    min-height: 76px;
    padding: 6px 12px 6px 6px;
    border: 1px solid #8d806b;
    border-radius: 4px;
    background: #081521df;
    cursor: pointer;
  }
  label.selected {
    border-color: #ffe1a4;
    box-shadow:
      0 0 12px #e6c88d65,
      inset 0 0 12px #e6c88d22;
  }
  label:has(input:focus-visible) {
    outline: 3px solid #ffe1a4;
    outline-offset: 3px;
  }
  label:has(input:disabled) {
    opacity: 0.55;
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
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 3px;
    overflow: hidden;
  }
  small {
    display: block;
    color: var(--muted);
    margin-top: 4px;
    font-size: 13px;
  }
  article {
    align-self: end;
    max-width: 470px;
    padding: 16px 0 8px;
  }
  article p {
    font-size: 17px;
    line-height: 1.45;
    margin: 12px 0;
  }
  .affinity {
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .affinity :global(span) {
    font-size: 30px;
    text-shadow: 0 0 14px #eeb546;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    border-top: 1px solid #b7a27c65;
    padding-top: 14px;
    margin: 18px 0 0;
  }
  dt {
    font-size: 13px;
    color: var(--muted);
  }
  dd {
    margin: 6px 0 0;
    font-size: 19px;
  }
  @media (min-width: 2400px) {
    .faction-picker,
    .faction-content {
      min-height: 1000px;
    }
    .faction-content {
      padding: 64px 96px;
      gap: 64px;
      grid-template-columns: minmax(420px, 0.8fr) minmax(600px, 1fr) 1fr;
    }
    h1 {
      font-size: 88px;
    }
    h2 {
      font-size: 64px;
    }
    header .overline {
      font-size: 22px;
    }
    label {
      min-height: 136px;
      padding: 12px;
      font-size: 28px;
      gap: 24px;
    }
    .thumbnail {
      width: 112px;
      height: 112px;
    }
    small {
      font-size: 22px;
    }
    .faction-options {
      gap: 24px;
    }
    article {
      max-width: 820px;
    }
    article p {
      font-size: 28px;
      line-height: 1.5;
    }
    dl {
      gap: 32px;
      padding-top: 24px;
      margin-top: 28px;
    }
    dt {
      font-size: 24px;
    }
    dd {
      font-size: 32px;
    }
  }
  @media (max-width: 700px) {
    .faction-picker {
      min-height: 580px;
    }
    .hero {
      inset: 48px 0 auto;
      height: 280px;
    }
    .faction-picker:before {
      background:
        linear-gradient(0deg, #07131c 0%, #07131c 46%, transparent 78%),
        linear-gradient(180deg, #07131c 0%, transparent 27%);
    }
    .faction-content {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 16px;
      min-height: 580px;
    }
    header .overline {
      font-size: 10px;
      margin: 0;
    }
    h1 {
      font-size: 28px;
      margin: 6px 0 0;
      letter-spacing: 0.02em;
    }
    fieldset {
      align-self: stretch;
      margin-top: 156px;
    }
    .faction-options {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    label {
      display: block;
      padding: 4px;
      font-size: 11px;
      min-height: 102px;
    }
    .thumbnail {
      display: block;
      width: 100%;
      height: 54px;
      margin-bottom: 6px;
    }
    small {
      font-size: 10px;
      margin-top: 3px;
    }
    article {
      align-self: stretch;
      padding: 18px 2px 2px;
      max-width: none;
    }
    h2 {
      font-size: 28px;
      margin: 0 0 8px;
    }
    article p {
      font-size: 14px;
      line-height: 1.4;
      margin: 8px 0;
    }
    .affinity {
      font-size: 12px;
      gap: 8px;
    }
    .affinity :global(span) {
      font-size: 22px;
    }
    dl {
      gap: 12px;
      padding-top: 10px;
      margin-top: 10px;
    }
    dt {
      font-size: 12px;
    }
    dd {
      font-size: 17px;
      margin-top: 4px;
    }
  }
</style>
