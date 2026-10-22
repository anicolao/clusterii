<script lang="ts">
  import { researchEstimate } from "@shared/research";
  import { nextResearchEffect } from "$lib/research-effect";
  import type { ResearchDraft } from "$lib/research-draft";
  import { tick } from "svelte";
  import type { ResearchState, Technology } from "@shared/production";
  import { technologies } from "@shared/production";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  import type { MotionInspection } from "$lib/motion";
  import Feedback from "./Feedback.svelte";
  let {
    research,
    scienceMilli = null,
    draft = $bindable<ResearchDraft | undefined>(undefined),
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
    scienceMilli?: number | null;
    draft?: ResearchDraft;
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
  function showChoice(event?: Event) {
    const target = event?.currentTarget;
    if (target instanceof HTMLInputElement)
      target.closest("label")?.scrollIntoView({ block: "nearest" });
    form?.scrollIntoView({ block: "nearest" });
  }
  const errorId = $props.id();
  let choice = $state<Technology | null>(null);
  const selected = $derived(
    draft?.target ??
      choice ??
      research.orders?.at(-1)?.target ??
      research.target,
  );
  const estimate = $derived(
    researchEstimate(
      research,
      selected,
      scienceMilli,
      paused ? "paused" : pending || busy ? "pending" : null,
    ),
  );
  const nextEffect = $derived(
    nextResearchEffect(selected, research.levels[selected], {
      scanning: scanningEnabled,
      travel: travelEnabled,
      construction: constructionEnabled,
    }),
  );
  const amount = (milli: number) =>
    (milli / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const estimateReasons = {
    capped:
      "Maximum level reached. Science on this track is banked; no further level is estimated.",
    paused:
      "Campaign paused. No completion estimate while production is stopped.",
    pending:
      "A research selection is awaiting acknowledgement or application. Recalculate after it applies.",
    "bank-transfer":
      "Switching will transfer the active capped track's banked science. Recalculate after the transfer applies.",
    "unknown-rate":
      "No completed science-production tick is available yet; completion rate is unknown.",
    "zero-rate":
      "The last completed tick produced no science. No completion at that rate.",
  };
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
      <div class="research-tracks">
        {#each technologies as technology}
          <label>
            <input
              type="radio"
              name="research-target"
              value={technology}
              checked={selected === technology}
              onfocus={showChoice}
              onchange={(event) => {
                if (draft) draft.target = technology;
                else choice = technology;
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
    <details
      class="forecast"
      aria-label="Selected research forecast"
      ontoggle={async (event) => {
        const disclosure = event.currentTarget;
        if (disclosure.open) {
          await tick();
          disclosure.scrollIntoView({ block: "start" });
        }
      }}
    >
      <summary
        >{#if estimate.costMilli !== null}Next level {research.levels[
            selected
          ] + 1} · {amount(estimate.costMilli)} science{:else}Maximum research
          level{/if}</summary
      >
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded forecast must support keyboard scrolling.) -->
      <div
        class="forecast-body"
        role="region"
        aria-label="Research forecast details"
        tabindex="0"
      >
        {#if estimate.costMilli !== null}
          <p>
            Level {research.levels[selected] + 1} costs {amount(
              estimate.costMilli,
            )} science.
            {amount(estimate.remainingMilli!)} more science required from this track's
            retained progress.
          </p>
        {/if}
        <p>{nextEffect}</p>
        {#if estimate.reason}
          <p>{estimateReasons[estimate.reason]}</p>
        {:else}
          <p>
            Estimated completion: {estimate.fundedTicks} funded {estimate.fundedTicks ===
            1
              ? "tick"
              : "ticks"} ({rules.tickSeconds / 60} minutes each).
          </p>
          <p>
            Assumes {amount(scienceMilli!)} science per tick, the last completed production
            rate, with unchanged output and all future science allocated to {selected}.
            Excludes time before a switch applies; this is not a promised
            completion time.
          </p>
        {/if}
        <p>
          Active research: {research.target}. A selection changes only at its
          acknowledged application tick.
        </p>
      </div>
    </details>
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
  .forecast {
    border-block: 1px solid #476173;
    padding-block: 4px;
  }
  .forecast-body {
    max-height: min(360px, 30dvh);
    overflow: auto;
    overscroll-behavior: contain;
    padding-inline: 2px;
  }
  .forecast-body:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  .forecast summary {
    min-height: 44px;
    align-content: center;
    cursor: pointer;
    color: #c1e1eb;
  }
  .forecast summary:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: 2px;
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
