<script lang="ts">
  import type { Development } from "@shared/construction";
  let { type }: { type: Development } = $props();
</script>

<svg
  viewBox="0 0 32 32"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  aria-hidden="true"
>
  {#if type === "market"}<ellipse
      cx="16"
      cy="8"
      rx="11"
      ry="4"
      fill="currentColor"
    /><path
      d="M5 8v6c0 5 22 5 22 0V8M5 14v6c0 5 22 5 22 0v-6M5 20v5c0 5 22 5 22 0v-5"
    />{:else if type === "camp"}<path
      d="m5 16 11-10 11 10M5 25l11-10 11 10"
      stroke-width="5"
    />{:else if type === "base"}<path
      d="M4 28h24M7 27V13h6v14M19 27V7h6v20M10 13V5M22 7V2M13 22h6"
      stroke-width="3"
    />{:else}<circle cx="16" cy="16" r="10" /><ellipse
      cx="16"
      cy="16"
      rx="17"
      ry="4"
      transform="rotate(-40 16 16)"
    /><circle cx="26" cy="7" r="2" fill="currentColor" />{/if}
</svg>

<style>
  svg {
    width: 32px;
    height: 32px;
    flex: none;
  }
</style>
