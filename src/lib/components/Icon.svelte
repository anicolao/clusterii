<script lang="ts">
  import { icons } from "$lib/presentation";
  let { kind }: { kind: keyof typeof icons } = $props();
</script>

<span aria-hidden="true">{icons[kind]}</span>
