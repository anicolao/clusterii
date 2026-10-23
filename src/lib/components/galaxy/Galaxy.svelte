<script lang="ts">
  import CampaignWaiting from "../CampaignWaiting.svelte";
  import CommanderDeck from "../CommanderDeck.svelte";
  import CommandControl from "../CommandControl.svelte";
  import ScienceLedger from "../ScienceLedger.svelte";
  import DevelopmentIcon from "../DevelopmentIcon.svelte";
  import type { ResearchDraft, RecoveredResearch } from "$lib/research-draft";
  import {
    refreshMarketDraft,
    type MarketAllocationDraft,
  } from "$lib/market-draft";
  import {
    fleetRecoveryTarget,
    recoveredRouteDraft,
  } from "$lib/fleet-feedback";
  import type { RecoveredFleetCommand } from "$lib/fleet-feedback";
  import type { RecoveredConstruction } from "$lib/construction-feedback";
  import type { RecoveredTrade } from "$lib/credit-offers";
  import { tick, onDestroy, untrack } from "svelte";
  import type { Technology } from "@shared/production";
  import { fleetPosition } from "@shared/travel";
  import SystemFleets from "../SystemFleets.svelte";
  import SystemObservation from "../SystemObservation.svelte";
  import type { Allocation } from "@shared/market-focus";
  import SystemConstruction from "../SystemConstruction.svelte";
  import type { Development } from "@shared/construction";
  import type { TradeAction } from "@shared/trades";
  import type { CreditDraft } from "$lib/credit-offers";
  import CampaignEconomy from "../CampaignEconomy.svelte";
  import Conversations from "../Conversations.svelte";
  import type { ConversationAction } from "@shared/conversations";
  import {
    conversationMessages,
    type ConversationReceipt,
    type MessageRecord,
  } from "$lib/conversation-history";
  import ArrivalReports from "../ArrivalReports.svelte";
  import { arrivalRecords } from "$lib/arrival-reports";
  import FleetContacts from "../FleetContacts.svelte";
  import { type FleetContact, lastFleetContacts } from "@shared/fleet-contacts";
  import ReturnBriefing from "../ReturnBriefing.svelte";
  import type { BriefingEvent } from "$lib/return-briefing";
  import CampaignHistory from "../CampaignHistory.svelte";
  import {
    HistoryEpochChanged,
    historyRecoveryMessage,
    type HistoryCursor,
    type HistoryPage,
  } from "$lib/campaign-history";
  import { Canvas } from "@threlte/core";
  import Scene from "./Scene.svelte";
  import type { CampaignView } from "@shared/campaign";
  import ChartControls from "./ChartControls.svelte";
  import type { StarClass } from "@shared/rules";
  import WorldArt from "../WorldArt.svelte";
  import SystemLayers from "../SystemLayers.svelte";
  import FleetSymbol from "../FleetSymbol.svelte";
  import { layer as developmentLayer, type Layer } from "@shared/construction";
  import CampaignMaintenance from "../CampaignMaintenance.svelte";
  import CampaignRoster from "../CampaignRoster.svelte";
  import Feedback from "../Feedback.svelte";
  import ActionButton from "../ActionButton.svelte";
  import Icon from "../Icon.svelte";
  let {
    view,
    researchDraft = $bindable<ResearchDraft | undefined>(undefined),
    routeDrafts = $bindable<Record<string, string[]>>({}),
    marketDraft = $bindable<MarketAllocationDraft>(
      untrack(
        () =>
          refreshMarketDraft(undefined, view.economy?.marketFocus).allocation,
      ),
    ),
    loadHistory,
    onback,
    onleave,
    onmaintenance,
    onresearch,
    onfocus,
    onform,
    ondisband,
    oncargo,
    onsplit,
    onmerge,
    oncancelFleet,
    onroute,
    onconversation,
    onvisit,
    ontrade,
    commandId = "",
    commandOfferId = "",
    commandRoomId = "",
    commandVisitRevision = 0,
    returnIntent = false,
    onreturnHandled,
    conversationReceipt = null,
    recoveredConversation = null,
    recoveredTrade = null,
    recoveredConstruction = null,
    recoveredFleet = null,
    recoveredResearch = null,
    accountId,
    onbuild,
    oncancel,
    onmigrate,
    realAvailable = false,
    migration = null,
    onretry,
    message = "",
    commandKind = "",
    commandFleetId = "",
    error = "",
    busy = false,
    pending = false,
  }: {
    view: CampaignView;
    researchDraft?: ResearchDraft;
    routeDrafts?: Record<string, string[]>;
    marketDraft?: MarketAllocationDraft;
    onvisit?: (revision: number) => void;
    ontrade?: (action: TradeAction) => void;
    commandId?: string;
    commandOfferId?: string;
    loadHistory?: (cursor: HistoryCursor | null) => Promise<HistoryPage>;
    onback: () => void;
    onleave?: () => void;
    onmaintenance?: () => void;
    onfocus?: (allocation: Allocation) => void;
    onresearch?: (target: Technology) => void;
    onform?: (starId: string, fighters: number, infantry: number) => void;
    ondisband?: (id: string) => void;
    onsplit?: (id: string, fighters: number, infantry: number) => void;
    onroute?: (fleetId: string, waypoints: string[]) => void;
    onconversation?: (action: ConversationAction) => void;
    commandRoomId?: string;
    commandVisitRevision?: number;
    returnIntent?: boolean;
    onreturnHandled?: () => void;
    conversationReceipt?: ConversationReceipt | null;
    recoveredConversation?: {
      id: string;
      gameId: string;
      roomId: string;
      body: string;
    } | null;
    recoveredTrade?: RecoveredTrade | null;
    recoveredConstruction?: RecoveredConstruction | null;
    recoveredFleet?: RecoveredFleetCommand | null;
    recoveredResearch?: RecoveredResearch | null;
    accountId?: string;
    oncancelFleet?: (orderId: string) => void;
    onmerge?: (id: string, targetId: string) => void;
    oncargo?: (
      id: string,
      operation: "load" | "unload",
      infantry: number,
    ) => void;
    onbuild?: (starId: string, type: Development) => void;
    oncancel?: (orderId: string) => void;
    onmigrate?: (mode: "mock" | "real") => void;
    realAvailable?: boolean;
    migration?: CampaignView["migration"];
    onretry?: () => void;
    message?: string;
    commandKind?: string;
    commandFleetId?: string;
    error?: string;
    busy?: boolean;
    pending?: boolean;
  } = $props();
  let military = $state(false);
  let selectedFleet = $state<string | null>(null);
  let resumedFleet = "";
  $effect(() => {
    const recovered = recoveredFleet;
    if (
      !recovered ||
      recovered.gameId !== view.id ||
      resumedFleet === recovered.id
    )
      return;
    // Restore only an accessible owned fleet. Missing/retired fleets retain the
    // global receipt recovery remedy; never fabricate a manifest from a draft.
    const fleet = fleetRecoveryTarget(view, recovered);
    if (!fleet) return;
    if (recovered.action.kind === "fleet.route")
      routeDrafts[fleet.id] = recoveredRouteDraft(
        routeDrafts[fleet.id],
        recovered.action.waypoints,
      );
    resumedFleet = recovered.id;
    selected = fleet.starId;
    selectedFleet = fleet.id;
    void openPanel("military");
  });
  let observation = $state(false);
  let expanded = $state(false);
  let selectedLayer = $state<Layer | null>(null);
  let inspectorHeading = $state<HTMLHeadingElement>();
  async function inspectSystem() {
    expanded = true;
    await tick();
    if (inspectorHeading?.isConnected && expanded) inspectorHeading.focus();
  }
  async function collapseSystem() {
    expanded = false;
    observation = false;
    await tick();
    if (inspectorHeading?.isConnected)
      document
        .querySelector<HTMLButtonElement>(".galaxy-surface .inspect-system")
        ?.focus();
  }
  function buildLayer(area: Layer) {
    if (busy || pending) return;
    selectedLayer = area;
    if (developmentLayer(constructionChoice) !== area)
      constructionChoice = area === "orbit" ? "camp" : "base";
    void openPanel("construction");
  }
  let more = $state(false);
  let commandRailHeight = $state(0);
  let construction = $state(false);
  let constructionChoice = $state<Development>("market");
  let resumedConstruction = "";
  $effect(() => {
    const recovered = recoveredConstruction;
    if (
      !recovered ||
      recovered.gameId !== view.id ||
      resumedConstruction === recovered.id
    )
      return;
    const action = recovered.action;
    const order =
      action.kind === "construction.cancel"
        ? view.construction?.orders.find((o) => o.id === action.orderId)
        : null;
    const starId =
      action.kind === "construction.build" ? action.starId : order?.starId;
    if (!starId || !view.stars.some((s) => s.id === starId)) return;
    resumedConstruction = recovered.id;
    selected = starId;
    constructionChoice =
      action.kind === "construction.build" ? action.type : order!.type;
    selectedLayer = developmentLayer(constructionChoice);
    void openPanel("construction");
  });
  let economy = $state(false);
  let scienceOpen = $state(false);
  let resumedResearch = "";
  $effect(() => {
    if (
      !recoveredResearch ||
      recoveredResearch.gameId !== view.id ||
      recoveredResearch.accountId !== accountId ||
      !view.economy?.research ||
      resumedResearch === recoveredResearch.id
    )
      return;
    resumedResearch = recoveredResearch.id;
    void openPanel("economy");
  });
  let exchanging = $state(false),
    tradeSelection = $state("");
  let resumedTrade = "";
  let receivedTradeViews = $state<CampaignView[]>([]);
  $effect(() => {
    if (
      view.trades?.ledger.length &&
      !receivedTradeViews.some((record) => record.revision === view.revision)
    )
      receivedTradeViews = [...receivedTradeViews, view];
  });
  $effect(() => {
    if (
      !recoveredTrade ||
      recoveredTrade.gameId !== view.id ||
      resumedTrade === recoveredTrade.id
    )
      return;
    resumedTrade = recoveredTrade.id;
    const action = recoveredTrade.action;
    if (action.kind === "trade.offer")
      tradeDraft = {
        seat: String(action.seat),
        give: String(action.giveMilli / 1000),
        request: String(action.requestMilli / 1000),
      };
    tradeSelection = action.kind === "trade.offer" ? "" : action.offerId;
    exchanging = true;
    void openPanel("economy");
  });
  let tradeDraft = $state<CreditDraft>({ seat: "", give: "10", request: "0" });
  let history = $state(false);
  let briefingOpen = $state(false);
  $effect(() => {
    if (!returnIntent) return;
    const show =
      view.briefingEnabled &&
      view.phase === "active" &&
      !!view.lastVisit &&
      (view.production?.tick ?? 0) > view.lastVisit.tick &&
      !pending &&
      !busy;
    onreturnHandled?.();
    if (show) void openPanel("briefing");
    else
      void tick().then(() =>
        document.getElementById("galaxy-heading")?.focus(),
      );
  });
  let briefingSnapshot = $state<CampaignView | null>(null);
  let visitRequested = $state(false);
  let visitRecoveryRevision = $state<number | null>(null);
  $effect(() => {
    if (
      briefingOpen &&
      pending &&
      commandKind === "campaign.visit" &&
      commandVisitRevision > 0 &&
      visitRecoveryRevision !== commandVisitRevision
    ) {
      visitRecoveryRevision = commandVisitRevision;
      visitRequested = true;
    }
  });
  $effect(() => {
    if (briefingOpen && visitRecoveryRevision != null) {
      const recovered = records.find(
        (record) => record.revision === visitRecoveryRevision,
      );
      if (recovered && briefingSnapshot?.revision !== recovered.revision)
        briefingSnapshot = recovered;
    }
  });
  $effect(() => {
    if (
      visitRequested &&
      !pending &&
      !busy &&
      commandKind === "campaign.visit" &&
      message === "Visit saved. No messages were marked read."
    ) {
      visitRequested = false;
      void closeBriefing();
    }
  });
  async function closeBriefing() {
    briefingOpen = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="history"]')?.focus();
  }
  async function inspectBriefing(event: BriefingEvent) {
    briefingOpen = false;
    if (event.destination === "system" && event.starId) {
      selected = event.starId;
      expanded = true;
      more = false;
      observation = true;
      await tick();
      document.querySelector<HTMLElement>(".system-details")?.focus();
    } else {
      if (event.destination === "arrivals" && event.starId)
        selectedArrival = `${event.tick}:${event.starId}`;
      if (
        event.roomId &&
        !view.conversations.some((room) => room.id === event.roomId)
      ) {
        await openPanel("history");
        const record = records.find((record) =>
          conversationMessages([record], event.roomId!).some(
            (message) => `message:${message.id}` === event.id,
          ),
        );
        if (record) {
          await tick();
          const details = document.querySelector<HTMLDetailsElement>(
            `details[aria-label="Campaign record ${record.revision}"]`,
          );
          if (details) {
            details.open = true;
            details.scrollIntoView({ block: "nearest" });
            details.querySelector<HTMLElement>("summary")?.focus();
          }
        }
        return;
      }
      if (event.roomId) selectedRoom = event.roomId;
      await openPanel(
        event.destination === "system" ? "history" : event.destination,
      );
    }
  }
  let contactsOpen = $state(false);
  let records = $state<CampaignView[]>([]);
  let arrivalsOpen = $state(false);
  let conversationsOpen = $state(false);
  let selectedRoom = $state("");
  let conversationDrafts = $state<Record<string, string>>({});
  let conversationTitle = $state("");
  let acknowledgedConversation = "";
  let resumedConversation = "";
  $effect(() => {
    const recovered = recoveredConversation;
    if (
      recovered &&
      recovered.gameId === view.id &&
      recovered.id !== resumedConversation
    ) {
      resumedConversation = recovered.id;
      selectedRoom = recovered.roomId;
      if (recovered.body && !conversationDrafts[recovered.roomId])
        conversationDrafts = {
          ...conversationDrafts,
          [recovered.roomId]: recovered.body,
        };
      void openPanel("conversations");
    }
  });
  let draftReadyRoom = $state<string | null>(null),
    draftRevision = 0;
  let draftSaving = $state(false),
    draftSavedText = $state(""),
    draftError = $state("");
  let draftConflict = $state(false),
    savedAlternative = "",
    draftLoad = 0;
  const draftRoom = $derived(selectedRoom || "$new");
  const draftText = $derived(
    selectedRoom ? (conversationDrafts[selectedRoom] ?? "") : conversationTitle,
  );
  const draftAllowed = $derived(
    !selectedRoom ||
      view.conversations?.some((r) => r.id === selectedRoom && r.member),
  );
  function setDraftText(text: string) {
    if (selectedRoom)
      conversationDrafts = { ...conversationDrafts, [selectedRoom]: text };
    else conversationTitle = text;
  }
  async function loadDraft() {
    if (!accountId || !draftAllowed) return;
    const token = ++draftLoad,
      room = draftRoom,
      uid = accountId;
    draftReadyRoom = null;
    draftError = "";
    draftConflict = false;
    try {
      const { recoverDraft } = await import("$lib/conversation-drafts");
      const saved = await recoverDraft(uid, view.id, room);
      if (token !== draftLoad || room !== draftRoom) return;
      draftRevision = saved.revision;
      savedAlternative = saved.text;
      draftSavedText = saved.text;
      const local = selectedRoom
        ? conversationDrafts[selectedRoom]
        : conversationTitle || undefined;
      if (local !== undefined && local !== saved.text && saved.revision) {
        draftConflict = true;
        draftError =
          "This browser has a different saved draft. Your text is preserved; choose which version to keep.";
      } else if (local === undefined) setDraftText(saved.text);
      draftReadyRoom = room;
    } catch (error) {
      if (token === draftLoad) draftError = (error as Error).message;
    }
  }
  $effect(() => {
    if (
      accountId &&
      conversationsOpen &&
      draftAllowed &&
      draftReadyRoom !== draftRoom
    )
      untrack(() => void loadDraft());
  });
  async function storeDraft() {
    if (
      !accountId ||
      draftReadyRoom !== draftRoom ||
      draftSaving ||
      draftConflict ||
      !draftAllowed
    )
      return;
    const room = draftRoom,
      text = draftText,
      revision = draftRevision,
      token = draftLoad;
    draftSaving = true;
    try {
      const { persistDraft } = await import("$lib/conversation-drafts");
      const saved = await persistDraft(
        accountId,
        view.id,
        room,
        view.mode,
        revision,
        text,
      );
      if (token === draftLoad && room === draftRoom) {
        draftRevision = saved;
        draftSavedText = text;
        draftError = "";
      }
    } catch (error) {
      if (token === draftLoad) {
        draftError = (error as Error).message;
        draftConflict =
          (error as Error).name === "RecoveryConflict" ||
          (error as Error).message.includes("another tab");
      }
    } finally {
      draftSaving = false;
    }
  }
  $effect(() => {
    if (
      !accountId ||
      !conversationsOpen ||
      draftReadyRoom !== draftRoom ||
      draftSaving ||
      draftError ||
      !draftAllowed ||
      draftText === draftSavedText
    )
      return;
    const timer = setTimeout(() => void storeDraft(), 250);
    return () => clearTimeout(timer);
  });
  async function resolveDraft(replace: boolean) {
    if (!accountId) return;
    const room = draftRoom;
    try {
      const { recoverDraft } = await import("$lib/conversation-drafts");
      const latest = await recoverDraft(accountId, view.id, room);
      if (room !== draftRoom) return;
      draftRevision = latest.revision;
      savedAlternative = latest.text;
      draftSavedText = latest.text;
      draftConflict = false;
      draftError = "";
      if (!replace) setDraftText(savedAlternative);
      else await storeDraft();
    } catch (error) {
      draftError = (error as Error).message;
    }
  }
  let receivedConversationViews = $state<MessageRecord[]>([]);
  const messages = $derived(
    conversationMessages(
      [view, ...receivedConversationViews, ...records],
      selectedRoom,
    ),
  );
  $effect(() => {
    const current = view;
    untrack(() => {
      const retained = new Map<string, MessageRecord>();
      for (const record of [...receivedConversationViews, current])
        for (const room of record.conversations ?? [])
          for (const message of [room.message, ...(room.sharedMessages ?? [])])
            if (message)
              retained.set(message.id, {
                revision: record.revision,
                conversations: [{ id: room.id, message }],
              });
      receivedConversationViews = [...new Set(retained.values())];
    });
  });
  $effect(() => {
    const receipt = conversationReceipt;
    if (
      receipt &&
      receipt.gameId === view.id &&
      receipt.id !== acknowledgedConversation
    ) {
      acknowledgedConversation = receipt.id;
      untrack(() => {
        if (
          receipt.status === "accepted" &&
          receipt.kind === "conversation.send" &&
          conversationDrafts[receipt.roomId]?.trim() === receipt.body.trim()
        ) {
          conversationDrafts = { ...conversationDrafts, [receipt.roomId]: "" };
          if (selectedRoom === receipt.roomId) draftReadyRoom = null;
        }
        if (
          receipt.status === "accepted" &&
          receipt.kind === "conversation.create"
        ) {
          selectedRoom = receipt.roomId;
          conversationTitle = "";
        }
      });
    }
  });
  let selectedArrival = $state("");
  let receivedArrivals = $state<CampaignView[]>([]);
  const arrivals = $derived(
    arrivalRecords([view, ...receivedArrivals, ...records]),
  );
  $effect(() => {
    const current = view;
    untrack(() => {
      if (current.military?.arrivals?.length)
        receivedArrivals = arrivalRecords([...receivedArrivals, current]).map(
          (r) => r.view,
        );
    });
  });
  let selectedContact = $state("");

  let receivedContacts = $state<FleetContact[]>([]);
  const contacts = $derived(
    lastFleetContacts([view, { fleetContacts: receivedContacts }, ...records]),
  );
  $effect(() => {
    const acquired = view.fleetContacts;
    untrack(() => {
      receivedContacts = lastFleetContacts([
        { fleetContacts: receivedContacts },
        { fleetContacts: acquired },
      ]);
    });
  });
  let cursor = $state<HistoryCursor | null>(null);
  let historyLoading = $state(false);
  let historyError = $state("");
  let historySerial = 0;
  let retryCursor: HistoryCursor | null = null;
  $effect(() => {
    if (
      view.fleetContactsEnabled &&
      view.phase === "active" &&
      !records.length &&
      !historyLoading &&
      !historyError
    )
      void readHistory();
  });
  onDestroy(() => {
    historySerial++;
  });
  async function readHistory(after: HistoryCursor | null = null) {
    if (!loadHistory) return;
    const serial = ++historySerial;
    const openingControl =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    retryCursor = after;
    historyLoading = true;
    historyError = "";
    await tick();
    if (serial !== historySerial) return;
    if (
      (briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen) &&
      document.activeElement === document.body
    )
      document.querySelector<HTMLElement>(".history-panel")?.focus();
    try {
      const page = await loadHistory(after);
      if (serial !== historySerial) return;
      records =
        contactsOpen || arrivalsOpen || conversationsOpen
          ? [
              ...new Map(
                [...records, ...page.records].map((record) => [
                  record.revision,
                  record,
                ]),
              ).values(),
            ].sort((a, b) => b.revision - a.revision)
          : after
            ? [...records, ...page.records]
            : page.records;
      cursor = page.cursor;
      if (!after) {
        await tick();
        document
          .querySelector(".history-panel .history-scroll")
          ?.scrollTo(0, 0);
      }
    } catch (error) {
      if (serial !== historySerial) return;
      historyError =
        error instanceof HistoryEpochChanged
          ? error.message
          : historyRecoveryMessage;
    } finally {
      if (serial === historySerial) {
        historyLoading = false;
        await tick();
        if (
          (briefingOpen ||
            history ||
            contactsOpen ||
            arrivalsOpen ||
            conversationsOpen) &&
          serial === historySerial &&
          document.activeElement === document.body
        ) {
          if (
            openingControl?.isConnected &&
            openingControl.closest(".history-panel")
          )
            openingControl.focus();
          else document.querySelector<HTMLElement>(".history-panel")?.focus();
        }
      }
    }
  }
  async function closeConversations() {
    conversationsOpen = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document
      .querySelector<HTMLElement>('[data-focus="conversations"]')
      ?.focus();
  }
  async function closeArrivals() {
    arrivalsOpen = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="arrivals"]')?.focus();
  }
  async function inspectArrival(starId: string) {
    arrivalsOpen = false;
    selected = starId;
    expanded = true;
    selectedLayer = "surface";
    more = false;
    cameraRequest = {
      action: "selected",
      starId,
      sequence: cameraRequest.sequence + 1,
    };
    observation = false;
    await tick();
    document.querySelector<HTMLElement>(".system-details")?.focus();
  }
  async function closeContacts() {
    contactsOpen = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="contacts"]')?.focus();
  }
  async function closeHistory() {
    history = false;
    historySerial++;
    historyLoading = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="history"]')?.focus();
  }
  let roster = $state(false);
  let selected = $state("");
  let stellarClass = $state<StarClass | "all">("all");
  let cameraRequest = $state({ action: "overview", starId: "", sequence: 0 });
  function move(
    action: "selected" | "home" | "overview" | "in" | "out" | "left" | "right",
  ) {
    if (action === "home" && view.own.home) selected = view.own.home;
    cameraRequest = {
      action,
      starId: action === "home" ? (view.own.home ?? "") : star.id,
      sequence: cameraRequest.sequence + 1,
    };
    void closeList();
  }
  const filtered = $derived(
    view.stars.filter(
      (s) => stellarClass === "all" || s.class === stellarClass,
    ),
  );
  let query = $state("");
  let listing = $state(false);
  let rosterOpener: HTMLElement | null = null;
  async function openPanel(
    kind:
      | "roster"
      | "systems"
      | "conversations"
      | "arrivals"
      | "contacts"
      | "briefing"
      | "history"
      | "economy"
      | "construction"
      | "military",
  ) {
    if (kind === "roster")
      rosterOpener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    military = kind === "military";
    construction = kind === "construction";
    economy = kind === "economy";
    scienceOpen = false;
    history = kind === "history";
    briefingOpen = kind === "briefing";
    if (briefingOpen) {
      briefingSnapshot = structuredClone($state.snapshot(view));
      visitRequested = commandKind === "campaign.visit" && pending;
      visitRecoveryRevision = visitRequested ? commandVisitRevision : null;
      const recovered =
        visitRecoveryRevision == null
          ? null
          : records.find((record) => record.revision === visitRecoveryRevision);
      if (recovered) briefingSnapshot = recovered;
      void readHistory();
    }
    contactsOpen = kind === "contacts";
    arrivalsOpen = kind === "arrivals";
    conversationsOpen = kind === "conversations";
    if (
      (briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen) &&
      !records.length &&
      !historyLoading
    )
      void readHistory();
    roster = kind === "roster";
    listing = kind === "systems";
    await tick();
    if (military) document.querySelector<HTMLElement>(".fleet-panel")?.focus();
    else if (construction)
      document.querySelector<HTMLElement>(".construction-panel")?.focus();
    else if (economy)
      document.querySelector<HTMLElement>(".economy-panel")?.focus();
    else if (
      briefingOpen ||
      history ||
      contactsOpen ||
      arrivalsOpen ||
      conversationsOpen
    )
      document.querySelector<HTMLElement>(".history-panel")?.focus();
    else if (listing) document.getElementById("system-search")?.focus();
    else document.querySelector<HTMLElement>(".roster-panel")?.focus();
  }
  async function closeRoster() {
    roster = false;
    await tick();
    if (rosterOpener?.isConnected) rosterOpener.focus();
    else document.querySelector<HTMLElement>('[data-focus="roster"]')?.focus();
  }
  async function closeEconomy() {
    const opener = scienceOpen ? "science" : "economy";
    economy = false;
    scienceOpen = false;
    await tick();
    document.querySelector<HTMLElement>(`[data-focus="${opener}"]`)?.focus();
  }
  async function openScience() {
    await openPanel("economy");
    scienceOpen = true;
    await tick();
    document.querySelector<HTMLElement>("[data-science-heading]")?.focus();
  }
  async function closeConstruction() {
    expanded = true;
    selectedLayer = developmentLayer(constructionChoice);
    construction = false;
    await tick();
    if (!inspectorHeading?.isConnected) return;
    const entry = document.querySelector<HTMLButtonElement>(
      '[data-focus="construction"]',
    );
    if (entry && !entry.disabled) entry.focus();
    else
      document
        .querySelector<HTMLButtonElement>(
          `[data-focus="layer-${selectedLayer}"]`,
        )
        ?.focus();
  }
  async function closeMilitary() {
    expanded = true;
    military = false;
    await tick();
    document.querySelector<HTMLElement>('[data-focus="military"]')?.focus();
  }
  function panelKeys(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      void (briefingOpen
        ? closeBriefing()
        : military
          ? closeMilitary()
          : construction
            ? closeConstruction()
            : economy
              ? closeEconomy()
              : conversationsOpen
                ? closeConversations()
                : arrivalsOpen
                  ? closeArrivals()
                  : contactsOpen
                    ? closeContacts()
                    : history
                      ? closeHistory()
                      : roster
                        ? closeRoster()
                        : closeList());
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex="0"]',
      ),
    ].filter(
      (el) =>
        !el.matches(":disabled") &&
        el.checkVisibility({
          visibilityProperty: true,
          contentVisibilityAuto: true,
        }),
    );
    const first = controls[0],
      last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === event.currentTarget)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  async function closeList(id?: string) {
    if (id) selected = id;
    listing = false;
    await tick();
    document
      .querySelector<HTMLButtonElement>('[data-focus="systems-list"]')
      ?.focus();
  }
  const star = $derived(
    view.stars.find((s) => s.id === selected) ??
      view.stars.find((s) => s.id === view.own.home) ??
      view.stars[0],
  );
  const holding = $derived(view.holdings.find((h) => h.starId === star?.id));
  const visible = $derived(
    filtered.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
  );
