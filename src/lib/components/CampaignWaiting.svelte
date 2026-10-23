<script lang="ts">
  import { base } from "$app/paths";
  import type { CampaignView } from "@shared/campaign";
  import { rules } from "@shared/rules";
  import ActionButton from "./ActionButton.svelte";
  import CampaignStartStatus from "./CampaignStartStatus.svelte";
  import Feedback from "./Feedback.svelte";
  import GameMenu from "./GameMenu.svelte";
  let {
    view,
    message,
    error,
    busy,
    pending,
    onback,
    onroster,
    onleave,
    onretry,
  }: {
    view: CampaignView;
    message: string;
    error: string;
    busy: boolean;
    pending: boolean;
    onback: () => void;
    onroster: () => void;
    onleave?: () => void;
    onretry?: () => void;
  } = $props();
</script>

<section class="waiting" aria-label="Waiting campaign">
  <picture aria-hidden="true"
    ><source
      media="(max-width: 600px)"
      srcset={`${base}/art/entry-phone.webp`}
    /><img src={`${base}/art/entry-desktop.webp`} alt="" /></picture
  >
  <header><span class="wordmark">CLUSTER</span><GameMenu /></header>
  <div class="manifest">
    <div class="manifest-heading">
      <p class="overline">Development · Rules under review</p>
      <h1 id="galaxy-heading" tabindex="-1">{view.name}</h1>
      <CampaignStartStatus game={view} />
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Bounded manifest supports ordinary keyboard reading.) -->
    <div
      class="reading"
      role="region"
      aria-label="Campaign manifest"
      tabindex="0"
    >
      <h2>{view.roster.length} / {view.capacity} empires assembled</h2>
      <p>
        {view.capacity - view.roster.length} places remain. Your saved seat needs
        no further confirmation. Your home appears here when the server starts the
        campaign.
      </p>
      <ul>
        {#each rules.factions as faction}<li>
            <span class="overline">{faction.name}</span
            >{#each view.roster.filter((seat) => seat.faction === faction.id) as seat}<strong
                >{seat.alias}</strong
              >{/each}<span class="available"
              >{view.capacity / 4 -
                view.roster.filter((seat) => seat.faction === faction.id)
                  .length} seats open</span
            >
          </li>{/each}
      </ul>
      <h2>Campaign objective</h2>
      <p>
        Under the development rules, hold {rules.victoryStarFraction * 100}% of
        systems for {rules.victoryHoldTicks} ticks. Victory and alliance policies
        remain under review.
      </p>
      <h2>Before departure</h2>
      <p>
        The campaign advances every fifteen minutes. Rules are under review;
        read the field guide through Menu. Roster includes development
        maintenance controls.
      </p>
      <p>
        Leave campaign releases your seat before the campaign begins. Campaigns
        returns to selection without leaving. Reconnecting restores this
        membership.
      </p>
    </div>
    <footer>
      <Feedback {message} {error} />
      <div class="actions">
        <ActionButton class="secondary" onclick={onroster} data-focus="roster"
          >Roster</ActionButton
        ><ActionButton class="quiet" onclick={onback}>Campaigns</ActionButton
        >{#if onleave}<ActionButton
            class="quiet"
            disabled={busy || pending || view.pausedAt != null}
            onclick={onleave}>Leave campaign</ActionButton
          >{/if}{#if onretry}<ActionButton disabled={busy} onclick={onretry}
            >{pending ? "Retry order" : "Reconnect"}</ActionButton
          >{/if}
      </div>
    </footer>
  </div>
</section>

<style>
  .waiting {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: 24px clamp(24px, 6vw, 150px);
    background: #040b14;
  }
  picture,
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .waiting::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #04101a22, #04101a99);
    pointer-events: none;
  }
  header,
  .manifest {
    position: relative;
    z-index: 1;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .wordmark {
    font:
      500 26px "Cormorant Garamond",
      serif;
    letter-spacing: 0.22em;
  }
  .manifest {
    display: flex;
    flex-direction: column;
    width: min(760px, 55vw);
    min-height: 0;
    margin: 24px 0 0 auto;
    border-block: 1px solid #a28b56;
    background: #06121ceb;
    box-shadow: 0 20px 70px #0008;
  }
  .manifest-heading,
  footer {
    padding: 20px 28px;
    flex-shrink: 0;
  }
  h1 {
    font:
      500 clamp(30px, 2.8vw, 48px) "Cormorant Garamond",
      serif;
    margin: 8px 0;
    overflow-wrap: anywhere;
  }
  h2 {
    font:
      500 24px "Cormorant Garamond",
      serif;
    margin: 8px 0;
  }
  p {
    line-height: 1.5;
    margin: 8px 0;
  }
  .reading {
    padding: 4px 28px 20px;
    overflow: auto;
    overscroll-behavior: contain;
    min-height: 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 18px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 28px;
  }
  li {
    border-top: 1px solid #65717c77;
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  strong {
    font-weight: 400;
    overflow-wrap: anywhere;
  }
  .available {
    color: var(--muted);
  }
  .overline {
    color: var(--gold);
    font-size: 12px;
  }
  footer {
    border-top: 1px solid #65717c77;
    background: #07131c;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  @media (min-width: 2400px) {
    .manifest {
      width: 1000px;
      margin-right: 8vw;
    }
    .reading {
      font-size: 20px;
    }
  }
  @media (max-width: 700px) {
    .waiting {
      padding: 12px 14px max(12px, env(safe-area-inset-bottom));
    }
    .manifest {
      width: 100%;
      margin-top: 12px;
    }
    .manifest-heading,
    footer {
      padding: 12px 16px;
    }
    .reading {
      padding: 4px 16px 16px;
    }
    h1 {
      font-size: 30px;
    }
    ul {
      gap: 12px;
    }
  }
  @media (max-height: 760px) {
    .manifest {
      margin-top: 8px;
    }
    .manifest-heading {
      padding-block: 8px;
    }
    .manifest-heading :global(p) {
      margin: 4px 0;
    }
    footer {
      padding-block: 8px;
    }
  }
</style>
