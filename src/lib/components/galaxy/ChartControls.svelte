<script lang="ts">
  import { rules, type StarClass } from "@shared/rules";
  const classId = $props.id();
  import ActionButton from "../ActionButton.svelte";
  let {
    stellarClass = $bindable<StarClass | "all">("all"),
    onmove,
    homeAvailable = false,
  }: {
    stellarClass?: StarClass | "all";
    onmove: (
      action:
        "selected" | "home" | "overview" | "in" | "out" | "left" | "right",
    ) => void;
    homeAvailable?: boolean;
  } = $props();
</script>

<div class="chart-controls" aria-label="Galaxy view controls">
  <div class="class-filter">
    <label for={classId}>Stellar class</label><select
      id={classId}
      bind:value={stellarClass}
      ><option value="all">All classes</option
      >{#each rules.starClasses as value}<option {value}>{value} class</option
        >{/each}</select
    >
  </div>
  <div class="control-row">
    <ActionButton class="secondary" onclick={() => onmove("selected")}
      >Center selected</ActionButton
    ><ActionButton
      class="secondary"
      onclick={() => onmove("home")}
      disabled={!homeAvailable}>Center home</ActionButton
    ><ActionButton class="secondary" onclick={() => onmove("overview")}
      >Overview</ActionButton
    >
  </div>
  <details>
    <summary>Camera controls</summary>
    <div class="control-row">
      <ActionButton class="secondary" onclick={() => onmove("in")}
        >Zoom in</ActionButton
      ><ActionButton class="secondary" onclick={() => onmove("out")}
        >Zoom out</ActionButton
      ><ActionButton class="secondary" onclick={() => onmove("left")}
        >Orbit left</ActionButton
      ><ActionButton class="secondary" onclick={() => onmove("right")}
        >Orbit right</ActionButton
      >
    </div>
  </details>
</div>

<style>
  .chart-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .class-filter {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: var(--muted);
  }
  select {
    min-height: 48px;
    background: #0b1b29;
    color: inherit;
    border: 1px solid #95876e;
    font: inherit;
    padding: 8px 12px;
  }
  .control-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .control-row :global(button) {
    padding: 10px 14px;
    min-height: 48px;
    letter-spacing: normal;
  }
  summary {
    padding: 12px 0;
    min-height: 44px;
    cursor: pointer;
    color: var(--gold);
  }
  summary:focus-visible,
  select:focus-visible {
    outline: 3px solid #ffe1a4;
    outline-offset: 4px;
  }
</style>
