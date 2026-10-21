<script lang="ts">
  import { tick } from "svelte";
  import type { CampaignView } from "@shared/campaign";
  import type { ConversationAction } from "@shared/conversations";
  import type { MessageView } from "$lib/conversation-history";
  import type { MotionInspection } from "$lib/motion";
  import ActionButton from "./ActionButton.svelte";
  import Feedback from "./Feedback.svelte";
  import FactionArt from "./FactionArt.svelte";
  let {
    view,
    messages,
    selected = $bindable(""),
    drafts = $bindable<Record<string, string>>({}),
    title = $bindable(""),
    pending = false,
    busy = false,
    message = "",
    error = "",
    loading = false,
    historyError = "",
    earlier = false,
    newer = false,
    inspect,
    oncommand,
    onearlier,
    onlatest,
    onretryHistory,
    onretry,
    onclose,
  }: {
    view: CampaignView;
    messages: MessageView[];
    selected?: string;
    drafts?: Record<string, string>;
    title?: string;
    pending?: boolean;
    busy?: boolean;
    message?: string;
    error?: string;
    loading?: boolean;
    historyError?: string;
    earlier?: boolean;
    newer?: boolean;
    inspect?: MotionInspection;
    oncommand: (action: ConversationAction) => void;
    onearlier: () => Promise<void> | void;
    onlatest: () => Promise<void> | void;
    onretryHistory: () => void;
    onretry?: () => void;
    onclose: () => void;
  } = $props();
  const rooms = $derived(view.conversations ?? []),
    room = $derived(rooms.find((r) => r.id === selected));
  const own = $derived(
    view.roster.findIndex((s) => s.faction === view.own.faction),
  );
  const other = $derived(room?.members.find((s) => s !== own) ?? own);
  const disabled = $derived(
    busy || pending || view.pausedAt != null || view.phase !== "active",
  );
  let listing = $state(false),
    participants = $state(false),
    invitee = $state<number | undefined>(),
    confirmation = $state<"remove" | "leave" | "close" | null>(null),
    removal = $state<number | undefined>();
  let reading = $state<HTMLDivElement>(),
    following = $state(true),
    newMessage = $state(false);
  let lastMessageId = "";
  $effect(() => {
    const id = messages.at(-1)?.id;
    if (id !== lastMessageId) {
      lastMessageId = id ?? "";
      if (following)
        void tick().then(() => reading?.scrollTo(0, reading.scrollHeight));
      else newMessage = true;
    }
  });
  async function choose(id: string) {
    selected = id;
    listing = false;
    participants = false;
    confirmation = null;
    invitee = undefined;
    following = true;
    await tick();
    document.querySelector<HTMLElement>(".conversation-reading")?.focus();
  }
  function action(
    kind:
      | "conversation.accept"
      | "conversation.decline"
      | "conversation.leave"
      | "conversation.close",
  ) {
    if (room)
      oncommand({
        kind,
        expectedRevision: view.revision,
        roomId: room.id,
        roomRevision: room.revision,
      });
    confirmation = null;
  }
  async function older() {
    following = false;
    const height = reading?.scrollHeight ?? 0,
      top = reading?.scrollTop ?? 0;
    await onearlier();
    await tick();
    if (reading) reading.scrollTop = top + reading.scrollHeight - height;
  }
  async function latest() {
    await onlatest();
    newMessage = false;
    following = true;
    await tick();
    reading?.scrollTo(0, reading.scrollHeight);
  }
  const body = $derived(drafts[selected] ?? "");
  const validBody = $derived(!!body.trim() && [...body.trim()].length <= 2000);
</script>

