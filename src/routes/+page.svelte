<script lang="ts">
  import { onMount, tick } from "svelte";
  import EntryButton from "$lib/components/EntryButton.svelte";
  import { base } from "$app/paths";
  import {
    portraits,
    reduceProfile,
    type Portrait,
    type Profile,
  } from "@shared/profile";
  import type { Envelope } from "@shared/crypto";
  let scene = $state<"entry" | "learn" | "profile">("entry");
  let chapter = $state(0);
  let account = $state<string | null>(null);
  let alias = $state("");
  let portrait = $state<Portrait>("G1");
  let saved = $state<Profile | null>(null);
  let revision = 0;
  let kek = "";
  let pending = $state<{ id: string; envelope: Envelope } | null>(null);
  let busy = $state(false);
  let ready = $state(false);
  let connected = $state(false);
  let message = $state("");
  let error = $state("");
  let remedy = $state<"none" | "network" | "conflict" | "validation">("none");
  let profileWatch = 0;
  let history: { scene: typeof scene; control: string | null }[] = [];
  let service: typeof import("$lib/session");
  let stopProfile = () => {};
  let stopReceipt = () => {};
  let timeout: ReturnType<typeof setTimeout>;
  let generation = 0;
  let focusTitle = $state<HTMLHeadingElement>();
  const names = [
    "The envoy",
    "The navigator",
    "The tidekeeper",
    "The deepseer",
    "The architect",
    "The scholar",
    "The marshal",
    "The emissary",
  ];
  const chapters = [
    {
      title: "No empire wins alone",
      eyebrow: "01 / The galaxy",
      text: "Cluster is a slow real-time contest of territory, trust, and ambition. Make your moves, leave the galaxy turning, and return to the consequences. The galaxy advances every fifteen minutes.",
      detail:
        "Choose your allies carefully. Victory belongs to an eligible alliance that controls the required share of the galaxy. Different partners create different paths to power.",
    },
    {
      title: "Two fronts. One system.",
      eyebrow: "02 / Conquest",
      text: "Fighters control orbit. Infantry control the surface. A system can belong to two rivals at once—and neither collects its credits until one faction controls both layers.",
      detail:
        "Concentrated fighter strength wins decisively in space. On the ground, defenders strike first. Bring enough infantry to finish what your fleet begins.",
    },
    {
      title: "Build the means to prevail",
      eyebrow: "03 / Your empire",
      text: "Markets produce credits. Training camps produce fighters. Bases produce infantry. Space stations produce science. Your faction’s affinity makes some stars more productive than others.",
      detail:
        "Direct your markets toward the developments you expect other empires to build. Research expands your reach, strengthens your forces, and improves production.",
    },
    {
      title: "Information is influence",
      eyebrow: "04 / Diplomacy",
      text: "Your sensors reveal only part of the galaxy. Reports age. A trusted ally’s intelligence can matter more than another fleet. Negotiate, share observations, and coordinate your next move.",
      detail:
        "An alliance is a commitment between players, not an automatic exchange of every secret. Shared victory rewards cooperation; the next campaign rewards finding new partners.",
    },
  ];
  async function open(next: typeof scene) {
    history.push({
      scene,
      control: document.activeElement?.getAttribute("data-focus") ?? null,
    });
    scene = next;
    await tick();
    focusTitle?.focus();
  }
  async function close() {
    const previous = history.pop();
    scene = previous?.scene ?? "entry";
    await tick();
    const control = previous?.control ?? "play";
    document.querySelector<HTMLElement>(`[data-focus="${control}"]`)?.focus();
  }
  async function recover() {
    if (!account || !service) return;
    const uid = account;
    const session = generation;
    const watch = ++profileWatch;
    stopProfile();
    error = "";
    remedy = "none";
    try {
      const key = kek || (await service.loadKey());
      if (session !== generation || watch !== profileWatch) return;
      kek = key;
      stopProfile = service.observeProfile(
        uid,
        key,
        (profile, version) => {
          if (session !== generation || watch !== profileWatch) return;
          const first = !ready;
          const dirty =
            alias !== (saved?.alias ?? "") ||
            portrait !== (saved?.portrait ?? "G1");
          saved = profile;
          ready = true;
          if (first || (!busy && !pending && !dirty)) {
            revision = version;
            alias = profile?.alias ?? "";
            portrait = profile?.portrait ?? "G1";
          }
        },
        () => {
          if (session !== generation || watch !== profileWatch) return;
          error =
            "Your connection was interrupted. Reconnect to recover updates; your draft is preserved.";
          remedy = "network";
        },
      );
      if (pending) await save();
    } catch {
      if (session !== generation || watch !== profileWatch) return;
      error =
        "Your identity could not be loaded. Check your connection, then reconnect. Your draft is preserved.";
      remedy = "network";
    }
  }
  onMount(() => {
    let disposed = false;
    let stopAuth = () => {};
    void import("$lib/session")
      .then((s) => {
        if (disposed) return;
        service = s;
        stopAuth = s.observeAccount(async (user) => {
          connected = true;
          ++generation;
          ++profileWatch;
          error = "";
          remedy = "none";
          stopProfile();
          stopReceipt();
          clearTimeout(timeout);
          kek = "";
          pending = null;
          saved = null;
          alias = "";
          portrait = "G1";
          ready = false;
          busy = false;
          revision = 0;
          account = user?.uid ?? null;
          if (!user) return;
          await recover();
        });
      })
      .catch(() => {
        error = "The connection could not be opened. Reload to try again.";
      });
    return () => {
      disposed = true;
      generation++;
      stopAuth();
      stopProfile();
      stopReceipt();
      clearTimeout(timeout);
    };
  });
  async function play() {
    if (account) {
      open("profile");
      return;
    }
    if (!service || busy) return;
    busy = true;
    error = "";
    try {
      await service.login();
      open("profile");
    } catch (reason) {
      const code =
        reason && typeof reason === "object" && "code" in reason
          ? reason.code
          : "";
      if (code === "auth/popup-blocked")
        error = "Allow the Google sign-in window, then try again.";
      else if (code === "auth/network-request-failed")
        error =
          "Sign-in could not connect. Check your connection and try again.";
      else if (
        code === "auth/operation-not-allowed" ||
        code === "auth/configuration-not-found" ||
        code === "auth/unauthorized-domain"
      )
        error = "Sign-in is unavailable right now. Please try again later.";
      else error = "Sign-in did not finish. Please try again.";
    } finally {
      busy = false;
    }
  }
  async function save() {
    if (!account || !ready || busy) return;
    if (!pending) {
      try {
        reduceProfile(revision, {
          kind: "profile.set",
          expectedRevision: revision,
          profile: { alias, portrait },
        });
      } catch {
        error = "Choose a name of 2–24 characters and a portrait.";
        remedy = "validation";
        document.getElementById("alias")?.focus();
        return;
      }
    }
    const session = generation;
    busy = true;
    error = "";
    remedy = "none";
    message = "Sending your identity…";
    try {
      pending ??= await service.prepareProfile(
        account,
        kek,
        { alias, portrait },
        revision,
      );
      if (session !== generation) return;
      stopReceipt();
      clearTimeout(timeout);
      stopReceipt = service.submitProfile(
        account,
        pending,
        (receipt) => {
          if (session !== generation) return;
          clearTimeout(timeout);
          busy = false;
          pending = null;
          revision = receipt.revision;
          stopReceipt();
          if (receipt.status === "accepted")
            message =
              "Identity saved. Your next campaign will know you by this name.";
          else {
            message = "";
            remedy = receipt.reason === "conflict" ? "conflict" : "validation";
            error =
              receipt.reason === "conflict"
                ? "Another device changed your identity. Your draft is preserved. Save again to replace that version."
                : "Choose a name of 2–24 characters and a portrait.";
          }
        },
        () => {
          if (session !== generation) return;
          remedy = "network";
          clearTimeout(timeout);
          busy = false;
          message = "";
          error =
            "The connection was interrupted. Retry to check the same order.";
        },
      );
      timeout = setTimeout(() => {
        remedy = "network";
        busy = false;
        message = "";
        error =
          "Still waiting for acknowledgement. Retry to check the same order.";
      }, 20000);
    } catch {
      busy = false;
      message = "";
      error = "Your identity could not be sent. Try again.";
      remedy = "network";
    }
  }
  async function leave() {
    await service.logout();
    history = [];
    scene = "entry";
    await tick();
    document.querySelector<HTMLElement>('[data-focus="play"]')?.focus();
  }
