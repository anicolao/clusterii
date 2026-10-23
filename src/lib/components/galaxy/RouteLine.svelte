<script lang="ts">
  import { T } from "@threlte/core";
  import { BufferGeometry, Vector3, Quaternion } from "three";
  import type { Star } from "@shared/galaxy";
  let {
    from,
    to,
    draft = false,
    thickness = 0,
  }: {
    from: Pick<Star, "x" | "y" | "z">;
    to: Pick<Star, "x" | "y" | "z">;
    draft?: boolean;
    thickness?: number;
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
  const strokes = $derived.by(() => {
    const a = new Vector3(from.x / 10, from.y / 10 + 0.002, from.z / 10),
      b = new Vector3(to.x / 10, to.y / 10 + 0.002, to.z / 10);
    return Array.from({ length: draft ? 18 : 1 }, (_, i) => {
      const start = a.clone().lerp(b, draft ? i / 18 : 0),
        end = a.clone().lerp(b, draft ? (i + 0.65) / 18 : 1),
        delta = end.clone().sub(start);
      return {
        position: start.add(end).multiplyScalar(0.5),
        length: delta.length(),
        quaternion: new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          delta.normalize(),
        ),
      };
    });
  });
</script>

{#if thickness > 0}{#each strokes as stroke}<T.Mesh
      position={stroke.position.toArray()}
      quaternion={stroke.quaternion.toArray()}
      ><T.CylinderGeometry
        args={[thickness, thickness, stroke.length, 6]}
      /><T.MeshBasicMaterial color={draft ? "#e7c88a" : "#82e3ef"} /></T.Mesh
    >{/each}{:else}<T.LineSegments {geometry}
    ><T.LineBasicMaterial
      color={draft ? "#e7c88a" : "#82e3ef"}
      transparent
      opacity={0.85}
    /></T.LineSegments
  >
{/if}
