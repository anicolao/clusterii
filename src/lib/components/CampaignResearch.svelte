<script lang="ts">
  import { tick } from "svelte";
  import type { ResearchState, Technology } from "@shared/production";
  import { technologies } from "@shared/production";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  import type { MotionInspection } from "$lib/motion";
  import Feedback from "./Feedback.svelte";
  let {
    research,
    scanningEnabled = false,
    travelEnabled = false,
    constructionEnabled = false,
    paused = false,
    busy = false,
    pending = false,
    message = "",
    error = "",
    onselect,
    onretry,
    inspect,
  }: {
    research: ResearchState;
    scanningEnabled?: boolean;
    travelEnabled?: boolean;
    constructionEnabled?: boolean;
    paused?: boolean;
    busy?: boolean;
    pending?: boolean;
    message?: string;
    error?: string;
    onselect: (target: Technology) => void;
    onretry?: () => void;
    inspect?: MotionInspection;
  } = $props();
  let commitment: HTMLDivElement;
  let form: HTMLFormElement;
  async function showChoice(event?: Event) {
    const target = event?.currentTarget;
    // Measure the selected explanation and commitment after the choice renders.
    await tick();
    if (
      !form?.isConnected ||
      (target instanceof HTMLInputElement && !form.contains(target))
    )
      return;
    if (target instanceof HTMLInputElement)
      target.closest("label")?.scrollIntoView({ block: "nearest" });
    form?.scrollIntoView({ block: "nearest" });
  }
  const errorId = $props.id();
  let choice = $state<Technology | null>(null);
  const selected = $derived(
    choice ?? research.orders?.at(-1)?.target ?? research.target,
  );
  let tracks = $state<HTMLDivElement>();
  $effect(() => {
    const target = selected;
    const reader = tracks;
    let active = true;
    // External order/target updates must reveal their selection without moving
    // keyboard focus or scrolling any enclosing document/panel.
    void tick().then(() => {
      if (!active || !reader?.isConnected) return;
      const row = reader
        .querySelector<HTMLInputElement>(`input[value="${target}"]`)
        ?.closest("label");
      if (!row) return;
      const box = row.getBoundingClientRect();
      const clip = reader.getBoundingClientRect();
      const top = clip.top + reader.clientTop;
      const bottom = top + reader.clientHeight;
      if (box.top < top) reader.scrollTop -= Math.ceil(top - box.top);
      else if (box.bottom > bottom)
        reader.scrollTop += Math.ceil(box.bottom - bottom);
    });
    return () => {
      active = false;
    };
  });
  const descriptions: Record<Technology, string> = $derived({
    scanning: scanningEnabled
      ? "Improves the chance of acquiring distant observations. Reports retain their recorded age; research does not reveal every system."
      : "This campaign retains its recorded intelligence rules. Stellar observations are available in new development campaigns.",
    navigation: travelEnabled
      ? `Allows route legs up to ${rules.navigationLyPerLevel} light years per level. Range does not change fleet speed.`
      : "This campaign retains its recorded travel rules. Fleet routes are available in new development campaigns.",
    terraforming: constructionEnabled
      ? "Raises resource extraction and the capacity for each development type at your systems."
      : "Raises resource extraction. This campaign retains its recorded construction rules.",
    investing: "Raises total market income before distribution to systems.",
    formations: travelEnabled
      ? "Improves fighter effectiveness in orbital combat. Arrival reports record your forces and losses."
      : "This campaign retains its recorded travel rules. Orbital combat is available in new development campaigns.",
    melee: travelEnabled
      ? "Improves infantry effectiveness in surface combat. Orbital and surface control remain separate."
      : "This campaign retains its recorded travel rules. Surface combat is available in new development campaigns.",
    recruiting: "Raises infantry production at each controlled surface.",
    innovation:
      "Raises total science output before allocation to the selected track.",
  });
</script>

