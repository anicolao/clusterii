<script lang="ts">
  import { ReceiptMismatch } from "@shared/command-receipt";
  import { goto } from "$app/navigation";
  import {
    requestedCampaign,
    campaignHref,
    resumableCampaign,
    lastCampaign,
  } from "$lib/campaign-navigation";
  import { onMount, tick } from "svelte";
  import {
    receiptFeedback,
    pendingMessage,
    networkMessage,
  } from "$lib/identity-feedback";
  import ChapterNav from "$lib/components/ChapterNav.svelte";
  import ActionButton from "$lib/components/ActionButton.svelte";
  import PortraitPicker from "$lib/components/PortraitPicker.svelte";
  import NameField from "$lib/components/NameField.svelte";
  import Feedback from "$lib/components/Feedback.svelte";
  import {
    sessionEndedMessage,
    sessionFailedMessage,
  } from "$lib/session-feedback";
  import SessionSecurity from "$lib/components/SessionSecurity.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import EntryButton from "$lib/components/EntryButton.svelte";
  import { base } from "$app/paths";
  import { reduceProfile, type Portrait, type Profile } from "@shared/profile";
  import type { Envelope } from "@shared/crypto";
  let scene = $state<"entry" | "learn" | "profile" | "security">("entry");
  let endingSessions = $state(false);
  let sessionError = $state("");
  let sessionNotice = $state("");
  async function endSessions() {
    endingSessions = true;
    sessionError = "";
    try {
      await service.signOutAllDevices();
    } catch {
      sessionError = sessionFailedMessage;
      await tick();
      document.getElementById("session-error")?.focus();
    } finally {
      endingSessions = false;
    }
  }
  let chapter = $state(0);
  let account = $state<string | null>(null);
  let alias = $state("");
  let portrait = $state<Portrait>("G1");
  let invitedCampaign = $state<string | null>(null);
  let memberships = $state<string[]>([]);
  let campaignError = $state("");
  let stopCampaigns = () => {};
  let campaignMetadata = $state<import("@shared/campaign").CampaignDirectory[]>(
    [],
  );
  let lastSelection = $state<string | null>(null);
  let stopDirectory = () => {};
  const continued = $derived(
    resumableCampaign(campaignMetadata, memberships, lastSelection),
  );
  const activeCount = $derived(
    campaignMetadata.filter(
      (game) => game.phase === "active" && memberships.includes(game.id),
    ).length,
  );
  const destination = $derived(campaignHref(base, invitedCampaign));
  let saved = $state<Profile | null>(null);
  let revision = 0;
  let kek = "";
  let pending = $state<{ id: string; envelope: Envelope } | null>(null);
  let busy = $state(false);
  let ready = $state(false);
  let connected = $state(false);
  let message = $state("");
  let error = $state("");
  let remedy = $state<
    "none" | "network" | "conflict" | "validation" | "receipt" | "session"
  >("none");
  let profileWatch = 0;
  let history: { scene: typeof scene; control: string | null }[] = [];
  let service: typeof import("$lib/session");
  let stopProfile = () => {};
  let stopReceipt = () => {};
  let timeout: ReturnType<typeof setTimeout>;
  let generation = 0;
  let focusTitle = $state<HTMLHeadingElement>();
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
          if (first && profile && invitedCampaign) void goto(destination);
          if (first || (!busy && !pending && !dirty)) {
            revision = version;
            alias = profile?.alias ?? "";
            portrait = profile?.portrait ?? "G1";
          }
        },
        () => {
          if (session !== generation || watch !== profileWatch) return;
          error = networkMessage;
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
  async function recoverCampaigns() {
    if (!account) return;
    const uid = account,
      session = generation;
    stopCampaigns();
    stopDirectory();
    campaignError = "";
    try {
      const campaigns = await import("$lib/campaign-session");
      const allowed = await campaigns.developerAccess();
      if (session !== generation || !allowed) return;
      stopDirectory = campaigns.observeDirectory(
        (games) => {
          if (session === generation) campaignMetadata = games;
        },
        () => {
          if (session === generation)
            campaignError =
              "Your campaigns could not be recovered. Reconnect to try again.";
        },
      );
      stopCampaigns = campaigns.observeMemberships(
        uid,
        (ids) => {
          if (session === generation) memberships = ids;
        },
        () => {
          if (session === generation)
            campaignError =
              "Your campaigns could not be recovered. Reconnect to try again.";
        },
      );
    } catch {
      if (session === generation)
        campaignError =
          "Your campaigns could not be recovered. Reconnect to try again.";
    }
  }
  onMount(() => {
    invitedCampaign = requestedCampaign(location.search);
    let disposed = false;
    let stopAuth = () => {};
    void import("$lib/session")
      .then((s) => {
        if (disposed) return;
        service = s;
        stopAuth = s.observeAccount(
          async (user) => {
            connected = true;
            ++generation;
            ++profileWatch;
            error = "";
            remedy = "none";
            stopProfile();
            stopCampaigns();
            stopDirectory();
            campaignMetadata = [];
            lastSelection = user ? lastCampaign(user.uid) : null;
            memberships = [];
            campaignError = "";
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
            if (!user) {
              if (s.sessionEnded()) {
                scene = "entry";
                history = [];
                sessionNotice = sessionEndedMessage;
                await tick();
                document
                  .querySelector<HTMLElement>('[data-focus="play"]')
                  ?.focus();
              }
              return;
            }
            sessionNotice = "";
            void recoverCampaigns();
            await recover();
          },
          () => {
            if (!endingSessions && scene !== "security") void open("security");
          },
        );
      })
      .catch(() => {
        error = "The connection could not be opened. Reload to try again.";
      });
    return () => {
      disposed = true;
      generation++;
      stopAuth();
      stopCampaigns();
      stopDirectory();
      stopProfile();
      stopReceipt();
      clearTimeout(timeout);
    };
  });
  async function play() {
    if (saved) {
      await goto(destination);
      return;
    }
    if (account) {
      open("profile");
      return;
    }
    if (!service || busy) return;
    busy = true;
    error = "";
    try {
      await service.login();
      if (saved && invitedCampaign) await goto(destination);
      else open("profile");
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
    message = pendingMessage;
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
          const feedback = receiptFeedback(receipt);
          message = feedback.message;
          error = feedback.error;
          remedy = feedback.remedy;
          if (receipt.status === "accepted" && invitedCampaign)
            void goto(destination);
        },
        (failure) => {
          if (session !== generation) return;
          if (failure instanceof ReceiptMismatch) {
            clearTimeout(timeout);
            stopReceipt();
            pending = null;
            busy = false;
            message = "";
            error = failure.message;
            remedy = "receipt";
            void tick().then(() =>
              document.getElementById("identity-error")?.focus(),
            );
            return;
          }
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
    <section
      class="entry"
      class:resuming={!!continued}
      aria-label="Welcome to Cluster"
    >
      <div class="brand">
        <p class="overline">A galaxy won together</p>
        <h1 bind:this={focusTitle} tabindex="-1">CLUSTER</h1>
        <div class="rule" aria-hidden="true"><Icon kind="star" /></div>
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
        {#if continued}<EntryButton
            label="Continue"
            detail={continued.name}
            illustration="planet"
            focusId="continue"
            onclick={() =>
              goto(`${campaignHref(base, continued.id)}&briefing=return`)}
          />{/if}
        <EntryButton
          label="Learn the game"
          illustration="observatory"
          focusId="learn"
          onclick={() => open("learn")}
        />
        {#if account}<div class="entry-secondary">
            {#if saved && !busy && !pending}
              {#if activeCount > 1}<a
                  class="campaign-link"
                  href={campaignHref(base)}>Change campaign</a
                >{:else}<a class="campaign-link" href={destination}
                  >{invitedCampaign
                    ? "Open invited campaign"
                    : "Open campaigns"}</a
                >{/if}<ActionButton
                class="quiet"
                data-focus="identity"
                onclick={() => open("profile")}>Your identity</ActionButton
              >{/if}<ActionButton
              class="quiet"
              data-focus="sessions"
              onclick={() => open("security")}>Your devices</ActionButton
            >
          </div>{/if}
        {#if account}<p class="signed">
            {saved ? `Welcome back, ${saved.alias}` : "Your command awaits"}
          </p>{:else}<p class="signed">
            Conquest · Diplomacy · Shared victory
          </p>{/if}
      </div>
      {#if sessionNotice}<p class="notice" role="status">
          {sessionNotice}
        </p>{/if}
      {#if campaignError}<Feedback
          error={campaignError}
          reconnect={recoverCampaigns}
        />{/if}
      {#if error}<p class="notice error" role="alert">{error}</p>{/if}
    </section>
    <p class="world-caption" aria-hidden="true">
      Beyond the horizon, an alliance is forming.
    </p>
  {:else if scene === "learn"}
    <section class="instrument learn" aria-label="Learn the game">
      <div class="instrument-top">
        <span class="overline">Field guide</span><ActionButton
          class="quiet"
          onclick={close}
          aria-label="Return to entry">Close <Icon kind="close" /></ActionButton
        >
      </div>
      <div class="reading">
        <p class="overline gold">{chapters[chapter].eyebrow}</p>
        <h1 bind:this={focusTitle} tabindex="-1">{chapters[chapter].title}</h1>
        <p class="lead">{chapters[chapter].text}</p>
        <p>{chapters[chapter].detail}</p>
        <ChapterNav
          labels={chapters.map((ch) => ch.title)}
          selected={chapter}
          onselect={(i) => {
            chapter = i;
            focusTitle?.focus();
          }}
        />
      </div>
      <div class="instrument-bottom">
        <ActionButton
          class="secondary"
          disabled={chapter === 0}
          onclick={() => {
            chapter--;
            focusTitle?.focus();
          }}>Previous</ActionButton
        >{#if chapter < 3}<ActionButton
            class="primary"
            onclick={() => {
              chapter++;
              focusTitle?.focus();
            }}>Next chapter <Icon kind="arrow" /></ActionButton
          >{:else}<ActionButton
            class="primary"
            data-focus="enter"
            onclick={play}
            disabled={!connected || busy}
            >Enter the galaxy <Icon kind="launch" /></ActionButton
          >{/if}
      </div>
      {#if error}<p role="alert" class="notice error">{error}</p>{/if}
    </section>
  {:else if scene === "security"}
    <section class="instrument identity" aria-label="Account sessions">
      <div class="instrument-top">
        <span class="overline">Your account</span><ActionButton
          class="quiet"
          disabled={endingSessions}
          onclick={close}>Close <Icon kind="close" /></ActionButton
        >
      </div>
      <div class="reading">
        <h1 bind:this={focusTitle} tabindex="-1">Your devices.</h1>
        <SessionSecurity
          pending={endingSessions}
          error={sessionError}
          onconfirm={endSessions}
        />
      </div>
    </section>
  {:else}
    <section class="instrument identity" aria-label="Your identity">
      <div class="instrument-top">
        <span class="overline">Your command</span><ActionButton
          class="quiet"
          onclick={close}>Close <Icon kind="close" /></ActionButton
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
            <NameField
              bind:value={alias}
              disabled={busy || pending !== null}
              invalid={remedy === "validation"}
              errorId={error ? "identity-error" : undefined}
            />
            <PortraitPicker
              bind:value={portrait}
              disabled={busy || pending !== null}
            />
          </form>{:else}<p role="status">Retrieving your identity…</p>{/if}
        <Feedback
          {message}
          {error}
          reconnect={remedy === "network" && !pending ? recover : undefined}
        />
      </div>
      <div class="instrument-bottom">
        <ActionButton class="quiet" onclick={leave} disabled={busy}
          >Sign out</ActionButton
        ><ActionButton
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
                : "Save identity"}<Icon kind="arrow" /></ActionButton
        >
      </div>
    </section>
  {/if}
</main>

<style>
  .entry-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .entry-secondary .campaign-link {
    margin: 0;
    padding: 0 8px;
    font-size: 14px;
  }
  .entry-secondary :global(button) {
    font-size: 14px;
    padding: 8px;
  }
  @media (max-width: 700px) {
    .resuming :global(.entry-actions) {
      margin-top: 20px;
    }
    .resuming .brand h1 {
      font-size: 48px;
      margin: 10px 0;
    }
    .resuming .invitation {
      font-size: 20px;
      line-height: 1.2;
    }
    .resuming .rule {
      margin: 12px auto;
    }
  }
  @media (min-width: 701px) and (max-height: 780px) {
    .resuming .brand h1 {
      font-size: 68px;
      margin: 8px 0;
    }
    .resuming .invitation {
      font-size: 22px;
      line-height: 1.2;
    }
    .resuming .rule {
      margin: 8px auto;
    }
    .resuming :global(.entry-actions) {
      margin-top: 20px;
    }
  }

  .campaign-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 48px;
    color: var(--gold);
    margin: 0 28px 12px;
  }
</style>
