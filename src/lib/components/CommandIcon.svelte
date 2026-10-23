<script lang="ts">
  let {
    kind,
  }: {
    kind:
      | "systems"
      | "economy"
      | "conversations"
      | "history"
      | "arrivals"
      | "contacts";
  } = $props();
  const paths = {
    systems: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
    economy: "M4 20h16M6 17V9m6 8V4m6 13v-6M3 6l9-4 9 4",
    conversations: "M3 4h18v12H10l-5 4v-4H3V4Zm4 5h10M7 12h6",
    history: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
    arrivals: "M3 18h18M12 2v12m-5-5 5 5 5-5M5 18v4m14-4v4",
    contacts: "M12 12l7-7M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5",
  };
</script>

<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"
  ><path
    d={paths[kind]}
    fill="none"
    stroke="currentColor"
    stroke-width="1.3"
    stroke-linejoin="round"
    stroke-linecap="round"
  /></svg
>

<style>
  svg {
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
