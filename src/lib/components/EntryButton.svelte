<script lang="ts">
  import Icon from "./Icon.svelte";
  import { base } from "$app/paths";
  let {
    label,
    detail,
    illustration,
    onclick,
    disabled = false,
    focusId,
  }: {
    label: string;
    detail?: string;
    illustration: "planet" | "observatory";
    onclick: () => void;
    disabled?: boolean;
    focusId: string;
  } = $props();
</script>

<button class="entry-button" {onclick} {disabled} data-focus={focusId}>
  <span class="inset" aria-hidden="true"
    ><img
      class:observatory={illustration === "observatory"}
      src={`${base}/art/entry-navigation.webp`}
      alt=""
    /></span
  >
  <span class="label"
    >{label}{#if detail}<small>{detail}</small>{/if}</span
  ><span class="chevron" aria-hidden="true">›</span>
</button>

<style>
  .entry-button {
    display: grid;
    grid-template-columns: 86px 1fr 28px;
    align-items: center;
    gap: 20px;
    min-height: 88px;
    padding: 5px 18px 5px 5px;
    text-align: left;
    background: linear-gradient(115deg, #08141eea, #15232de8);
    border: 1px solid #c5aa7e;
    box-shadow:
      inset 0 0 0 3px #d5ba8420,
      0 6px 22px #0007;
  }
  .entry-button:hover:not(:disabled) {
    background: linear-gradient(115deg, #162a38, #233947);
    border-color: #ffe1a4;
  }
  .inset {
    display: block;
    position: relative;
    width: 86px;
    height: 76px;
    overflow: hidden;
    border: 1px solid #d5ba8440;
    pointer-events: none;
  }
  .inset img {
    position: absolute;
    height: 100%;
    width: 200%;
    object-fit: cover;
    left: 0;
  }
  .inset img.observatory {
    left: -100%;
  }
  .label {
    font-family: "Cormorant Garamond", serif;
    font-size: 32px;
    font-weight: 600;
    line-height: 1.1;
  }
  .label small {
    display: block;
    font:
      16px "Atkinson Hyperlegible",
      sans-serif;
    line-height: 1.2;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }
  .chevron {
    font-size: 32px;
    font-weight: 400;
  }
  @media (max-width: 700px) {
    .entry-button {
      grid-template-columns: 70px 1fr 20px;
      gap: 16px;
      min-height: 82px;
      padding-right: 12px;
    }
    .inset {
      width: 70px;
      height: 70px;
    }
    .label {
      font-size: 28px;
    }
  }
  @media (min-width: 2200px) {
    .entry-button {
      grid-template-columns: 110px 1fr 36px;
      min-height: 110px;
    }
    .inset {
      width: 110px;
      height: 96px;
    }
    .label {
      font-size: 40px;
    }
  }
</style>
