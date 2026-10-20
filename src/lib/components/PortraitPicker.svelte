<script lang="ts">
  import Icon from "./Icon.svelte";
  import { base } from "$app/paths";
  import { portraits, type Portrait } from "@shared/profile";
  import { portraitNames } from "$lib/presentation";
  let {
    value = $bindable<Portrait>("G1"),
    disabled = false,
    group = "portrait",
  }: { value?: Portrait; disabled?: boolean; group?: string } = $props();
</script>

<fieldset {disabled}>
  <legend>Choose your portrait</legend>
  <div class="portraits">
    {#each portraits as id, i}
      <label class:selected={value === id} title={portraitNames[i]}>
        <input type="radio" name={group} value={id} bind:group={value} />
        <span
          class="portrait-art"
          style={`--column:${i % 4};--row:${Math.floor(i / 4)}`}
          aria-hidden="true"
          ><img src={`${base}/art/portraits.webp`} alt="" /></span
        >
        <span class="sr-only">{portraitNames[i]}</span><span
          class="portrait-mark"
          aria-hidden="true"
          >{#if value === id}<Icon kind="selected" />{/if}</span
        >
      </label>
    {/each}
  </div>
</fieldset>
