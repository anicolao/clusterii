<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  let revision = $state<{
    sourceSha: string;
    buildSourceSha: string;
    workflow: string;
  } | null>(null);
  let error = $state("");
  onMount(() => {
    void fetch(`${base}/revision.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        revision = await response.json();
      })
      .catch(() => {
        error = "Publication metadata is unavailable for this build.";
      });
  });
</script>

<svelte:head><title>Build diagnostics — Cluster</title></svelte:head>
<main>
  <section class="instrument">
    <div class="reading">
      <p class="overline gold">Developer diagnostics</p>
      <h1>Build identity</h1>
      <p>
        Firebase project: clusterii-20261020<br />Region: us-central1<br
        />Account encryption: mock, epoch 1<br />Real provider: unavailable;
        requests fail closed.
      </p>
      {#if revision}<p>Source: <code>{revision.sourceSha}</code></p>
        <p>Built from: <code>{revision.buildSourceSha}</code></p>
        <p>
          <a href={revision.workflow}>Publication workflow</a>
        </p>{/if}{#if error}<p role="status">{error}</p>{/if}<a
        class="primary"
        href={`${base}/`}>Return to Cluster</a
      >
    </div>
  </section>
</main>

<style>
  code {
    overflow-wrap: anywhere;
    font-size: 14px;
  }
  a {
    color: inherit;
  }
</style>
