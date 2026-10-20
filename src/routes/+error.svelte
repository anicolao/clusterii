<script lang="ts">
  import { base } from "$app/paths";
</script>

<svelte:head><title>Signal lost — Cluster</title></svelte:head>
<main>
  <section class="instrument">
    <div class="reading">
      <p class="overline gold">Signal lost</p>
      <h1>This destination is beyond our charts.</h1>
      <p>Return to the observatory to find your way.</p>
      <a class="primary" href={`${base}/`}>Return to Cluster</a>
    </div>
  </section>
</main>
