<script lang="ts">
  import { T } from "@threlte/core";
  import { OrbitControls, interactivity, HTML } from "@threlte/extras";
  import { AdditiveBlending, DataTexture, RGBAFormat, DoubleSide } from "three";
  import { onDestroy } from "svelte";
  import type { Star } from "@shared/galaxy";
  let {
    stars,
    selected,
    onselect,
  }: { stars: Star[]; selected: string; onselect: (id: string) => void } =
    $props();
  interactivity();
  const colors = { M: "#ff8b55", G: "#ffd580", A: "#eef4ff", O: "#79d9ff" };
  const bytes = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const r = Math.hypot(x - 31.5, y - 31.5) / 31.5;
      const i = (y * 64 + x) * 4;
      bytes[i] = bytes[i + 1] = bytes[i + 2] = 255;
      bytes[i + 3] = Math.round(
        255 * Math.max(0, Math.exp(-r * r * 7) - Math.exp(-7)),
      );
    }
  const glow = new DataTexture(bytes, 64, 64, RGBAFormat);
  glow.needsUpdate = true;
  onDestroy(() => glow.dispose());
  const target = $derived(stars.find((s) => s.id === selected));
</script>

<T.PerspectiveCamera makeDefault position={[0, 19, 15]} fov={48}
  ><OrbitControls
    enableDamping={false}
    minDistance={5}
    maxDistance={40}
    maxPolarAngle={Math.PI / 2.1}
  /></T.PerspectiveCamera
>
{#each [3, 6, 9] as radius}<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.15}
    ><T.RingGeometry args={[radius, radius + 0.008, 128]} /><T.MeshBasicMaterial
      color="#d0b580"
      transparent
      opacity={0.12}
      side={DoubleSide}
    /></T.Mesh
  >{/each}
{#each stars as star}
  <T.Group position={[star.x / 10, star.y / 10, star.z / 10]}>
    <T.Sprite
      scale={star.id === selected ? 0.65 : 0.38}
      onclick={(event: { stopPropagation(): void }) => {
        event.stopPropagation();
        onselect(star.id);
      }}
      ><T.SpriteMaterial
        map={glow}
        color={colors[star.class]}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      /></T.Sprite
    >
    <T.Mesh
      onclick={(event: { stopPropagation(): void }) => {
        event.stopPropagation();
        onselect(star.id);
      }}
      ><T.SphereGeometry args={[0.055, 8, 8]} /><T.MeshBasicMaterial
        color={colors[star.class]}
      /></T.Mesh
    >
  </T.Group>
{/each}
{#if target}<T.Group position={[target.x / 10, target.y / 10, target.z / 10]}
    ><T.Mesh rotation.x={-Math.PI / 2}
      ><T.RingGeometry args={[0.28, 0.3, 64]} /><T.MeshBasicMaterial
        color="#7ee7ff"
        side={DoubleSide}
      /></T.Mesh
    ><HTML position={[0, 0.5, 0]} center
      ><span class="star-label">{target.name}</span></HTML
    ></T.Group
  >{/if}

<style>
  .star-label {
    color: #f5e9ce;
    font-size: 18px;
    text-shadow: 0 2px 8px #000;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