</script>

<svelte:head
  ><title>Cluster — A galaxy won together</title><meta
    name="description"
    content="A slow real-time galaxy of conquest, diplomacy, and shared victory."
  /></svelte:head
>

<main class:instruments={scene !== "entry"}>
  <picture class="vista" aria-hidden="true"
    ><source
      media="(max-width: 700px)"
      srcset={`${base}/art/entry-phone.webp`}
    /><img
      src={`${base}/art/entry-desktop.webp`}
      alt=""
      fetchpriority="high"
    /></picture
  >
  <div class="shade" aria-hidden="true"></div>
  {#if scene === "entry"}
    <section class="entry" aria-label="Welcome to Cluster">
      <div class="brand">
        <p class="overline">A galaxy won together</p>
        <h1 bind:this={focusTitle} tabindex="-1">CLUSTER</h1>
        <div class="rule" aria-hidden="true"><span>✦</span></div>
        <p class="invitation">
          The stars are vast.<br />Your empire cannot stand alone.
        </p>
      </div>
      <div class="entry-actions">
        <EntryButton
          label={busy ? "Opening the gates…" : "Play"}
          illustration="planet"
          focusId="play"
          onclick={play}
          disabled={!connected || busy}
        />
        <EntryButton
          label="Learn the game"
          illustration="observatory"
          focusId="learn"
          onclick={() => open("learn")}
        />
        {#if account}<p class="signed">
            {saved ? `Welcome back, ${saved.alias}` : "Your command awaits"}
          </p>{:else}<p class="signed">
            Conquest · Diplomacy · Shared victory
          </p>{/if}
      </div>
      {#if error}<p class="notice error" role="alert">{error}</p>{/if}
    </section>
    <p class="world-caption" aria-hidden="true">
      Beyond the horizon, an alliance is forming.
    </p>
  {:else if scene === "learn"}
    <section class="instrument learn" aria-label="Learn the game">
      <div class="instrument-top">
        <span class="overline">Field guide</span><button
          class="quiet"
          onclick={close}
          aria-label="Return to entry"
          >Close <span aria-hidden="true">×</span></button
        >
      </div>
      <div class="reading">
        <p class="overline gold">{chapters[chapter].eyebrow}</p>
        <h1 bind:this={focusTitle} tabindex="-1">{chapters[chapter].title}</h1>
        <p class="lead">{chapters[chapter].text}</p>
        <p>{chapters[chapter].detail}</p>
        <div class="chapter-dots" aria-label="Chapters">
          {#each chapters as ch, i}<button
              class:current={i === chapter}
              aria-label={ch.title}
              aria-current={i === chapter ? "step" : undefined}
              onclick={() => {
                chapter = i;
                focusTitle?.focus();
              }}><span></span></button
            >{/each}
        </div>
      </div>
      <div class="instrument-bottom">
        <button
          class="secondary"
          disabled={chapter === 0}
          onclick={() => {
            chapter--;
            focusTitle?.focus();
          }}>Previous</button
        >{#if chapter < 3}<button
            class="primary"
            onclick={() => {
              chapter++;
              focusTitle?.focus();
            }}>Next chapter <span aria-hidden="true">→</span></button
          >{:else}<button
            class="primary"
            data-focus="enter"
            onclick={play}
            disabled={!connected || busy}
            >Enter the galaxy <span aria-hidden="true">↗</span></button
          >{/if}
      </div>
      {#if error}<p role="alert" class="notice error">{error}</p>{/if}
    </section>
  {:else}
    <section class="instrument identity" aria-label="Your identity">
      <div class="instrument-top">
        <span class="overline">Your command</span><button
          class="quiet"
          onclick={close}>Close <span aria-hidden="true">×</span></button
        >
      </div>
      <div class="reading">
        <p class="overline gold">An empire begins with you</p>
        <h1 bind:this={focusTitle} tabindex="-1">Make your name.</h1>
        <p class="identity-intro">
          The face your allies trust. The name your rivals remember.
        </p>
        {#if ready}<form
            id="identity"
            onsubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label for="alias">Commander name</label><input
              id="alias"
              aria-invalid={remedy === "validation"}
              aria-describedby={error ? "identity-error" : undefined}
              bind:value={alias}
              minlength="2"
              maxlength="48"
              required
              autocomplete="nickname"
              disabled={busy || pending !== null}
            />
            <fieldset disabled={busy || pending !== null}>
              <legend>Choose your portrait</legend>
              <div class="portraits">
                {#each portraits as id, i}<label
                    class:selected={portrait === id}
                    title={names[i]}
                    ><input
                      type="radio"
                      name="portrait"
                      value={id}
                      bind:group={portrait}
                    /><span
                      class="portrait-art"
                      style={`--column:${i % 4};--row:${Math.floor(i / 4)}`}
                      aria-hidden="true"
                      ><img src={`${base}/art/portraits.webp`} alt="" /></span
                    ><span class="sr-only">{names[i]}</span><span
                      class="portrait-mark"
                      aria-hidden="true">{portrait === id ? "✓" : ""}</span
                    ></label
                  >{/each}
              </div>
            </fieldset>
          </form>{:else}<p role="status">Retrieving your identity…</p>{/if}
        <p class="notice" role="status">{message}</p>
        {#if error}<p id="identity-error" class="notice error" role="alert">
            {error}
          </p>
          {#if remedy === "network" && !pending}<button
              class="secondary"
              onclick={recover}>Reconnect</button
            >{/if}{/if}
      </div>
      <div class="instrument-bottom">
        <button class="quiet" onclick={leave} disabled={busy}>Sign out</button
        ><button
          class="primary"
          form="identity"
          type="submit"
          disabled={!ready || busy}
          >{busy
            ? "Awaiting acknowledgement…"
            : pending
              ? "Retry save"
              : remedy === "conflict"
                ? "Replace saved identity"
                : "Save identity"}<span aria-hidden="true">→</span></button
        >
      </div>
    </section>
  {/if}
</main>
