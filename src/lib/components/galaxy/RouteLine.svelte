<script lang="ts">
  import { T } from "@threlte/core";
  import { BufferGeometry, Vector3 } from "three";
  import type { Star } from "@shared/galaxy";
  let {
    from,
    to,
    draft = false,
  }: {
    from: Pick<Star, "x" | "y" | "z">;
    to: Pick<Star, "x" | "y" | "z">;
    draft?: boolean;
  } = $props();
  const geometry = $derived.by(() => {
    const a = new Vector3(from.x / 10, from.y / 10 + 0.025, from.z / 10),
      b = new Vector3(to.x / 10, to.y / 10 + 0.025, to.z / 10);
    const points = [];
    for (let i = 0; i < (draft ? 24 : 1); i++) {
      points.push(
        a.clone().lerp(b, draft ? i / 24 : 0),
        a.clone().lerp(b, draft ? (i + 0.55) / 24 : 1),
      );
    }
    return new BufferGeometry().setFromPoints(points);
  });
  $effect(() => {
    const owned = geometry;
    return () => owned.dispose();
  });
</script>

<T.LineSegments {geometry}
  ><T.LineBasicMaterial
    color={draft ? "#e7c88a" : "#82e3ef"}
    transparent
    opacity={0.85}
  /></T.LineSegments
>
