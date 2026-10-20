<script lang="ts">
  import ActionButton from "./ActionButton.svelte";
  let {
    labels,
    selected,
    onselect,
  }: {
    labels: readonly string[];
    selected: number;
    onselect: (index: number) => void;
  } = $props();
</script>

<div class="chapter-dots" aria-label="Chapters">
  {#each labels as label, i}<ActionButton
      class={i === selected ? "current" : ""}
      aria-label={label}
      aria-current={i === selected ? "step" : undefined}
      onclick={() => onselect(i)}><span></span></ActionButton
    >{/each}
</div>