<section class="research-instrument" aria-label="Research selection">
  <h3>Direct your science</h3>
  <p>
    Orders apply at their scheduled tick. Switching preserves unfinished
    progress; switching from a capped track moves its banked science to the new
    target.
  </p>
  <form
    bind:this={form}
    onsubmit={async (event) => {
      event.preventDefault();
      choice = selected;
      onselect(choice);
      await tick();
      if (document.activeElement === document.body) commitment?.focus();
    }}
  >
    <fieldset disabled={busy || pending || paused}>
      <legend>Research target</legend>
      <div class="research-tracks" bind:this={tracks}>
        {#each technologies as technology}
          <label>
            <input
              type="radio"
              name="research-target"
              value={technology}
              checked={selected === technology}
              onfocus={showChoice}
              onchange={(event) => {
                choice = technology;
                showChoice(event);
              }}
            />
            <span
              ><strong>{technology}</strong><small
                >Level {research.levels[technology]} · {(
                  research.progressMilli[technology] / 1000
                ).toLocaleString()} science{research.levels[technology] ===
                rules.maximumResearchLevel
                  ? " banked"
                  : " retained"}</small
              ></span
            >
          </label>
        {/each}
      </div>
    </fieldset>
    <p class="effect">{descriptions[selected]}</p>
    <div
      class="research-commit"
      bind:this={commitment}
      tabindex="-1"
      role="group"
      aria-label="Research acknowledgement"
    >
      <ActionButton
        class="primary"
        type="submit"
        disabled={busy || pending || paused}
        >{pending
          ? "Awaiting acknowledgement…"
          : `Queue ${selected}`}</ActionButton
      >
    </div>
  </form>
  {#if paused}<p>
      Research orders resume when the campaign resumes. Your selection is
      preserved.
    </p>{/if}
  {#if message || error}<Feedback {message} {error} {inspect} {errorId} />{/if}
  {#if onretry}<ActionButton class="secondary" onclick={onretry}
      >Retry acknowledgement</ActionButton
    >{/if}
  {#if research.orders?.length}<section aria-label="Accepted research orders">
      <h4>Scheduled selections</h4>
      <ol>
        {#each research.orders as order (order.id)}<li>
            Tick {order.effectiveTick} ·
            <span class="track">{order.target}</span>
          </li>{/each}
      </ol>
    </section>{/if}
  {#if research.lastApplied}<p
      role="status"
      aria-label="Applied research order"
    >
      <span class="track">{research.lastApplied.target}</span> applied at tick {research
        .lastApplied.effectiveTick}.
    </p>{/if}
  {#if research.appliedOrders?.length}<details>
      <summary>Last applied selections</summary>
      <ol>
        {#each research.appliedOrders as order (order.id)}<li>
            Tick {order.effectiveTick} ·
            <span class="track">{order.target}</span>
          </li>{/each}
      </ol>
    </details>{/if}
  <p class="review-note">Development research rules remain under review.</p>
</section>

<style>
  summary {
    min-height: 44px;
    padding: 12px 0;
    cursor: pointer;
  }
  summary:focus-visible {
    outline: 2px solid #7ce9fa;
    outline-offset: 3px;
  }
  h3 {
    font:
      500 26px "Cormorant Garamond",
      serif;
  }
  p {
    line-height: 1.5;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 16px 0;
    min-width: 0;
  }
  .research-tracks {
    display: grid;
    gap: 8px;
    max-height: min(320px, 20dvh);
    overflow: auto;
    overscroll-behavior: contain;
  }
  legend {
    padding: 0 0 10px;
    font-weight: 600;
  }
  label {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 62px;
    border: 1px solid #476173;
    padding: 10px;
    border-radius: 6px;
    background: #07131c;
    cursor: pointer;
  }
  label:has(:checked) {
    border-color: #c6b28a;
    background: #1c2428;
  }
  label:has(:focus-visible) {
    outline: 2px solid #9ee9ff;
    outline-offset: 2px;
  }
  input {
    min-width: 44px;
    min-height: 44px;
    appearance: none;
    border: 0;
    background: radial-gradient(
      circle,
      #0c1922 0 9px,
      #9cb3bf 10px 11px,
      transparent 12px
    );
    flex-shrink: 0;
    scroll-margin-block: 8px;
  }
  input:checked {
    background: radial-gradient(
      circle,
      #c6b28a 0 7px,
      #0c1922 8px 9px,
      #c6b28a 10px 11px,
      transparent 12px
    );
  }
  .research-commit:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  .research-commit {
    padding-block: 12px;
    background: #091722;
  }
  strong,
  .track {
    text-transform: capitalize;
  }
  small {
    display: block;
    color: #b4c2cd;
    line-height: 1.5;
    margin-top: 3px;
  }
  form :global(button) {
    width: 100%;
  }
  .effect {
    min-height: 3em;
    color: #c1e1eb;
  }
  .review-note {
    color: #c6b28a;
  }
  ol {
    padding-left: 22px;
    max-height: 160px;
    overflow: auto;
  }
  li {
    padding: 6px 0;
  }
</style>
