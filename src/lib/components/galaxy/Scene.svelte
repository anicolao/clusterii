<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { OrbitControls, interactivity, HTML } from "@threlte/extras";
  import { AdditiveBlending, DataTexture, RGBAFormat, DoubleSide } from "three";
  import { PerspectiveCamera, Spherical, Vector3 } from "three";
  import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";
  import type { StarClass } from "@shared/rules";
  import { untrack } from "svelte";
  import { onDestroy, onMount } from "svelte";
  import { base } from "$app/paths";
  import { TextureLoader, SRGBColorSpace, type Texture } from "three";
  let dust = $state<Texture>();
  onMount(() => {
    let active = true;
    new TextureLoader().load(`${base}/art/galaxy-dust.webp`, (texture) => {
      if (!active) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      dust = texture;
    });
    return () => {
      active = false;
      dust?.dispose();
    };
  });
  import type { Star } from "@shared/galaxy";
  let {
    stars,
    selected,
    onselect,
    owned = [],
    stellarClass,
    cameraRequest,
  }: {
    stars: Star[];
    selected: string;
    onselect: (id: string) => void;
    owned?: string[];
    stellarClass: StarClass | "all";
    cameraRequest: { action: string; starId: string; sequence: number };
  } = $props();
  interactivity();
  const { invalidate } = useThrelte();
  let camera = $state<PerspectiveCamera>();
  let controls = $state<OrbitControlsType>();
  $effect(() => {
    const request = cameraRequest;
    const activeCamera = camera,
      activeControls = controls;
    if (!activeCamera || !activeControls) return;
    untrack(() => {
      const offset = activeCamera.position.clone().sub(activeControls.target);
      if (request.action === "overview") {
        activeControls.target.set(0, 0, 0);
        activeCamera.position.set(0, 19, 15);
      } else if (request.action === "in" || request.action === "out") {
        offset.setLength(
          Math.max(
            5,
            Math.min(
              40,
              offset.length() * (request.action === "in" ? 0.8 : 1.25),
            ),
          ),
        );
        activeCamera.position.copy(activeControls.target).add(offset);
      } else if (request.action === "left" || request.action === "right") {
        const spherical = new Spherical().setFromVector3(offset);
        spherical.theta += request.action === "left" ? -0.25 : 0.25;
        activeCamera.position
          .copy(activeControls.target)
          .add(new Vector3().setFromSpherical(spherical));
      } else {
        const destination = stars.find((s) => s.id === request.starId);
        if (destination) {
          activeControls.target.set(
            destination.x / 10,
            destination.y / 10,
            destination.z / 10,
          );
          activeCamera.position.copy(activeControls.target).add(offset);
        }
      }
      activeControls.update();
      invalidate();
    });
  });
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

<T.PerspectiveCamera
  bind:ref={camera}
  makeDefault
  position={[0, 19, 15]}
  fov={48}
  ><OrbitControls
    bind:ref={controls}
    enableDamping={false}
    minDistance={5}
    maxDistance={40}
    maxPolarAngle={Math.PI / 2.1}
  /></T.PerspectiveCamera
>
{#if dust}<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.3}
    ><T.PlaneGeometry args={[28, 28]} /><T.ShaderMaterial
      uniforms={{ map: { value: dust } }}
      vertexShader={"varying vec2 uvPosition; void main(){uvPosition=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"}
      fragmentShader={"uniform sampler2D map; varying vec2 uvPosition; void main(){vec3 c=texture2D(map,uvPosition).rgb;float edge=1.0-smoothstep(0.34,0.5,length(uvPosition-0.5));float light=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,0.75*edge*sqrt(light));}"}
      transparent
      blending={AdditiveBlending}
      depthWrite={false}
    /></T.Mesh
  >{/if}
{#each [3, 6, 9] as radius}<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.15}
    ><T.RingGeometry args={[radius, radius + 0.008, 128]} /><T.MeshBasicMaterial
      color="#d0b580"
      transparent
      opacity={0.12}
      side={DoubleSide}
    /></T.Mesh
  >{/each}
{#each stars.filter((s) => stellarClass === "all" || s.class === stellarClass || s.id === selected) as star (star.id)}
  {@const index = stars.indexOf(star)}
  <T.Group position={[star.x / 10, star.y / 10, star.z / 10]}>
    <T.Sprite
      scale={star.id === selected
        ? 1.5
        : index % 11 === 0
          ? 0.95
          : star.class === "O"
            ? 0.5
            : 0.3}
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
      ><T.SphereGeometry
        args={[
          star.id === selected ? 0.08 : index % 11 === 0 ? 0.06 : 0.025,
          16,
          16,
        ]}
      /><T.MeshBasicMaterial color={colors[star.class]} /></T.Mesh
    >
    {#if star.id !== selected && (owned.includes(star.id) || (index % 23 === 0 && Math.hypot(star.x, star.z) > 30 && (!target || Math.hypot(star.x - target.x, star.z - target.z) > 15)))}<HTML
        position={[0, 0.25, 0]}
        center
        ><span class="quiet-label"
          >{star.name} · {star.class}{owned.includes(star.id)
            ? " · You"
            : ""}</span
        ></HTML
      >{/if}
    {#if owned.includes(star.id)}<T.Mesh rotation.x={-Math.PI / 2}
        ><T.RingGeometry args={[0.2, 0.23, 48]} /><T.MeshBasicMaterial
          color="#7ee7ff"
          side={DoubleSide}
        /></T.Mesh
      >{/if}
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
  .quiet-label {
    font-size: 12px;
    color: #e7dfce;
    text-shadow:
      0 1px 4px #000,
      0 0 4px #000;
    white-space: nowrap;
    pointer-events: none;
  }
  @media (min-width: 2400px) {
    .quiet-label {
      font-size: 18px !important;
    }
    .star-label {
      font-size: 26px !important;
    }
  }
  .star-label {
    color: #f5e9ce;
    font-size: 18px;
    text-shadow: 0 2px 8px #000;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
