<script lang="ts">
  import { onMount } from "svelte";
  import { motionPreference } from "$lib/motion-preference";
  onMount(() => {
    const disconnect = motionPreference.connect(window);
    const unsubscribe = motionPreference.subscribe((value) => {
      document.documentElement.dataset.reduceMotion = String(value.effective);
    });
    return () => {
      unsubscribe();
      disconnect();
      delete document.documentElement.dataset.reduceMotion;
    };
  });
  import "@fontsource/cormorant-garamond/500.css";
  import "@fontsource/cormorant-garamond/600.css";
  import "@fontsource/atkinson-hyperlegible/400.css";
  import "@fontsource/atkinson-hyperlegible/700.css";
  import "./app.css";
  let { children } = $props();
</script>

{@render children()}