<section class="diplomacy" aria-label="Private conversations">
  <aside
    class:show={listing}
    class="conversation-list"
    aria-label="Conversations list"
  >
    <h2>Conversations</h2>
    <p>Private talks. Agreements do not move forces or resources.</p>
    {#each rooms as entry}<ActionButton
        class="secondary"
        aria-pressed={selected === entry.id}
        onclick={() => choose(entry.id)}
        >{entry.title}<span
          >{entry.invited
            ? "Invitation"
            : entry.closed
              ? "Closed"
              : entry.unread
                ? "Unread messages"
                : `${entry.members.length} participants`}</span
        ></ActionButton
      >{/each}
    {#if view.conversationsEnabled}<ActionButton
        class="secondary"
        onclick={() => choose("")}>New conversation</ActionButton
      >{:else}<p>
        This older campaign has no conversations. Create a new development
        campaign; existing history remains available.
      </p>{/if}
    <ActionButton class="secondary list-back" onclick={onclose}
      >Back to galaxy</ActionButton
    >
  </aside>
  <div class="conversation-main" class:hide={listing}>
    <header>
      <div class="envoy">
        <FactionArt faction={view.roster[other]?.faction ?? view.own.faction} />
      </div>
      <div class="heading">
        <p class="overline">Diplomatic channel</p>
        <h2>
          {room?.title ?? (selected ? "Access ended" : "Begin a conversation")}
        </h2>
        {#if room}<p>
            {room.closed
              ? "Closed · authorized history retained"
              : room.invited
                ? "Invitation · review before accepting"
                : `${room.members.length} participants · private membership`}
          </p>{/if}
        <div class="header-actions">
          <ActionButton
            class="secondary list-toggle"
            onclick={() => (listing = !listing)}>Conversations</ActionButton
          >{#if room}<ActionButton
              class="secondary"
              aria-expanded={participants}
              onclick={() => (participants = !participants)}
              >Participants</ActionButton
            >{/if}
        </div>
      </div>
    </header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (The bounded conversation supports keyboard reading.) -->
    <div
      class="conversation-reading history-scroll"
      bind:this={reading}
      tabindex="0"
      role="region"
      aria-label="Conversation details"
      onscroll={() => {
        if (reading)
          following =
            reading.scrollHeight - reading.scrollTop - reading.clientHeight <
            32;
      }}
    >
      {#if !selected}
        <h3>A named place to negotiate</h3>
        <p>
          Create a room, then invite the commanders who may receive future
          messages. Conversation membership is separate from alliances.
        </p>
        <label
          >Conversation title<input
            maxlength="120"
            bind:value={title}
            disabled={disabled || !view.conversationsEnabled}
          /></label
        >
        <p>
          Up to 60 characters. Four conversations per commander in this
          development campaign.
        </p>
      {:else if !room}<p>
          Your current access to this conversation has ended. Future messages
          are unavailable. Previously received records remain in your campaign
          history; leaving cannot erase what participants already learned.
        </p>
      {:else if room.invited}
        <h3>{view.roster[room.creator]?.alias} invites you</h3>
        <p>
          You will receive messages sent after you accept. Earlier messages are
          not shared. Accepting does not form an alliance or grant military
          access.
        </p>
        <h3>Participants</h3>
        <ul>
          {#each room.members as seat}<li>{view.roster[seat]?.alias}</li>{/each}
        </ul>
      {:else if participants}
        <h3>Who can read future messages</h3>
        <p>
          Removing a participant ends future access. It cannot erase messages
          already received.
        </p>
        <ul class="participants">
          {#each room.members as seat}<li>
              <div class="avatar">
                <FactionArt faction={view.roster[seat].faction} />
              </div>
              <span
                >{seat === own ? "You" : view.roster[seat].alias}{seat ===
                room.creator
                  ? " · Creator"
                  : ""}</span
              >{#if room.creator === own && seat !== own && !room.closed}<ActionButton
                  class="secondary"
                  {disabled}
                  onclick={() => {
                    removal = seat;
                    confirmation = "remove";
                  }}>Remove {view.roster[seat].alias}</ActionButton
                >{/if}
            </li>{/each}
        </ul>
        {#if room.creator === own && !room.closed}<h3>Invite a commander</h3>
          <label
            >Commander<select bind:value={invitee} {disabled}
              ><option value={undefined}>Choose a commander</option
              >{#each view.roster as seat, index}{#if !room.members.includes(index) && !room.invitations.includes(index)}<option
                    value={index}>{seat.alias}</option
                  >{/if}{/each}</select
            ></label
          >
          <fieldset>
            <legend>History scope</legend><label class="scope"
              ><input
                type="radio"
                checked
                name={`history-scope-${room.id}`}
                value="future"
              />Future messages only — sent after acceptance</label
            >
          </fieldset>
          <p>Sharing earlier messages is not available.</p>
          <ActionButton
            class="primary"
            disabled={disabled || invitee === undefined}
            onclick={() => {
              if (room && invitee !== undefined)
                oncommand({
                  kind: "conversation.invite",
                  expectedRevision: view.revision,
                  roomId: room.id,
                  roomRevision: room.revision,
                  seat: invitee,
                  scope: "future",
                });
            }}
            >Invite {invitee === undefined
              ? "commander"
              : view.roster[invitee]?.alias}</ActionButton
          >
          {#if room.invitations.length}<h3>Invitations awaiting a reply</h3>
            <ul>
              {#each room.invitations as seat}<li>
                  {view.roster[seat].alias} · future messages only
                </li>{/each}
            </ul>{/if}
        {/if}
        {#if !room.closed}<ActionButton
            class="secondary"
            {disabled}
            onclick={() =>
              (confirmation = room.creator === own ? "close" : "leave")}
            >{room.creator === own
              ? "Close conversation"
              : "Leave conversation"}</ActionButton
          >{/if}
        {#if confirmation}<section
            class="confirmation"
            aria-label="Review conversation access"
          >
            <h3>
              {confirmation === "remove"
                ? `End future access for ${view.roster[removal!]?.alias}?`
                : confirmation === "leave"
                  ? "Leave this conversation?"
                  : "Close this conversation?"}
            </h3>
            <p>
              {confirmation === "close"
                ? "No participant can send new messages after closure."
                : "Future messages will no longer be available to the departing participant."}
              Authorized earlier records remain available.
            </p>
            <ActionButton
              class="secondary"
              {disabled}
              onclick={() => (confirmation = null)}>Keep access</ActionButton
            ><ActionButton
              class="primary"
              {disabled}
              onclick={() => {
                if (
                  room &&
                  confirmation === "remove" &&
                  removal !== undefined
                ) {
                  oncommand({
                    kind: "conversation.remove",
                    expectedRevision: view.revision,
                    roomId: room.id,
                    roomRevision: room.revision,
                    seat: removal,
                  });
                  confirmation = null;
                } else if (confirmation === "leave")
                  action("conversation.leave");
                else if (confirmation === "close") action("conversation.close");
              }}>Confirm {confirmation}</ActionButton
            >
          </section>{/if}
      {:else}
        <Feedback
          message={loading ? "Loading authorized messages…" : ""}
          error={historyError}
          {inspect}
        />
        <div class="history-actions">
          {#if historyError}<ActionButton
              class="secondary"
              disabled={loading}
              onclick={onretryHistory}>Retry message history</ActionButton
            >{/if}{#if earlier}<ActionButton
              class="secondary"
              disabled={loading}
              onclick={older}>Earlier messages</ActionButton
            >{/if}{#if newer}<ActionButton
              class="secondary"
              disabled={loading}
              onclick={latest}>Refresh messages</ActionButton
            >{/if}
        </div>
        {#if !messages.length && !loading}<p>
            No messages in the records loaded. Invitations do not share earlier
            messages.
          </p>{/if}
        <ol class="messages" aria-label="Authorized messages">
          {#each messages as entry (entry.id)}<li
              class:own={entry.author === own}
            >
              <div class="message-author">
                <div class="avatar">
                  <FactionArt faction={view.roster[entry.author].faction} />
                </div>
                <strong
                  >{entry.author === own
                    ? "You"
                    : view.roster[entry.author].alias}</strong
                ><span>Message {entry.sequence}</span>
              </div>
              <p>{entry.body}</p>
            </li>{/each}
        </ol>
        <p class="history-boundary">
          {earlier
            ? "Earlier authorized records may contain more messages."
            : "Beginning of the authorized records loaded."} Removed participants
          retain previously received knowledge.
        </p>
        {#if room.unread}<ActionButton
            class="secondary"
            disabled={disabled || !messages.length}
            onclick={() =>
              oncommand({
                kind: "conversation.read",
                expectedRevision: view.revision,
                roomId: room!.id,
                keyVersion: room!.keyVersion,
                sequence: messages.at(-1)!.sequence,
              })}>Mark loaded messages read</ActionButton
          >{/if}
      {/if}
    </div>
    <footer>
      {#if room?.member && !participants && !room.closed}<label
          >Message<textarea
            rows="2"
            value={body}
            maxlength="4000"
            {disabled}
            oninput={(event) =>
              (drafts = { ...drafts, [selected]: event.currentTarget.value })}
          ></textarea></label
        ><span class="counter">{[...body].length} / 2,000 characters</span>{/if}
      {#if newMessage && !following && room?.member && !participants}<ActionButton
          class="secondary"
          onclick={() => {
            newMessage = false;
            following = true;
            reading?.scrollTo(0, reading.scrollHeight);
          }}>New messages</ActionButton
        >{/if}
      <Feedback {message} {error} {inspect} />{#if view.pausedAt != null}<p>
          Campaign maintenance is paused. Your draft is preserved.
        </p>{/if}
      <div class="commitment">
        <ActionButton class="secondary" onclick={onclose}
          >Back to galaxy</ActionButton
        >{#if pending && error && onretry}<ActionButton
            class="primary"
            disabled={busy}
            onclick={onretry}>Retry same command</ActionButton
          >{:else if !selected}<ActionButton
            class="primary"
            disabled={disabled ||
              !view.conversationsEnabled ||
              !title.trim() ||
              [...title.trim()].length > 60}
            onclick={() =>
              oncommand({
                kind: "conversation.create",
                expectedRevision: view.revision,
                title,
              })}>Create conversation</ActionButton
          >{:else if room?.invited}<ActionButton
            class="secondary"
            {disabled}
            onclick={() => action("conversation.decline")}>Decline</ActionButton
          ><ActionButton
            class="primary"
            {disabled}
            onclick={() => action("conversation.accept")}
            >Accept invitation</ActionButton
          >{:else if room?.member && !participants && !room.closed}<ActionButton
            class="primary"
            disabled={disabled || !validBody}
            onclick={() =>
              oncommand({
                kind: "conversation.send",
                expectedRevision: view.revision,
                roomId: room!.id,
                keyVersion: room!.keyVersion,
                body,
              })}
            >{pending
              ? "Awaiting acknowledgement…"
              : "Send message"}</ActionButton
          >{/if}
      </div>
    </footer>
  </div>
</section>

<style>
  .diplomacy {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    background: #06131d;
    color: #efe7d6;
    line-height: 1.5;
  }
  .conversation-list {
    overflow: auto;
    overscroll-behavior: contain;
    padding: 24px 16px;
    border-right: 1px solid #455e68;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    font:
      500 36px "Cormorant Garamond",
      serif;
    margin: 0 0 12px;
  }
  h3 {
    font:
      500 28px "Cormorant Garamond",
      serif;
    margin: 16px 0 8px;
  }
  .conversation-list :global(.list-back) {
    display: none;
  }
  .conversation-list :global(button) {
    text-align: left;
    display: flex;
    flex-direction: column;
  }
  .conversation-list span {
    font-size: 14px;
    color: #cdbd9e;
  }
  .conversation-list :global([aria-pressed="true"]) {
    border-color: #72e6f1;
    background: #164455;
  }
  .conversation-main {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(220px, 30%) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    position: relative;
  }
  header {
    display: contents;
  }
  .envoy {
    grid-column: 1;
    grid-row: 1/4;
    min-height: 0;
    overflow: hidden;
    background: linear-gradient(#173c50, #07131e);
  }
  .envoy {
    display: flex;
    align-items: center;
  }
  .envoy :global(.faction-art) {
    height: auto;
    aspect-ratio: 1;
  }
  .heading {
    padding: 24px 28px 12px;
    border-bottom: 1px solid #375463;
  }
  .heading p {
    margin: 8px 0;
  }
  .header-actions {
    display: flex;
    gap: 8px;
  }
  .header-actions :global(.list-toggle) {
    display: none;
  }
  .conversation-reading {
    overflow: auto;
    overscroll-behavior: contain;
    min-height: 0;
    min-width: 0;
    padding: 20px 28px;
  }
  .conversation-reading:focus-visible {
    outline: 2px solid #65deee;
    outline-offset: -3px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input:not([type="radio"]),
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 48px;
    padding: 10px 12px;
    color: inherit;
    background: #0b2533;
    border: 1px solid #7a9ca5;
    font: inherit;
  }
  textarea {
    resize: none;
    max-height: 150px;
  }
  fieldset {
    margin: 20px 0;
    border: 1px solid #4d6b76;
  }
  input[type="radio"] {
    width: 44px;
    height: 44px;
    flex: none;
  }
  .scope {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .diplomacy :global(button) {
    min-height: 48px;
    border: 1px solid #789ca5;
    color: inherit;
    background: #102c3a;
    font: inherit;
    padding: 10px 14px;
  }
  .diplomacy :global(.primary) {
    background: #07516a;
    border-color: #6ee4f2;
  }
  .messages {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .messages li {
    padding: 14px;
    border: 1px solid #355965;
    border-radius: 6px;
    background: #0d2430;
  }
  .messages li.own {
    border-color: #8a7355;
    background: #172b32;
  }
  .messages p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin: 12px 0 0;
  }
  .message-author {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .message-author > span {
    font-size: 13px;
    color: #c5baa9;
  }
  .avatar {
    width: 48px;
    height: 48px;
    overflow: hidden;
    flex: none;
    border: 1px solid #c3a16f;
    border-radius: 4px;
  }
  .participants {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .participants li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .history-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .history-boundary {
    font-size: 14px;
    color: #c4b69c;
  }
  .confirmation {
    padding: 16px;
    border: 1px solid #a79570;
    margin: 16px 0;
  }
  .confirmation :global(button) {
    margin: 4px;
  }
  footer {
    padding: 14px 28px max(16px, env(safe-area-inset-bottom));
    border-top: 1px solid #54707b;
    background: #061722;
    grid-column: 2;
  }
  .commitment {
    display: flex;
    gap: 10px;
  }
  .commitment :global(button) {
    flex: 1;
  }
  .counter {
    display: block;
    text-align: right;
    font-size: 13px;
    color: #c4b69c;
  }
  footer :global(.feedback) {
    margin: 4px 0;
  }
  footer p {
    margin: 6px 0;
  }
  @media (min-width: 2300px) {
    .diplomacy {
      font-size: 26px;
      grid-template-columns: 420px minmax(0, 1fr);
    }
    h2 {
      font-size: 52px;
    }
    h3 {
      font-size: 40px;
    }
    .conversation-list span,
    .history-boundary,
    .counter,
    .message-author > span {
      font-size: 21px;
    }
    .avatar {
      width: 64px;
      height: 64px;
    }
    .heading,
    .conversation-reading,
    footer {
      padding-left: 40px;
      padding-right: 40px;
    }
  }
  @media (max-width: 1050px) {
    .conversation-main {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) auto;
    }
    header {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #375463;
    }
    .envoy {
      width: 90px;
      height: 100px;
      flex: none;
      border: 1px solid #967b55;
      border-radius: 5px;
    }
    .heading {
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .heading h2 {
      font-size: 30px;
    }
    .heading .overline {
      font-size: 12px;
    }
    .heading p {
      font-size: 14px;
    }
    .conversation-reading {
      padding: 16px 20px;
    }
    footer {
      grid-column: 1;
      padding: 12px 20px max(12px, env(safe-area-inset-bottom));
    }
  }
  @media (max-width: 760px) {
    .diplomacy {
      grid-template-columns: minmax(0, 1fr);
    }
    .conversation-list {
      display: none;
    }
    .conversation-list.show {
      display: flex;
    }
    .conversation-list :global(.list-back) {
      display: block;
    }
    .conversation-list.show + .conversation-main {
      display: none;
    }
    .conversation-main.hide {
      display: none;
    }
    .header-actions :global(.list-toggle) {
      display: block;
    }
    .envoy {
      width: 72px;
      height: 92px;
    }
    .heading h2 {
      font-size: 28px;
      overflow-wrap: anywhere;
    }
    .header-actions :global(button) {
      font-size: 14px;
      padding: 8px;
    }
    .heading > p.overline {
      display: none;
    }
    h3 {
      font-size: 26px;
    }
    .participants li {
      align-items: flex-start;
    }
    footer label {
      font-size: 14px;
    }
    textarea {
      min-height: 66px;
    }
    input[type="radio"] {
      margin: 0;
    }
    .conversation-list.show {
      height: 100%;
    }
    .conversation-list.show :global(button) {
      flex: none;
    }
  }
  @media (max-height: 550px) {
    header {
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .envoy {
      height: 72px;
    }
    footer {
      padding-top: 8px;
      padding-bottom: 8px;
    }
  }
</style>
