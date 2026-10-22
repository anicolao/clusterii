<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { OrbitControls, interactivity, HTML } from "@threlte/extras";
  import { AdditiveBlending, DataTexture, RGBAFormat, DoubleSide } from "three";
  import { PerspectiveCamera, Spherical, Vector3 } from "three";
  import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";
  import type { StarClass } from "@shared/rules";
  import { untrack } from "svelte";
  import { onDestroy } from "svelte";
  import { detailPreference } from "$lib/detail-preference";
  import { decorativeTexture } from "$lib/decorative-texture";
  import { base } from "$app/paths";
  import { TextureLoader, SRGBColorSpace, type Texture } from "three";
  let dust = $state<Texture>();
  const decoration = $derived(
    $detailPreference.ready && !$detailPreference.lower,
  );
  $effect(() => {
    dust = undefined;
    if (!decoration) return;
    return decorativeTexture<Texture>(
      (loaded) => {
        new TextureLoader().load(`${base}/art/galaxy-dust.webp`, loaded);
      },
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        dust = texture;
      },
    );
  });
  import { galaxyLabel } from "$lib/galaxy-labels";
  import RouteLine from "./RouteLine.svelte";
  import FleetSymbol from "../FleetSymbol.svelte";
  import type { Star } from "@shared/galaxy";
  let {
    stars,
    paths = [],
    routeFocus = false,
    contacts = [],
    selectedContact = "",
    travelers = [],
    onfleet,
    selected,
    onselect,
    owned = [],
    home = "",
    fleets = {},
    stellarClass,
    cameraRequest,
  }: {
    stars: Star[];
    routeFocus?: boolean;
    contacts?: import("@shared/fleet-contacts").FleetContact[];
    selectedContact?: string;
    paths?: { from: Star; to: Star; draft?: boolean }[];
    travelers?: {
      id: string;
      number: number;
      x: number;
      y: number;
      z: number;
    }[];
    onfleet?: (id: string) => void;
    selected: string;
    onselect?: (id: string) => void;
    owned?: string[];
    home?: string;
    fleets?: Record<string, number>;
    stellarClass: StarClass | "all";
    cameraRequest: { action: string; starId: string; sequence: number };
  } = $props();
  interactivity();
  const { invalidate } = useThrelte();
  let camera = $state<PerspectiveCamera>();
  let controls = $state<OrbitControlsType>();
  $effect(() => {
    const request = cameraRequest;
    const contact = contacts.find((c) => c.id === selectedContact);
    const routePoints = routeFocus ? paths.flatMap((p) => [p.from, p.to]) : [];
    const activeCamera = camera,
      activeControls = controls;
    if (!activeCamera || !activeControls) return;
    untrack(() => {
      const offset = activeCamera.position.clone().sub(activeControls.target);
      if (contact) {
        activeControls.target.set(
          contact.x / 10,
          contact.y / 10,
          contact.z / 10,
        );
        activeCamera.position
          .copy(activeControls.target)
          .add(new Vector3(0, 6, 3));
      } else if (routeFocus) {
        const points = routePoints.length
          ? routePoints
          : stars.filter((s) => s.id === request.starId);
        if (points.length) {
          const low = new Vector3(Infinity, Infinity, Infinity),
            high = new Vector3(-Infinity, -Infinity, -Infinity);
          for (const p of points) {
            const v = new Vector3(p.x / 10, p.y / 10, p.z / 10);
            low.min(v);
            high.max(v);
          }
          activeControls.target.copy(low).add(high).multiplyScalar(0.5);
          const span = high.clone().sub(low);
          const distance = Math.max(
            1.2,
            span.z * 2.5,
            (span.x * 2.5) / activeCamera.aspect,
            span.y * 2.5,
          );
          activeCamera.position
            .copy(activeControls.target)
            .add(new Vector3(0, distance, distance * 0.15));
        }
      } else if (request.action === "overview") {
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
  const routeIds = $derived(
    paths.length
      ? [paths[0].from.id, ...paths.map((p) => p.to.id)]
      : [selected],
  );
  const target = $derived(stars.find((s) => s.id === selected));
</script>

{#each contacts as contact}<T.Group
    position={[contact.x / 10, contact.y / 10, contact.z / 10]}
    ><T.Mesh
      ><T.OctahedronGeometry
        args={[contact.id === selectedContact ? 0.12 : 0.06]}
      /><T.MeshBasicMaterial color="#e0b08c" /></T.Mesh
    >{#if contact.id === selectedContact}<HTML
        position={[0, 0.3, 0]}
        style="pointer-events: none"
        center
        ><span class="contact-label"
          >{contact.owner} · Fleet {contact.number} · observed tick {contact.observedTick}</span
        ></HTML
      >{/if}</T.Group
  >{/each}
{#each paths as path}<RouteLine {...path} />{/each}
{#each travelers as fleet}<T.Group
    position={[fleet.x / 10, fleet.y / 10 + 0.08, fleet.z / 10]}
    ><HTML style={onfleet ? undefined : "pointer-events: none"}
      >{#if onfleet}<button
          class="travel-marker"
          aria-label={`Traveling fleet ${fleet.number}`}
          onclick={() => onfleet?.(fleet.id)}
          ><FleetSymbol /> Fleet {fleet.number} · Traveling</button
        >{:else}<span class="travel-label"
          ><FleetSymbol /> Fleet {fleet.number}</span
        >{/if}</HTML
    ></T.Group
  >{/each}

<T.PerspectiveCamera
  bind:ref={camera}
  makeDefault
  position={[0, 19, 15]}
  fov={48}
  ><OrbitControls
    bind:ref={controls}
    enableDamping={false}
    minDistance={routeFocus ? 0.6 : 5}
    maxDistance={40}
    maxPolarAngle={Math.PI / 2.1}
  /></T.PerspectiveCamera
>
{#if decoration && dust}<T.Mesh rotation.x={-Math.PI / 2} position.y={-0.3}
    ><T.PlaneGeometry args={[28, 28]} /><T.ShaderMaterial
      uniforms={{ map: { value: dust } }}
      vertexShader={"varying vec2 uvPosition; void main(){uvPosition=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"}
      fragmentShader={"uniform sampler2D map; varying vec2 uvPosition; void main(){vec3 c=texture2D(map,uvPosition).rgb;float edge=1.0-smoothstep(0.34,0.5,length(uvPosition-0.5));float light=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,0.75*edge*sqrt(light));}"}
      transparent
      blending={AdditiveBlending}
      depthWrite={false}
    /></T.Mesh
  >{/if}
{#each decoration ? [3, 6, 9] : [] as radius}<T.Mesh
    rotation.x={-Math.PI / 2}
    position.y={-0.15}
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
      scale={routeFocus
        ? routeIds.includes(star.id)
          ? 0.15
          : 0.05
        : star.id === selected
          ? 1.5
          : index % 11 === 0
            ? 0.95
            : star.class === "O"
              ? 0.5
              : 0.3}
      onclick={(event: { stopPropagation(): void }) => {
        event.stopPropagation();
        onselect?.(star.id);
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
        onselect?.(star.id);
      }}
      ><T.SphereGeometry
        args={[
          routeFocus
            ? 0.008
            : star.id === selected
              ? 0.08
              : index % 11 === 0
                ? 0.06
                : 0.025,
          16,
          16,
        ]}
      /><T.MeshBasicMaterial color={colors[star.class]} /></T.Mesh
    >
    {#if !routeFocus && !selectedContact && star.id !== selected && (owned.includes(star.id) || (index % 23 === 0 && Math.hypot(star.x, star.z) > 30 && (!target || Math.hypot(star.x - target.x, star.z - target.z) > 15)))}<HTML
        position={[0, 0.25, 0]}
        style="pointer-events: none"
        center
        ><span
          use:galaxyLabel={{
            id: star.id,
            priority: star.id === home ? 2 : owned.includes(star.id) ? 1 : 0,
          }}
          class="quiet-label"
          >{star.name} · {star.class}{owned.includes(star.id)
            ? " · You"
            : ""}</span
        ></HTML
      >{/if}
    {#if fleets[star.id]}<HTML
        position={[0, -0.5, 0]}
        style="pointer-events: none"
        center
        ><span
          class="fleet-label"
          aria-label={`${fleets[star.id]} of your fleets stationed at ${star.name}`}
          ><FleetSymbol /> {fleets[star.id]}</span
        ></HTML
      >{/if}
    {#if routeFocus && routeIds.includes(star.id)}<HTML
        position={[0, 0.015, 0]}
        style="pointer-events: none"
        center
        ><span class="route-node"
          >{routeIds.indexOf(star.id) === 0
            ? "Origin"
            : routeIds.indexOf(star.id)} · {star.name}</span
        ></HTML
      >{/if}
    {#if !routeFocus && owned.includes(star.id)}<T.Mesh
        rotation.x={-Math.PI / 2}
        ><T.RingGeometry args={[0.2, 0.23, 48]} /><T.MeshBasicMaterial
          color="#7ee7ff"
          side={DoubleSide}
        /></T.Mesh
      >{/if}
  </T.Group>
{/each}
{#if target && !routeFocus}<T.Group
    position={[target.x / 10, target.y / 10, target.z / 10]}
    ><T.Mesh rotation.x={-Math.PI / 2}
      ><T.RingGeometry args={[0.28, 0.3, 64]} /><T.MeshBasicMaterial
        color="#7ee7ff"
        side={DoubleSide}
      /></T.Mesh
    ><HTML position={[0, 0.5, 0]} style="pointer-events: none" center
      ><span use:galaxyLabel={{ id: target.id, priority: 3 }} class="star-label"
        >{target.name}</span
      ></HTML
    ></T.Group
  >{/if}

<style>
  .contact-label {
    display: block;
    width: max-content;
    max-width: 240px;
    color: #ffe1c2;
    background: #20170fde;
    padding: 6px;
    font-size: 14px;
    pointer-events: none;
  }
  .route-node {
    display: block;
    transform: translateY(22px);
    border-left: 2px solid #82e3ef;
    padding: 3px 6px;
    background: #06121be8;
    color: #d9fcff;
    font-size: 13px;
    white-space: nowrap;
    pointer-events: none;
  }
  .fleet-label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #9cebf1;
    font-size: 14px;
    pointer-events: none;
    text-shadow: 0 2px 4px #000;
  }
  .quiet-label {
    display: inline-block;
    font-size: 12px;
    color: #e7dfce;
    text-shadow:
      0 1px 4px #000,
      0 0 4px #000;
    white-space: nowrap;
    pointer-events: none;
  }
  @media (min-width: 2400px) {
    .contact-label {
      font-size: 22px;
      max-width: 360px;
    }
    .route-node,
    .travel-label {
      font-size: 22px;
    }
    .quiet-label {
      font-size: 18px !important;
    }
    .star-label {
      font-size: 26px !important;
    }
  }
  .star-label {
    display: inline-block;
    color: #f5e9ce;
    font-size: 18px;
    text-shadow: 0 2px 8px #000;
    white-space: nowrap;
    pointer-events: none;
  }

  .travel-label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #c6f8ff;
    background: #081e2de6;
    padding: 4px;
    transform: translateY(-24px);
    white-space: nowrap;
    pointer-events: none;
  }
  .travel-marker {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    background: #081e2de6;
    color: #c6f8ff;
    border: 1px solid #7bd3e0;
    padding: 8px;
    white-space: nowrap;
    font: inherit;
  }
</style>
