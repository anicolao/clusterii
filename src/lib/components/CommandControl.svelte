<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import CommandIcon from "./CommandIcon.svelte";
  let {
    kind,
    label,
    current = false,
    ...attributes
  }: HTMLButtonAttributes & {
    kind:
      | "systems"
      | "economy"
      | "conversations"
      | "history"
      | "arrivals"
      | "contacts";
    label: string;
    current?: boolean;
  } = $props();
</script>

<button
  {...attributes}
  class="command-control"
  class:current
  aria-current={current ? "true" : undefined}
  ><CommandIcon {kind} /><span>{label}</span></button
>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 60px;
    padding: 12px 18px;
    border-radius: 8px;
    border: 1px solid #96a3ad77;
    background: linear-gradient(165deg, #1b2c38ee, #08121dec 72%);
    box-shadow:
      inset 0 1px #eef7ff22,
      0 4px 14px #0009;
    color: #eeece4;
    font:
      500 16px "Atkinson Hyperlegible",
      sans-serif;
    text-align: center;
  }
  button :global(svg) {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 2px 3px #000);
  }
  .current {
    border-color: #84e4f4;
    background:
      radial-gradient(ellipse at 40% 0, #2b759060, transparent 80%),
      linear-gradient(#142c3d, #071822);
  }
  button:hover {
    border-color: #b0e9f2;
    background-color: #244558;
  }
  button:disabled {
    opacity: 0.5;
  }
  @media (min-width: 2500px) {
    button {
      min-height: 88px;
      font-size: 26px;
      gap: 20px;
      padding: 18px 30px;
    }
    button :global(svg) {
      width: 46px;
      height: 46px;
    }
  }
  @media (max-width: 700px) {
    button {
      min-height: 52px;
      padding: 8px;
      gap: 6px;
      font-size: 14px;
    }
    button :global(svg) {
      width: 24px;
      height: 24px;
    }
  }
</style>