</script>

<div
  class="galaxy-surface"
  class:before-start={view.phase !== "active"}
  style:--command-rail-height={`${commandRailHeight}px`}
>
  {#if view.phase === "waiting" || view.phase === "scheduled"}
    <div inert={roster}>
      <CampaignWaiting
        {view}
        {message}
        {error}
        {busy}
        {pending}
        {onback}
        {onleave}
        {onretry}
        onroster={() => openPanel("roster")}
      />
    </div>
  {:else}
    <header
      class="command-rail"
      bind:offsetHeight={commandRailHeight}
      inert={more ||
        roster ||
        listing ||
        briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen ||
        economy ||
        construction ||
        military}
    >
      <div class="commander-presence">
        <CommanderDeck
          roster={view.roster}
          own={view.own}
          onroster={() => openPanel("roster")}
        />
      </div>
      <div class="campaign-context">
        <h1 id="galaxy-heading" tabindex="-1">{view.name}</h1>
        <span
          >{view.pausedAt != null
            ? "Paused · Development maintenance"
            : "Development · Rules under review"}</span
        >
      </div>
      {#if view.phase === "active"}
        <div class="campaign-facts" aria-label="Empire resources">
          <span
            >Credits <strong
              >{view.empire
                ? (view.empire.creditsMilli / 1000).toLocaleString("en-US")
                : "—"}</strong
            ></span
          >
          <ActionButton
            class="science-resource"
            data-focus="science"
            onclick={openScience}
            aria-label="Inspect science per tick"
          >
            <DevelopmentIcon type="station" />
            <span
              >Science <strong
                >{view.economy?.science
                  ? `+${(view.economy.science.scienceMilli / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} / tick`
                  : "Rate not recorded"}</strong
              >{#if view.pausedAt != null}<small>Paused</small>{/if}</span
            >
          </ActionButton>
          <span
            >Next tick <strong
              >{view.pausedAt != null
                ? "Paused"
                : view.production
                  ? new Date(view.production.nextTickAt).toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit", timeZone: "UTC" },
                    ) + " UTC"
                  : "After start"}</strong
            ></span
          >
        </div>
      {/if}
      <ActionButton
        class="quiet roster-access"
        onclick={() => openPanel("roster")}
        data-focus="roster"
        aria-expanded={roster}>Roster</ActionButton
      ><ActionButton class="quiet campaigns-access" onclick={onback}
        >Campaigns</ActionButton
      >
    </header>
    {#if !roster && !expanded && !more && !history && !commandKind.startsWith("conversation.") && !economy}<div
        class="acknowledgement"
        inert={listing ||
          briefingOpen ||
          history ||
          contactsOpen ||
          arrivalsOpen ||
          conversationsOpen ||
          economy ||
          construction ||
          military}
      >
        <Feedback
          message={view.phase === "active" && commandKind === "campaign.join"
            ? ""
            : message}
          {error}
        />{#if onretry}<ActionButton
            disabled={busy}
            class="secondary"
            onclick={onretry}
            >{pending ? "Retry order" : "Reconnect"}</ActionButton
          >{/if}
      </div>{/if}
    <div
      class="chart"
      inert={more ||
        roster ||
        listing ||
        briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen ||
        economy ||
        construction ||
        military}
      aria-label="Interactive galaxy chart. Drag to orbit and scroll to zoom. Use the systems list for keyboard selection."
    >
      {#if view.fleetContactsEnabled}<p class="contact-legend">
          {historyLoading
            ? "Recovering contact records…"
            : "Contact markers show acquired positions from loaded records."}
        </p>{/if}
      <div class="stellar-viewport" data-galaxy-viewport>
        <Canvas renderMode="on-demand"
          ><Scene
            fleets={Object.fromEntries(
              view.stars.map((s) => [
                s.id,
                view.military?.fleets.filter(
                  (f) => f.starId === s.id && f.travel?.status !== "traveling",
                ).length ?? 0,
              ]),
            )}
            travelers={(view.military?.fleets ?? [])
              .filter((f) => f.travel?.status === "traveling")
              .map((f) => ({
                id: f.id,
                number: f.number,
                ...fleetPosition(f, view.stars, view.production?.tick ?? 0),
              }))}
            onfleet={(id) => {
              selectedFleet = id;
              void openPanel("military");
            }}
            {contacts}
            stars={view.stars}
            owned={view.holdings.map((h) => h.starId)}
            home={view.own.home ?? ""}
            selected={star.id}
            {stellarClass}
            {cameraRequest}
            onselect={(id) => (selected = id)}
          /></Canvas
        >
      </div>
    </div>
    <aside
      inert={more ||
        roster ||
        listing ||
        briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen ||
        economy ||
        construction ||
        military}
      class="system-inspector"
      class:observing={observation}
      class:expanded
      class:active={view.phase === "active"}
      aria-label="Selected system"
    >
      <p class="overline gold">{star.class}-class star</p>
      <h2 bind:this={inspectorHeading} tabindex="-1">
        <Icon kind="star" />
        {star.name}
      </h2>
      {#if expanded}<div class="observation-access">
          <ActionButton
            class="quiet"
            aria-pressed={observation}
            onclick={() => (observation = !observation)}
            >{observation ? "Return to system" : "Observation"}</ActionButton
          >
        </div>{/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (This bounded intelligence panel owns its keyboard scrolling.) -->
      <div
        class="system-details"
        role="region"
        aria-label="System details"
        onkeydown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
          )
            return;
          if (event.key === "End" || event.key === "Home") {
            event.preventDefault();
            event.currentTarget.scrollTop =
              event.key === "End" ? event.currentTarget.scrollHeight : 0;
          }
        }}
        tabindex="0"
      >
        {#if observation}<SystemObservation
            {view}
            starId={star.id}
          />{:else if expanded}
          <SystemLayers
            {holding}
            bind:selected={selectedLayer}
            pending={busy || pending}
            onbuild={view.productionEnabled && onbuild ? buildLayer : undefined}
          />
        {:else}
          <WorldArt />
          <p>
            {view.phase === "active"
              ? "Your knowledge of this system"
              : "Awaiting home assignment."}
          </p>
          <dl>
            <div>
              <dt>Orbit</dt>
              <dd>{holding?.orbit ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Surface</dt>
              <dd>{holding?.surface ?? "Unknown"}</dd>
            </div>
          </dl>
        {/if}
      </div>
      <div class="system-actions">
        {#if expanded}
          <ActionButton class="secondary back-to-chart" onclick={collapseSystem}
            >Back to galaxy</ActionButton
          >
          {#if view.military && (holding?.orbit === "You" || view.military.fleets.length) && onform}<ActionButton
              class="view-forces"
              data-focus="military"
              aria-expanded={military}
              onclick={() => openPanel("military")}
              ><FleetSymbol /> View forces</ActionButton
            >{/if}
        {:else}<ActionButton
            class="inspect-system"
            aria-expanded={false}
            onclick={inspectSystem}>Inspect system</ActionButton
          >{/if}
      </div>
    </aside>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Delegated Escape closes the command tray from its real buttons.) -->
    <nav
      class="command-dock"
      aria-label="Galaxy commands"
      onkeydown={(event) => {
        if (event.key === "Escape" && more) {
          event.preventDefault();
          more = false;
          document
            .querySelector<HTMLButtonElement>('[data-focus="more"]')
            ?.focus();
        }
      }}
      inert={roster ||
        listing ||
        briefingOpen ||
        history ||
        contactsOpen ||
        arrivalsOpen ||
        conversationsOpen ||
        economy ||
        construction ||
        military}
    >
      <div class="dock-primary">
        <ActionButton
          class="quiet"
          onclick={() => {
            expanded = false;
            observation = false;
            more = false;
          }}>Galaxy</ActionButton
        >
        <ActionButton
          class="quiet"
          aria-expanded={more}
          data-focus="more"
          aria-controls="galaxy-destinations"
          onclick={() => (more = !more)}>More</ActionButton
        >
      </div>
      <div id="galaxy-destinations" class="dock-destinations" class:open={more}>
        <CommandControl
          kind="systems"
          label="Systems list"
          current
          onclick={() => openPanel("systems")}
          data-focus="systems-list"
          aria-expanded={listing}
        />
        {#if loadHistory && onconversation}<CommandControl
            kind="conversations"
            label={view.conversations?.some((r) => r.invited || r.unread)
              ? "Conversations · New"
              : "Conversations"}
            data-focus="conversations"
            aria-expanded={conversationsOpen}
            onclick={() => openPanel("conversations")}
          />{/if}
        {#if loadHistory}<CommandControl
            kind="arrivals"
            label="Arrival reports"
            data-focus="arrivals"
            aria-expanded={arrivalsOpen}
            onclick={() => openPanel("arrivals")}
          /><CommandControl
            kind="contacts"
            label="Fleet contacts"
            data-focus="contacts"
            aria-expanded={contactsOpen}
            onclick={() => openPanel("contacts")}
          /><CommandControl
            kind="history"
            label="History"
            data-focus="history"
            aria-expanded={history}
            onclick={() => openPanel("history")}
          />{/if}
        <CommandControl
          kind="economy"
          label="Economy"
          data-focus="economy"
          aria-expanded={economy}
          onclick={() => openPanel("economy")}
        />
      </div>
    </nav>
    {#if conversationsOpen && onconversation}<div
        class="construction-panel contact-panel history-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Conversations panel"
        onkeydown={panelKeys}
      >
        <Conversations
          feedbackKind={commandKind}
          {view}
          {messages}
          bind:selected={selectedRoom}
          bind:drafts={conversationDrafts}
          bind:title={conversationTitle}
          draftReady={!accountId ||
            draftReadyRoom === draftRoom ||
            !draftAllowed}
          draftSaving={draftSaving ||
            (!!accountId &&
              draftReadyRoom === draftRoom &&
              draftText !== draftSavedText &&
              !draftError)}
          {draftError}
          {draftConflict}
          draftSaved={!!accountId &&
            draftReadyRoom === draftRoom &&
            draftText === draftSavedText &&
            !!draftText}
          onretryDraft={accountId
            ? () => (draftReadyRoom === draftRoom ? storeDraft() : loadDraft())
            : undefined}
          onuseSavedDraft={() => resolveDraft(false)}
          onreplaceDraft={() => resolveDraft(true)}
          pending={pending && commandKind.startsWith("conversation.")}
          {busy}
          message={commandKind.startsWith("conversation.") &&
          (commandRoomId === selectedRoom ||
            (commandKind === "conversation.create" &&
              conversationReceipt?.roomId === selectedRoom))
            ? message
            : ""}
          error={commandKind.startsWith("conversation.") &&
          (commandRoomId === selectedRoom ||
            (commandKind === "conversation.create" &&
              conversationReceipt?.roomId === selectedRoom))
            ? error
            : ""}
          loading={historyLoading}
          {historyError}
          earlier={!!cursor}
          newer={!!records.length && records[0].revision < view.revision}
          oncommand={onconversation}
          onearlier={() => readHistory(cursor)}
          onlatest={() => readHistory()}
          onretryHistory={() => readHistory(retryCursor)}
          {onretry}
          onclose={closeConversations}
        />
      </div>{/if}
    {#if arrivalsOpen}<div
        class="construction-panel contact-panel history-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Arrival reports panel"
        onkeydown={panelKeys}
      >
        <ArrivalReports
          records={arrivals}
          bind:selected={selectedArrival}
          loading={historyLoading}
          error={historyError}
          earlier={!!cursor}
          newer={!!records.length && records[0].revision < view.revision}
          onearlier={() => readHistory(cursor)}
          onlatest={() => readHistory()}
          onretry={() => readHistory(retryCursor)}
          onclose={closeArrivals}
          oninspect={inspectArrival}
        />
      </div>{/if}
    {#if contactsOpen}<div
        class="construction-panel contact-panel history-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Fleet contacts panel"
        onkeydown={panelKeys}
      >
        <FleetContacts
          {view}
          {contacts}
          bind:selected={selectedContact}
          loading={historyLoading}
          error={historyError}
          earlier={!!cursor}
          newer={!!records.length && records[0].revision < view.revision}
          onearlier={() => readHistory(cursor)}
          onlatest={() => readHistory()}
          onretry={() => readHistory(retryCursor)}
          onclose={closeContacts}
        />
      </div>{/if}
    {#if military}<div
        class="construction-panel fleet-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Fleet preparation panel"
        onkeydown={panelKeys}
      >
        <SystemFleets
          bind:selected={selectedFleet}
          bind:routeDrafts
          {recoveredFleet}
          {commandKind}
          {commandFleetId}
          {view}
          starId={star.id}
          {busy}
          {pending}
          message={commandKind.startsWith("fleet.") ? message : ""}
          error={commandKind.startsWith("fleet.") ? error : ""}
          onform={(fighters, infantry) => onform?.(star.id, fighters, infantry)}
          ondisband={(id) => ondisband?.(id)}
          onsplit={(id, fighters, infantry) =>
            onsplit?.(id, fighters, infantry)}
          onroute={(id, waypoints) => onroute?.(id, waypoints)}
          oncancel={(id) => oncancelFleet?.(id)}
          onmerge={(id, targetId) => onmerge?.(id, targetId)}
          oncargo={(id, operation, infantry) =>
            oncargo?.(id, operation, infantry)}
          onclose={closeMilitary}
          {onretry}
        />
      </div>{/if}
    {#if construction}<div
        class="construction-panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="System construction panel"
        onkeydown={panelKeys}
      >
        <SystemConstruction
          bind:chosen={constructionChoice}
          {view}
          starId={star.id}
          onbuild={(type) => onbuild?.(star.id, type)}
          {oncancel}
          onclose={closeConstruction}
          {onretry}
          {busy}
          {pending}
          message={commandKind.startsWith("construction.") ? message : ""}
          error={commandKind.startsWith("construction.") ? error : ""}
        />
      </div>{/if}
    {#if economy}<div
        class="history-panel economy-panel"
        class:science-panel={scienceOpen}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Empire economy panel"
        onkeydown={panelKeys}
      >
        {#if scienceOpen}<ScienceLedger
            {view}
            onclose={closeEconomy}
          />{:else}<CampaignEconomy
            bind:researchDraft
            bind:marketDraft
            {view}
            {ontrade}
            records={[...records, ...receivedTradeViews]}
            bind:exchanging
            bind:tradeSelection
            bind:tradeDraft
            {commandId}
            {commandOfferId}
            onhistory={() => openPanel("history")}
            onclose={closeEconomy}
            {onresearch}
            {onfocus}
            {commandKind}
            {message}
            {error}
            {busy}
            {pending}
            {onretry}
          />{/if}
      </div>{/if}
    {#if briefingOpen && briefingSnapshot}<div
        class="construction-panel contact-panel history-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Return briefing panel"
        tabindex="-1"
        onkeydown={panelKeys}
      >
        <ReturnBriefing
          snapshot={briefingSnapshot}
          {records}
          loading={historyLoading}
          earlier={!!cursor}
          newer={view.revision > briefingSnapshot.revision &&
            !(pending && commandKind === "campaign.visit")}
          pending={pending && commandKind === "campaign.visit"}
          preparing={busy && !pending && commandKind === "campaign.visit"}
          blocked={(pending || busy) && commandKind !== "campaign.visit"}
          recovering={visitRecoveryRevision != null &&
            briefingSnapshot.revision !== visitRecoveryRevision}
          message={commandKind === "campaign.visit" &&
          (visitRequested || pending)
            ? message
            : ""}
          error={historyError ||
            (commandKind === "campaign.visit" && (visitRequested || pending)
              ? error
              : "")}
          onearlier={() => readHistory(cursor)}
          onlatest={() => {
            briefingSnapshot = structuredClone($state.snapshot(view));
            void readHistory();
          }}
          onretry={() =>
            historyError ? readHistory(retryCursor) : onretry?.()}
          oninspect={inspectBriefing}
          onconfirm={(revision) => {
            visitRequested = true;
            onvisit?.(revision);
          }}
          onclose={closeBriefing}
        />
      </div>{/if}
    {#if history}<div
        class="history-panel campaign-records"
        role="dialog"
        aria-modal="true"
        aria-label="Campaign history panel"
        tabindex="-1"
        onkeydown={panelKeys}
      >
        <CampaignHistory
          {records}
          loading={historyLoading}
          error={historyError}
          earlier={!!cursor}
          newer={!!records.length && view.revision > records[0].revision}
          onearlier={() => readHistory(cursor)}
          onlatest={() => readHistory()}
          onretry={() => readHistory(retryCursor)}
          onbriefing={view.briefingEnabled && onvisit
            ? () => openPanel("briefing")
            : undefined}
          onclose={closeHistory}
        />
      </div>{/if}
  {/if}
  {#if roster}<div
      class="roster-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={panelKeys}
      aria-label="Campaign roster panel"
    >
      <CampaignRoster game={view} />
      <Feedback {message} {error} />
      {#if onretry}<ActionButton
          disabled={busy}
          class="secondary"
          onclick={onretry}
          >{pending ? "Retry order" : "Reconnect"}</ActionButton
        >{/if}
      <div class="roster-actions">
        <ActionButton class="secondary" onclick={closeRoster}
          >Close roster</ActionButton
        >{#if view.phase !== "active" && onleave}<ActionButton
            class="quiet"
            disabled={busy || pending || view.pausedAt != null}
            onclick={onleave}>Leave campaign</ActionButton
          >{/if}
      </div>
      {#if onmaintenance}<CampaignMaintenance
          paused={view.pausedAt != null}
          {busy}
          {pending}
          onchange={onmaintenance}
          {onmigrate}
          {realAvailable}
          {migration}
          mode={view.mode}
          exposed={view.mockExposed}
        />{/if}
    </div>{/if}
  {#if listing}<div
      class="systems-list"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={panelKeys}
      aria-label="Systems list"
    >
      <div class="list-body">
        <ChartControls
          bind:stellarClass
          onmove={move}
          homeAvailable={!!view.own.home}
        />
        <p>
          {filtered.length} systems · {stellarClass === "all"
            ? "All classes"
            : `${stellarClass} class`}
        </p>
        {#if stellarClass !== "all" && star.class !== stellarClass}<p>
            The selected system remains visible on the chart.
          </p>{/if}
        <label for="system-search">Find a system</label><input
          id="system-search"
          type="search"
          bind:value={query}
        />
        <div class="system-results">
          {#each visible as item}<ActionButton
              class={item.id === star.id ? "current-system" : ""}
              onclick={() => closeList(item.id)}
              aria-label={`Select ${item.name}, ${item.class} class`}
              >{item.name}<span>{item.class}</span></ActionButton
            >{/each}
        </div>
      </div>
      <ActionButton class="secondary" onclick={() => closeList()}
        >Close list</ActionButton
      >
    </div>{/if}
</div>

<style>
  .construction-panel {
    position: absolute;
    inset: 58px 0 0;
    z-index: 6;
    background: #06121a;
    overflow: hidden;
  }
  @media (min-width: 2500px) {
    .construction-panel {
      top: 90px;
    }
  }
  .galaxy-surface {
    height: 100svh;
    min-height: 0;
    position: relative;
    isolation: isolate;
    background:
      radial-gradient(ellipse at 40% 45%, #73563833, transparent 45%),
      radial-gradient(ellipse at 50% 55%, #16385788, transparent 70%), #050c14;
  }
  .contact-legend {
    order: 2;
    flex: none;
    z-index: 1;
    margin: 0 16px;
    color: #dccbb5;
    background: #07131cd9;
    padding: 6px;
    font-size: 13px;
    pointer-events: none;
  }
  .chart {
    display: flex;
    flex-direction: column;
    isolation: isolate;
    overflow: hidden;
    z-index: 0;
    position: absolute;
    inset: 58px 20% 0 0;
  }
  .stellar-viewport {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    isolation: isolate;
  }
  .command-rail {
    position: absolute;
    inset: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 6px 20px;
    background: #07131c;
    border-bottom: 1px solid #627d89;
    z-index: 4;
    min-height: 58px;
  }
  .command-rail h1 {
    font:
      500 25px "Cormorant Garamond",
      serif;
    margin: 0;
  }
  .command-rail > div:first-child {
    margin-right: auto;
  }
  .command-rail > div > span {
    font-size: 12px;
    color: var(--muted);
  }
  .campaign-facts {
    display: flex;
    gap: 24px;
  }
  .acknowledgement {
    position: absolute;
    left: 20px;
    top: 68px;
    max-width: calc(100% - 400px);
    z-index: 3;
    pointer-events: none;
  }
  .acknowledgement :global(button) {
    pointer-events: auto;
  }
  .history-panel {
    position: absolute;
    inset: 80px auto 24px 24px;
    width: min(620px, calc(100% - 48px));
    padding: 24px;
    z-index: 6;
    background: #07131c;
    border: 1px solid #b29e78;
    box-shadow: 0 20px 80px #000;
  }
  .contact-panel.history-panel {
    inset: 58px 0 0;
    width: auto;
    padding: 0;
    border: 0;
  }
  .history-panel.campaign-records {
    top: max(80px, calc(var(--command-rail-height) + 8px));
  }
  @media (min-width: 2400px) {
    .history-panel.campaign-records {
      top: max(130px, calc(var(--command-rail-height) + 8px));
    }
  }
  @media (max-width: 700px) {
    .history-panel.campaign-records {
      top: max(66px, calc(var(--command-rail-height) + 8px));
    }
  }
  .roster-panel {
    position: absolute;
    inset: 80px 24px auto auto;
    max-height: calc(100% - 110px);
    overflow: auto;
    max-width: 860px;
    width: calc(100% - 48px);
    padding: 24px;
    background: #07131c;
    border: 1px solid #9f8d66;
    z-index: 6;
    box-shadow: 0 20px 80px #000;
  }
  .roster-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    position: sticky;
    bottom: -24px;
    background: #07131c;
    padding: 12px 0;
  }
  .system-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 12px;
    flex-shrink: 0;
  }
  .system-details:focus-visible {
    outline: 2px solid #91dcec;
    outline-offset: 2px;
  }
  .system-details {
    overflow: auto;
    min-height: 0;
    flex: 1;
  }
  .system-inspector {
    z-index: 2;
    display: flex;
    flex-direction: column;
    position: absolute;
    right: 24px;
    top: 96px;
    width: 310px;
    max-height: calc(100% - 120px);
    overflow: hidden;
    background: #07131c;
    border: 1px solid #b29e78;
    padding: 24px;
    box-shadow: 0 10px 36px #0008;
  }
  .system-actions :global(button) {
    background: linear-gradient(#163b4a, #0b2431);
    border-color: #8bd8e7;
    color: #effdff;
    flex-shrink: 0;
    min-width: 0;
    padding: 10px 8px;
    margin-top: 0;
  }
  h2 {
    font:
      500 34px "Cormorant Garamond",
      serif;
    margin: 10px 0 16px;
  }
  .system-inspector p {
    font-size: 16px;
    line-height: 1.5;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid #5c687177;
  }
  dd {
    margin: 0;
    color: #9ee9ff;
  }
  .systems-list {
    position: absolute;
    left: 24px;
    bottom: 24px;
    width: 360px;
    max-height: calc(100% - 110px);
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #07131c;
    padding: 20px;
    border: 1px solid #b29e78;
  }
  .list-body {
    overflow: auto;
    min-height: 0;
  }
  .systems-list > :global(button) {
    flex-shrink: 0;
  }
  .system-results {
    margin-top: 12px;
  }
  .system-results :global(button) {
    display: flex;
    width: 100%;
    justify-content: space-between;
    padding: 12px;
    background: transparent;
    border-bottom: 1px solid #33404a;
  }
  .system-results :global(.current-system) {
    border-color: #9ee9ff;
    color: #9ee9ff;
  }
  .list-body :global(:focus-visible) {
    outline: 2px solid #9ee9ff;
    outline-offset: -2px;
  }
  .list-body > label {
    display: block;
    margin-bottom: 12px;
  }
  input {
    min-height: 48px;
    padding: 10px;
    width: 100%;
    background: #101e2a;
    color: inherit;
    border: 1px solid #87919a;
  }
  @media (min-width: 2400px) {
    .contact-panel.history-panel {
      inset: 90px 0 0;
      width: auto;
      padding: 0;
    }
    .history-panel {
      inset: 130px auto 40px 40px;
      width: 900px;
      padding: 32px;
    }
    .systems-list {
      width: 560px;
      font-size: 24px;
    }
    .command-rail {
      min-height: 90px;
      padding: 10px 32px;
      gap: 32px;
    }
    .command-rail h1 {
      font-size: 36px;
    }
    .command-rail > div > span {
      font-size: 18px;
    }
    .command-rail :global(button) {
      font-size: 22px;
      min-height: 64px;
    }
    .chart {
      top: 90px;
    }
    .acknowledgement {
      top: 100px;
      left: 32px;
    }
    .acknowledgement :global(.notice) {
      font-size: 22px !important;
    }
    .system-inspector {
      width: 520px;
      right: 40px;
      top: 130px;
      padding: 32px;
      max-height: calc(100% - 170px);
      font-size: 24px;
    }
    .system-inspector p {
      font-size: 24px;
    }
    .system-inspector .overline {
      font-size: 18px;
    }
    h2 {
      font-size: 48px;
    }
    .system-actions :global(button) {
      font-size: 24px;
      min-height: 68px;
    }
  }
  @media (min-width: 701px) and (max-height: 800px) {
    .system-inspector.active {
      width: 380px;
      top: 80px;
      max-height: calc(100% - 96px);
      padding: 16px;
    }
    .system-inspector.active h2 {
      font-size: 28px;
      margin: 6px 0;
    }
    .system-inspector.active > p {
      font-size: 12px;
      margin: 6px 0;
    }
    .system-inspector.active .system-details :global(.stellar-art) {
      height: 68px;
    }
    .system-inspector.active dl div {
      padding: 8px 0;
    }
    .system-inspector.active .system-actions {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .system-inspector.active .system-actions :global(button) {
      font-size: 14px;
      padding: 8px;
    }
  }
  @media (max-width: 700px) {
    .system-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding-top: 12px;
    }
    .system-actions :global(button) {
      flex: 1;
      min-width: 0;
      padding: 8px;
      font-size: 14px;
      margin-top: 0;
    }
    .galaxy-surface {
      height: 100svh;
      min-height: 0;
    }
    .chart {
      inset: 58px 0 240px;
    }
    .command-rail {
      gap: 4px;
      padding: 4px 8px;
    }
    .command-rail h1 {
      font-size: 20px;
      max-width: 145px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .command-rail > div > span {
      font-size: 10px;
    }
    .command-rail :global(button) {
      padding: 8px;
      font-size: 13px;
      min-width: 48px;
    }
    .campaign-facts {
      display: none;
    }
    .acknowledgement {
      top: 66px;
      left: 12px;
      max-width: calc(100% - 24px);
      font-size: 14px;
    }
    .contact-panel.history-panel {
      inset: 58px 0 0;
      width: auto;
      padding: 0;
    }
    .history-panel {
      inset: 66px 12px 12px;
      width: auto;
      padding: 16px;
    }
    .roster-panel {
      inset: 66px 12px 12px;
      width: auto;
      padding: 16px;
      max-height: none;
    }
    .system-details:focus-visible {
      outline: 2px solid #91dcec;
      outline-offset: 2px;
    }
    .system-details {
      overflow: auto;
      min-height: 0;
      flex: 1;
    }
    .system-inspector {
      display: flex;
      flex-direction: column;
      inset: auto 12px 12px;
      width: auto;
      max-height: 44%;
      padding-bottom: max(16px, env(safe-area-inset-bottom));
      padding: 16px;
    }
    .system-inspector.active,
    .system-inspector.observing {
      height: 70%;
      max-height: 70%;
    }
    .system-inspector > p {
      font-size: 12px;
    }
    .system-inspector p {
      margin: 6px 0;
    }
    .system-actions :global(button) {
      background: linear-gradient(#163b4a, #0b2431);
      border-color: #8bd8e7;
      color: #effdff;
      flex-shrink: 0;
      margin-top: 0;
    }
    h2 {
      font-size: 28px;
      margin: 5px 0;
    }
    .system-inspector dl div {
      padding: 8px 0;
    }
    .systems-list {
      inset: 66px 12px 12px;
      width: auto;
      max-height: none;
      z-index: 6;
    }
    .system-results {
      flex: 1;
    }
  }
  /* Galaxy commands belong to the scene, never to the selected subject. */
  .command-rail {
    gap: 16px;
  }
  .campaign-facts {
    margin-left: auto;
    gap: clamp(16px, 3vw, 60px);
  }
  .campaign-facts span {
    display: grid;
    gap: 2px;
    white-space: nowrap;
    font-size: 11px;
  }
  .campaign-facts strong {
    font-size: 18px;
    color: #e8dcc1;
    font-weight: 400;
  }
  .command-dock {
    position: absolute;
    z-index: 4;
    bottom: max(16px, env(safe-area-inset-bottom));
    left: 24px;
    right: 24px;
    display: flex;
    justify-content: center;
    background: linear-gradient(180deg, #102331ee, #071019f5);
    border: 1px solid #9e8b6555;
    box-shadow: 0 8px 30px #0009;
    padding: 8px;
  }
  .dock-primary {
    display: none;
  }
  .dock-destinations {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .dock-destinations :global(button) {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-color: transparent;
    color: #d9dfdf;
    min-height: 48px;
  }
  .dock-destinations :global(button:hover) {
    border-color: #b8a478;
    background: #203545;
  }
  .system-inspector {
    width: clamp(310px, 26vw, 560px);
    top: 84px;
    bottom: 100px;
    max-height: none;
    padding: 20px;
  }
  .system-inspector:not(.expanded) {
    bottom: auto;
    max-height: calc(100% - 184px);
  }
  .system-inspector h2 {
    margin: 4px 0 12px;
  }
  .system-inspector .overline {
    margin: 0;
  }
  .system-inspector dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .system-inspector dl > div {
    display: grid;
    padding: 10px;
    background: #16303a66;
    border: 1px solid #b7a57333;
  }
  .system-inspector dd {
    margin: 4px 0 0;
  }
  .system-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .system-actions :global(.inspect-system) {
    grid-column: 1 / -1;
    background: linear-gradient(#236c83, #164252);
    border-color: #7cbcca;
    color: #f1f6ef;
  }
  .chart {
    inset: max(58px, var(--command-rail-height)) 19% 80px 0;
  }
  @media (min-width: 2500px) {
    .system-inspector {
      top: 130px;
      bottom: 140px;
      width: 28vw;
      padding: 32px;
    }
    .system-inspector:not(.expanded) {
      max-height: calc(100% - 280px);
    }
    .campaign-facts span {
      font-size: 18px;
    }
    .campaign-facts strong {
      font-size: 30px;
    }
    .command-dock {
      bottom: 24px;
      padding: 16px;
    }
    .dock-destinations :global(button) {
      font-size: 24px;
      min-height: 68px;
      padding-inline: 24px;
    }
    .chart {
      top: max(90px, var(--command-rail-height));
      bottom: 120px;
    }
  }
  @media (max-width: 700px) {
    .command-rail {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 2px 6px;
      padding: 6px 12px;
    }
    .command-rail > div:first-child {
      margin: 0;
      min-width: 0;
    }
    .command-rail .campaign-facts {
      display: flex;
      grid-row: 2;
      grid-column: 1 / -1;
      width: 100%;
      margin: 0;
      justify-content: space-between;
      gap: 12px;
      padding: 7px 0 2px;
    }
    .campaign-facts span {
      font-size: 10px;
    }
    .campaign-facts strong {
      font-size: 15px;
    }
    .command-rail :global(button) {
      padding-inline: 7px;
    }
    .chart {
      inset: max(110px, var(--command-rail-height)) 0 calc(44svh + 82px) 0;
    }
    .before-start .chart {
      top: 58px;
    }
    .before-start .acknowledgement {
      top: 66px;
    }
    .system-inspector,
    .system-inspector:not(.expanded),
    .system-inspector.active,
    .system-inspector.observing {
      inset: auto 8px 74px;
      height: auto;
      max-height: 44%;
      width: auto;
      padding: 12px;
    }
    .system-inspector.expanded,
    .system-inspector.active.expanded {
      top: 114px;
      height: auto;
      max-height: none;
    }
    .before-start .system-inspector.expanded,
    .before-start .system-inspector.active.expanded {
      top: 64px;
    }
    .system-inspector h2 {
      font-size: 24px;
      margin: 0 0 6px;
    }
    .system-inspector .overline {
      font-size: 10px;
    }
    .system-inspector dl {
      margin: 8px 0;
    }
    .system-inspector dl > div {
      padding: 6px;
    }
    .system-inspector:not(.expanded) .system-details :global(.world-art) {
      aspect-ratio: 4;
    }
    .system-inspector:not(.expanded) .system-details > p {
      margin: 4px 0;
      font-size: 12px;
    }
    .system-actions {
      padding-top: 4px;
      gap: 6px;
      grid-template-columns: 1fr 1fr;
    }
    .system-actions :global(button) {
      min-height: 44px;
      font-size: 13px;
    }
    .system-actions :global(.inspect-system) {
      grid-column: auto;
    }
    .command-dock {
      inset: auto 8px max(8px, env(safe-area-inset-bottom));
      padding: 0;
    }
    .dock-primary {
      display: flex;
      width: 100%;
    }
    .dock-primary :global(button) {
      flex: 1;
      min-height: 52px;
    }
    .dock-destinations {
      display: none;
    }
    .dock-destinations.open {
      position: absolute;
      display: grid;
      grid-template-columns: 1fr 1fr;
      bottom: calc(100% + 8px);
      left: 0;
      right: 0;
      max-height: 50svh;
      overflow: auto;
      padding: 12px;
      background: #0b1b27;
      border: 1px solid #b7a573;
      box-shadow: 0 -16px 40px #000a;
    }
    .acknowledgement {
      top: 110px;
    }
  }
  @media (max-width: 700px) {
    .command-dock {
      justify-content: space-around;
    }
    .dock-primary {
      display: contents;
    }
    .dock-primary :global(button) {
      flex: 1;
      font-size: 13px;
    }
    .dock-primary :global(button:last-child) {
      order: 4;
    }
    .dock-destinations {
      display: contents;
    }
    .dock-destinations :global(button) {
      display: none;
    }
    .dock-destinations :global(button[data-focus="economy"]),
    .dock-destinations :global(button[data-focus="conversations"]) {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      padding: 4px;
      font-size: 12px;
      min-height: 52px;
    }
    .dock-destinations :global(button[data-focus="economy"]) {
      order: 1;
    }
    .dock-destinations :global(button[data-focus="conversations"]) {
      order: 2;
    }
    .dock-destinations.open :global(button) {
      display: flex;
      flex-direction: row;
      font-size: 13px;
      order: initial;
    }
  }
  .system-inspector:not(.expanded) dl {
    display: block;
  }
  .system-inspector:not(.expanded) dl > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 0;
    border-bottom: 1px solid #9eabaf44;
    background: transparent;
    padding: 8px 0;
  }
  .system-inspector:not(.expanded) dd {
    margin: 0;
  }
  .system-inspector {
    border-radius: 12px;
  }
  .system-inspector:not(.expanded) .system-actions :global(.inspect-system) {
    grid-column: 1 / -1;
  }
  @media (min-width: 701px) {
    .system-inspector.expanded {
      left: 24px;
      right: 24px;
      width: auto;
    }
    .system-inspector.expanded .system-details {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
      grid-template-rows: auto 1fr;
      gap: 0 28px;
    }
    .system-inspector.expanded .system-actions {
      display: flex;
      justify-content: flex-end;
    }
    .system-inspector.expanded .system-actions :global(button) {
      min-width: 180px;
    }
  }
  @media (max-width: 700px) {
    .system-inspector:not(.expanded) .system-details :global(.world-art img) {
      object-position: center;
    }
    .system-inspector:not(.expanded) .system-actions {
      grid-template-columns: 1fr 1fr;
    }
    .system-inspector:not(.expanded) dl > div {
      padding: 6px 0;
    }
    .system-inspector:not(.expanded) .system-details :global(.world-art) {
      aspect-ratio: 2.3;
    }
  }
  .system-inspector.expanded dd {
    margin: 0;
  }
  .campaign-facts strong {
    font-family: "Cormorant Garamond", serif;
    font-weight: 600;
    font-size: 23px;
  }
  @media (min-width: 701px) {
    .system-inspector.expanded .system-details {
      display: block;
      position: relative;
      isolation: isolate;
    }
  }
  @media (min-width: 2500px) {
    .campaign-facts strong {
      font-size: 36px;
    }
  }
  @media (min-width: 701px) and (max-height: 800px) {
  }
  @media (max-width: 700px) {
    .campaign-facts strong {
      font-size: 20px;
    }
  }
  .system-inspector.expanded .system-details {
    display: block;
    position: relative;
  }
  .system-inspector.expanded {
    padding: 20px;
  }
  .observation-access {
    position: absolute;
    right: 20px;
    top: 16px;
  }
  .observation-access :global(button) {
    min-height: 44px;
    padding: 8px 12px;
  }
  .system-inspector.expanded h2 {
    padding-right: 190px;
  }
  .system-inspector.expanded .system-actions {
    display: flex;
    justify-content: space-between;
    padding-top: 14px;
    gap: 16px;
  }
  .system-actions :global(.view-forces),
  .system-actions :global(.back-to-chart) {
    min-height: 58px;
    min-width: 220px;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 20px;
  }
  .system-actions :global(.view-forces) {
    background: linear-gradient(#286d82, #164352);
  }
  @media (min-width: 2500px) {
    .system-inspector.expanded {
      padding: 32px;
    }
    .system-inspector.expanded h2 {
      font-size: 64px;
      padding-right: 300px;
    }
    .observation-access {
      top: 28px;
      right: 32px;
    }
    .observation-access :global(button) {
      font-size: 28px;
      min-height: 72px;
    }
    .system-actions :global(.view-forces),
    .system-actions :global(.back-to-chart) {
      min-height: 92px;
      min-width: 380px;
      font-size: 34px;
    }
    .system-actions :global(.view-forces svg) {
      width: 44px;
      height: 44px;
    }
  }
  @media (max-width: 700px) {
    .system-inspector.expanded {
      padding: 12px;
    }
    .system-inspector.expanded h2 {
      padding-right: 0;
      font-size: 28px;
      margin-bottom: 6px;
    }
    .observation-access {
      position: static;
      align-self: flex-end;
      margin-top: -6px;
    }
    .observation-access :global(button) {
      font-size: 13px;
      padding: 6px 10px;
    }
    .system-inspector.expanded .system-actions {
      padding-top: 10px;
      gap: 8px;
    }
    .system-actions :global(.view-forces),
    .system-actions :global(.back-to-chart) {
      min-width: 0;
      flex: 1;
      min-height: 50px;
      font-size: 14px;
      padding: 8px;
      gap: 8px;
    }
  }
  .campaign-facts :global(.science-resource) {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px;
    background: #0d2530;
    border: 1px solid #75c9db66;
    color: #a7edf3;
    text-align: left;
  }
  @media (min-width: 2500px) {
    .science-panel {
      top: 114px;
      width: min(900px, calc(100% - 48px));
    }
  }
  @media (max-width: 700px) {
    .science-panel {
      top: 124px;
    }
  }
  .campaign-facts :global(.science-resource span) {
    display: block;
    font-size: 12px;
  }
  .campaign-facts :global(.science-resource strong) {
    display: block;
    font-family: "Atkinson Hyperlegible", sans-serif;
    font-size: 18px;
    font-weight: 400;
    white-space: nowrap;
  }
  .campaign-facts :global(.science-resource small) {
    display: block;
  }
  @media (max-width: 700px) {
    .campaign-facts :global(.science-resource) {
      gap: 6px;
      padding: 2px 6px;
      min-height: 44px;
    }
    .campaign-facts :global(.science-resource svg) {
      width: 20px;
      height: 20px;
    }
    .campaign-facts :global(.science-resource span) {
      font-size: 10px;
    }
    .campaign-facts :global(.science-resource strong) {
      font-size: 15px;
    }
  }
  @media (min-width: 2500px) {
    .campaign-facts :global(.science-resource) {
      padding: 8px 20px;
    }
    .campaign-facts :global(.science-resource span) {
      font-size: 22px;
    }
    .campaign-facts :global(.science-resource strong) {
      font-size: 32px;
    }
  }
  /* Commanders, resources and system instruments share the scene's scale. */
  .command-rail {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    grid-template-rows: auto auto;
    align-items: center;
    padding: 16px 24px;
    gap: 8px 24px;
    background: linear-gradient(180deg, #07131cf5, #07131cdd 80%, #07131c66);
    border-bottom-color: #627d8944;
  }
  .command-rail .commander-presence {
    grid-row: 1 / 3;
    margin: 0;
    min-width: 0;
  }
  .campaign-context {
    min-width: 0;
  }
  .campaign-context h1 {
    overflow-wrap: anywhere;
  }
  .command-rail .campaign-facts {
    grid-column: 2 / -1;
    grid-row: 2;
    margin: 0;
    justify-content: flex-end;
    gap: clamp(24px, 4vw, 100px);
  }
  .command-rail :global(.roster-access),
  .command-rail :global(.campaigns-access) {
    grid-row: 1;
  }
  .command-rail :global(.roster-access) {
    grid-column: 3;
  }
  .command-rail :global(.campaigns-access) {
    grid-column: 4;
  }
  .chart {
    inset: var(--command-rail-height) 29% 112px 0;
  }
  .system-inspector,
  .system-inspector.active,
  .system-inspector.expanded {
    top: calc(var(--command-rail-height) + 8px);
  }
  .system-inspector:not(.expanded) {
    width: clamp(330px, 28vw, 1080px);
    max-height: calc(100% - var(--command-rail-height) - 128px);
    padding: 20px;
    border-color: #9eb9c077;
    background: linear-gradient(145deg, #182b36ef, #07131cf5);
  }
  .system-inspector:not(.expanded) .system-details :global(.world-art) {
    aspect-ratio: 1.45;
    margin: 0 0 12px;
    border-radius: 0;
  }
  .acknowledgement {
    top: calc(var(--command-rail-height) + 8px);
  }
  .command-dock {
    width: calc(100% - 48px);
    max-width: calc(100% - 48px);
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    padding: 8px;
    border-radius: 12px;
  }
  .dock-destinations {
    flex: 1;
    flex-wrap: nowrap;
    gap: 12px;
  }
  .dock-destinations :global(.command-control) {
    flex: 1;
    background: linear-gradient(165deg, #1b2c38ee, #08121dec 72%);
    border-color: #96a3ad77;
    min-height: 64px;
  }
  .dock-destinations :global(.command-control.current) {
    border-color: #84e4f4;
    background: linear-gradient(#214559, #071822);
  }
  @media (min-width: 2500px) {
    .command-rail {
      padding: 28px 48px;
      gap: 16px 48px;
    }
    .command-rail h1 {
      font-size: 44px;
    }
    .command-rail > .campaign-context > span {
      font-size: 22px;
    }
    .command-rail :global(.roster-access),
    .command-rail :global(.campaigns-access) {
      font-size: 26px;
      min-height: 64px;
    }
    .chart {
      bottom: 156px;
    }
    .system-inspector:not(.expanded) {
      padding: 32px;
      max-height: calc(100% - var(--command-rail-height) - 192px);
    }
    .system-inspector:not(.expanded) .system-details :global(.world-art) {
      margin-inline: 0;
      aspect-ratio: 1.45;
    }
    .dock-destinations {
      gap: 24px;
    }
    .dock-destinations :global(.command-control) {
      min-height: 112px;
      font-size: 36px;
    }
    .dock-destinations :global(.command-control svg) {
      width: 56px;
      height: 56px;
    }
  }
  @media (min-width: 701px) and (max-height: 800px) {
    .command-rail {
      padding: 10px 20px;
      gap: 6px 16px;
    }
    .system-inspector:not(.expanded) .system-details :global(.world-art) {
      aspect-ratio: 3;
    }
    .chart {
      bottom: 100px;
    }
    .dock-destinations {
      gap: 6px;
    }
    .dock-destinations :global(.command-control) {
      padding-inline: 12px;
    }
  }
  @media (max-width: 700px) {
    .command-rail {
      grid-template-columns: 48px minmax(0, 1fr) auto auto;
      padding: 8px 12px;
      gap: 4px 8px;
    }
    .command-rail .commander-presence {
      grid-row: 1;
    }
    .command-rail h1 {
      font-size: 20px;
    }
    .command-rail > .campaign-context > span {
      font-size: 10px;
    }
    .command-rail .campaign-facts {
      grid-column: 1 / -1;
      justify-content: space-between;
      gap: 8px;
      padding-top: 4px;
    }
    .chart {
      inset: var(--command-rail-height) 0 calc(44svh + 82px) 0;
    }
    .system-inspector:not(.expanded) {
      inset: auto 8px 74px;
      width: auto;
      max-height: 44%;
      padding: 12px;
    }
    .system-inspector:not(.expanded) .system-details :global(.world-art) {
      margin: 0 0 6px;
      aspect-ratio: 2.5;
    }
    .system-inspector.expanded,
    .system-inspector.active.expanded {
      top: calc(var(--command-rail-height) + 8px);
    }
    .command-dock {
      width: auto;
      max-width: none;
      inset: auto 8px max(8px, env(safe-area-inset-bottom));
      transform: none;
      padding: 0;
    }
    .dock-destinations :global(.command-control) {
      min-height: 52px;
      border: 0;
      border-radius: 0;
    }
  }
</style>
