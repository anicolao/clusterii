<script lang="ts">
  import { conversationMessages } from "$lib/conversation-history";
  import type { CampaignView } from "@shared/campaign";
  import ActionButton from "./ActionButton.svelte";
  import type { MotionInspection } from "$lib/motion";
  import Feedback from "./Feedback.svelte";
  let {
    records,
    inspect,
    errorId = "history-error",
    loading = false,
    error = "",
    earlier = false,
    newer = false,
    onearlier,
    onlatest,
    onretry,
    onclose,
    onbriefing,
  }: {
    records: CampaignView[];
    inspect?: MotionInspection;
    errorId?: string;
    loading?: boolean;
    error?: string;
    earlier?: boolean;
    newer?: boolean;
    onearlier: () => void;
    onlatest: () => void;
    onretry: () => void;
    onclose: () => void;
    onbriefing?: () => void;
  } = $props();
</script>

<section class="history-instrument" aria-label="Campaign history">
  <header>
    <p class="overline gold">Your campaign record</p>
    <h2>Campaign history</h2>
    {#if onbriefing}<ActionButton class="secondary" onclick={onbriefing}
        >Since your last visit</ActionButton
      >{/if}
    <p>
      Saved knowledge from your time in this campaign. Earlier records keep the
      information you could see then.
    </p>
    {#if newer}<ActionButton
        class="secondary"
        disabled={loading}
        onclick={onlatest}>New records available</ActionButton
      >{/if}
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded history supports keyboard scrolling.) -->
  <div
    class="history-scroll"
    tabindex="0"
    role="region"
    aria-label="Saved campaign records"
  >
    <Feedback
      message={loading ? "Loading campaign records…" : ""}
      {error}
      {errorId}
      {inspect}
    />
    {#if error}<ActionButton
        class="secondary"
        disabled={loading}
        onclick={onretry}>Retry history</ActionButton
      >{/if}
    {#each records as record (record.revision)}
      <details aria-label={`Campaign record ${record.revision}`}>
        <summary
          ><span>Record {record.revision}</span><strong
            >{record.pausedAt != null
              ? "Campaign paused"
              : record.phase === "active"
                ? "Campaign underway"
                : record.phase === "scheduled"
                  ? "Roster complete"
                  : "Assembling empires"}</strong
          ></summary
        >
        <p>
          {record.roster.length} / {record.capacity} empires · {record.name}
        </p>
        <ul>
          {#each record.roster as seat}<li>{seat.alias}</li>{/each}
        </ul>
        {#each record.trades?.ledger ?? [] as offer}<article
            aria-label="Recorded credit exchange"
          >
            <h3>Offer {offer.result} · tick {offer.settledTick}</h3>
            <p>
              {record.roster[offer.issuer]?.alias} offered {offer.giveMilli /
                1000} credits for {offer.requestMilli / 1000} credits from {record
                .roster[offer.counterpart]?.alias}.
            </p>
            <p>
              {offer.result === "settled"
                ? "Both sides transferred once."
                : "Reserved credits returned to their owners."}
            </p>
          </article>{/each}
        {#each record.conversations ?? [] as room}{#each conversationMessages([record], room.id) as message (message.id)}<article
              aria-label="Previously received message"
            >
              <h3>{room.title} · Message {message.sequence}</h3>
              <p>{record.roster[message.author]?.alias}</p>
              <p style="white-space:pre-wrap;overflow-wrap:anywhere">
                {message.body}
              </p>
              <p>
                Received through your access at this record. Current membership
                may differ.
              </p>
            </article>{/each}{/each}
        {#if record.empire}<p>
            Credits: {record.empire.creditsMilli / 1000}
          </p>{/if}
        {#each record.holdings as holding}<dl>
            <dt>
              {record.stars.find((s) => s.id === holding.starId)?.name ??
                holding.starId}
            </dt>
            <dd>Orbit: {holding.orbit} · Surface: {holding.surface}</dd>
            {#if holding.fighters !== undefined}<dd>
                Fighters: {holding.fighters}
              </dd>{/if}
            {#if holding.infantry !== undefined}<dd>
                Infantry: {holding.infantry}
              </dd>{/if}
            {#if holding.markets !== undefined}<dd>
                Markets: {holding.markets} · Bases: {holding.bases}
              </dd>{/if}
            {#if holding.camps !== undefined}<dd>
                Camps: {holding.camps} · Stations: {holding.stations}
              </dd>{/if}
            {#if holding.escrowMilli !== undefined}<dd>
                Held credits: {holding.escrowMilli / 1000}
              </dd>{/if}
          </dl>{/each}
      </details>
    {/each}
    {#if !loading && !error && !earlier}<p class="history-end">
        {records.length
          ? "Beginning of your available history."
          : "No campaign records are available."}
      </p>{/if}
    {#if earlier}<ActionButton
        class="secondary"
        disabled={loading}
        onclick={onearlier}>Earlier records</ActionButton
      >{/if}
  </div>
  <footer>
    <ActionButton class="secondary" disabled={loading} onclick={onlatest}
      >Latest records</ActionButton
    ><ActionButton class="primary" onclick={onclose}
      >Return to galaxy</ActionButton
    >
  </footer>
</section>

<style>
  .history-instrument {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    gap: 12px;
  }
  header {
    flex-shrink: 0;
  }
  h2 {
    font:
      500 34px "Cormorant Garamond",
      serif;
    margin: 4px 0;
  }
  header p {
    line-height: 1.5;
    margin: 4px 0;
    color: var(--muted);
  }
  .history-scroll {
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    flex: 1;
    padding: 2px;
  }
  .history-scroll:focus-visible {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  details {
    border-top: 1px solid #566674;
    padding: 8px 0;
  }
  summary {
    min-height: 56px;
    cursor: pointer;
    padding: 10px;
    line-height: 1.5;
  }
  summary span {
    color: var(--muted);
    margin-right: 12px;
  }
  summary strong {
    font-weight: 400;
    color: #b9ecf4;
  }
  details p,
  details ul,
  dl {
    padding: 0 12px;
  }
  details ul {
    list-style: none;
  }
  dd {
    margin: 6px 0;
    color: var(--muted);
  }
  dt {
    color: #c6b28a;
  }
  footer {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  footer :global(button) {
    flex: 1;
  }
  .history-end {
    color: var(--muted);
    font-size: 14px;
  }
  @media (min-width: 2400px) {
    .history-instrument {
      font-size: 22px;
    }
    h2 {
      font-size: 48px;
    }
    footer :global(button) {
      font-size: 22px;
      min-height: 64px;
    }
  }
  @media (max-width: 700px) {
    h2 {
      font-size: 28px;
    }
    header p {
      font-size: 14px;
    }
    footer {
      gap: 8px;
    }
    footer :global(button) {
      padding: 10px;
      font-size: 14px;
    }
  }
</style>
