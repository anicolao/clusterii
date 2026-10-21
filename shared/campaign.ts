import type { VisitAction, VisitCheckpoint } from "./briefing.js";
import {
  admitBuild,
  admitCancellation,
  type Construction,
  type Development,
  developments,
} from "./construction.js";
import {
  type ConversationAction,
  conversationView,
  type Diplomacy,
} from "./conversations.js";
import { type FleetScans, fleetContactView } from "./fleet-contacts.js";
import { type FleetAction, type Military, militaryView } from "./fleets.js";
import { type Galaxy, generateGalaxy } from "./galaxy.js";
import {
  type Allocation,
  admitFocus,
  initialFocus,
  validAllocation,
} from "./market-focus.js";
import { type Intelligence, observationView } from "./observations.js";
import {
  type Economy,
  initialEconomy,
  type Technology,
  technologies,
} from "./production.js";
import { type Portrait, type Profile, portraits } from "./profile.js";
import { type FactionId, faction, rules } from "./rules.js";
import type { TravelAction } from "./travel.js";
export interface Seat {
  uid: string;
  profile: Profile;
  faction: FactionId;
  joinedAt: number;
  home: string | null;
}
export interface SystemState {
  orbit: string | null;
  surface: string | null;
  fighters: number;
  infantry: number;
  markets: number;
  camps: number;
  bases: number;
  stations: number;
  escrowMilli: number;
}
export interface EmpireState {
  creditsMilli: number;
}
export interface Campaign {
  id: string;
  name: string;
  capacity: number;
  revision: number;
  rulesetVersion: string;
  schemaVersion: 1 | 2;
  economy?: Economy;
  construction?: Construction;
  military?: Military;
  briefingVersion?: 1;
  visits?: Record<string, VisitCheckpoint>;
  conversationsVersion?: 1;
  conversationSharingVersion?: 1;
  diplomacy?: Diplomacy;
  travelVersion?: 1;
  fleetContactsVersion?: 1;
  fleetScans?: FleetScans;
  intelligenceVersion?: 1;
  intelligence?: Intelligence;
  commandProtocolVersion: 1;
  development: true;
  mode: "mock" | "real";
  mockExposed: boolean;
  encryptionEpoch: number;
  createdAt: number;
  startAt: number | null;
  pausedAt?: number | null;
  phase: "waiting" | "scheduled" | "active";
  seed: string;
  galaxy: Galaxy;
  seats: Seat[];
  systems: Record<string, SystemState>;
  empires: Record<string, EmpireState>;
}
export type MigrationAction = {
  kind: "campaign.migrate";
  expectedRevision: number;
  targetMode: "mock" | "real";
};
export type CampaignAction =
  | VisitAction
  | ConversationAction
  | TravelAction
  | FleetAction
  | MigrationAction
  | { kind: "market.focus"; expectedRevision: number; allocation: Allocation }
  | {
      kind: "construction.build";
      expectedRevision: number;
      starId: string;
      type: Development;
    }
  | { kind: "construction.cancel"; expectedRevision: number; orderId: string }
  | { kind: "research.select"; expectedRevision: number; target: Technology }
  | {
      kind: "campaign.create";
      expectedRevision: 0;
      name: string;
      capacity: number;
      mode: "mock" | "real";
      development: true;
    }
  | {
      kind: "campaign.join";
      expectedRevision: number;
      faction: FactionId;
      portrait?: Portrait;
    }
  | {
      kind: "campaign.leave" | "campaign.pause" | "campaign.resume";
      expectedRevision: number;
    };
export function parseCampaignAction(input: unknown): CampaignAction {
  if (!input || typeof input !== "object") throw new Error("invalid");
  const a = input as CampaignAction;
  if (!Number.isSafeInteger(a.expectedRevision) || a.expectedRevision < 0)
    throw new Error("invalid");
  const fields =
    a.kind === "market.focus"
      ? ["kind", "expectedRevision", "allocation"]
      : a.kind === "construction.build"
        ? ["kind", "expectedRevision", "starId", "type"]
        : a.kind === "construction.cancel"
          ? ["kind", "expectedRevision", "orderId"]
          : a.kind === "campaign.create"
            ? [
                "kind",
                "expectedRevision",
                "name",
                "capacity",
                "mode",
                "development",
              ]
            : a.kind === "research.select"
              ? ["kind", "expectedRevision", "target"]
              : a.kind === "campaign.migrate"
                ? ["kind", "expectedRevision", "targetMode"]
                : a.kind === "campaign.join"
                  ? ["kind", "expectedRevision", "faction", "portrait"]
                  : ["kind", "expectedRevision"];
  if (Object.keys(a).some((key) => !fields.includes(key)))
    throw new Error("invalid");
  if (a.kind === "campaign.create") {
    if (
      a.expectedRevision !== 0 ||
      typeof a.name !== "string" ||
      [...a.name.trim()].length < 2 ||
      [...a.name.trim()].length > 40 ||
      /[\p{C}]/u.test(a.name) ||
      !rules.playerCounts.includes(a.capacity) ||
      (a.mode !== "mock" && a.mode !== "real") ||
      a.development !== true
    )
      throw new Error("invalid");
  } else if (a.kind === "market.focus") {
    if (!validAllocation(a.allocation)) throw new Error("invalid");
  } else if (a.kind === "construction.build") {
    if (
      typeof a.starId !== "string" ||
      a.starId.length > 100 ||
      !developments.includes(a.type)
    )
      throw new Error("invalid");
  } else if (a.kind === "construction.cancel") {
    if (typeof a.orderId !== "string" || !/^[a-f0-9-]{36}$/.test(a.orderId))
      throw new Error("invalid");
  } else if (a.kind === "research.select") {
    if (!technologies.includes(a.target)) throw new Error("invalid");
  } else if (a.kind === "campaign.migrate") {
    if (a.targetMode !== "mock" && a.targetMode !== "real")
      throw new Error("invalid");
  } else if (a.kind === "campaign.join") {
    if (
      (a.portrait !== undefined && !portraits.includes(a.portrait)) ||
      !rules.factions.some((f) => f.id === a.faction)
    )
      throw new Error("invalid");
  } else if (
    !["campaign.leave", "campaign.pause", "campaign.resume"].includes(a.kind)
  )
    throw new Error("invalid");
  return a;
}
export function createCampaign(
  id: string,
  input: unknown,
  seed: string,
  now: number,
): Campaign {
  const action = parseCampaignAction(input);
  if (action.kind !== "campaign.create") throw new Error("invalid");
  return {
    id,
    name: action.name.normalize("NFC").trim(),
    capacity: action.capacity,
    revision: 1,
    rulesetVersion: rules.id,
    schemaVersion: 2,
    briefingVersion: 1,
    conversationsVersion: 1,
    conversationSharingVersion: 1,
    diplomacy: { rooms: {} },
    travelVersion: 1,
    fleetContactsVersion: 1,
    intelligenceVersion: 1,
    commandProtocolVersion: 1,
    development: true,
    mode: action.mode,
    mockExposed: action.mode === "mock",
    encryptionEpoch: 1,
    pausedAt: null,
    createdAt: now,
    startAt: null,
    phase: "waiting",
    seed,
    galaxy: generateGalaxy(action.capacity, seed),
    seats: [],
    systems: {},
    empires: {},
  };
}
export function joinOrLeave(
  current: Campaign,
  input: unknown,
  uid: string,
  profile: Profile,
  now: number,
): Campaign {
  const a = parseCampaignAction(input);
  if (a.kind === "campaign.create") throw new Error("exists");
  if (a.kind !== "campaign.join" && a.kind !== "campaign.leave")
    throw new Error("invalid");
  if (current.pausedAt != null) throw new Error("paused");
  if (
    current.phase === "active" ||
    (current.startAt !== null && now >= current.startAt)
  )
    throw new Error("started");
  const existing = current.seats.find((seat) => seat.uid === uid);
  if (a.kind === "campaign.join" && existing?.faction === a.faction)
    return current;
  if (a.kind === "campaign.leave" && !existing) return current;
  if (a.expectedRevision !== current.revision) throw new Error("conflict");
  if (a.kind === "campaign.join") {
    if (existing) throw new Error("already-joined");
    if (
      current.seats.length >= current.capacity ||
      current.seats.filter((s) => s.faction === a.faction).length >=
        current.capacity / 4
    )
      throw new Error("full");
  }
  const seats =
    a.kind === "campaign.join"
      ? [
          ...current.seats,
          {
            uid,
            profile: { ...profile, portrait: a.portrait ?? profile.portrait },
            faction: a.faction,
            joinedAt: now,
            home: null,
          },
        ]
      : current.seats.filter((s) => s.uid !== uid);
  const full = seats.length === current.capacity;
  return {
    ...current,
    seats,
    revision: current.revision + 1,
    phase: full ? "scheduled" : "waiting",
    startAt: full
      ? (Math.floor(now / (rules.tickSeconds * 1000)) + 1) *
        rules.tickSeconds *
        1000
      : null,
  };
}
export function maintainCampaign(
  current: Campaign,
  input: unknown,
  uid: string,
  now: number,
): Campaign {
  const action = parseCampaignAction(input);
  if (action.kind !== "campaign.pause" && action.kind !== "campaign.resume")
    throw new Error("invalid");
  if (!current.development || !current.seats.some((seat) => seat.uid === uid))
    throw new Error("permission");
  if (action.expectedRevision !== current.revision) throw new Error("conflict");
  const paused = current.pausedAt != null;
  if ((action.kind === "campaign.pause") === paused) return current;
  if (action.kind === "campaign.pause")
    return { ...current, pausedAt: now, revision: current.revision + 1 };
  const delay = Math.max(0, now - (current.pausedAt ?? now));
  return {
    ...current,
    pausedAt: null,
    ...(current.economy
      ? {
          economy: {
            ...current.economy,
            nextTickAt: current.economy.nextTickAt + delay,
          },
        }
      : {}),
    revision: current.revision + 1,
    startAt:
      current.phase === "scheduled" && current.startAt != null
        ? current.startAt + delay
        : current.startAt,
  };
}
export function activateEncryptionEpoch(
  current: Campaign,
  targetMode: "mock" | "real",
  targetEpoch: number,
  uid: string,
  now: number,
): Campaign {
  if (current.pausedAt == null) throw new Error("pause-required");
  if (
    !Number.isSafeInteger(targetEpoch) ||
    targetEpoch <= current.encryptionEpoch ||
    targetMode === current.mode ||
    (targetMode !== "mock" && targetMode !== "real")
  )
    throw new Error("invalid");
  const resumed = maintainCampaign(
    current,
    { kind: "campaign.resume", expectedRevision: current.revision },
    uid,
    now,
  );
  return {
    ...resumed,
    mode: targetMode,
    encryptionEpoch: targetEpoch,
    mockExposed:
      current.mockExposed || current.mode === "mock" || targetMode === "mock",
  };
}
export function startCampaign(current: Campaign, now: number): Campaign {
  if (
    current.pausedAt != null ||
    current.phase !== "scheduled" ||
    current.startAt === null ||
    now < current.startAt
  )
    return current;
  const available = [...current.galaxy.homes];
  const seats = current.seats.map((seat) => {
    const index = available.findIndex(
      (id) =>
        current.galaxy.stars.find((s) => s.id === id)?.class ===
        faction(seat.faction).homeClass,
    );
    if (index < 0) throw new Error("No fair home available");
    const [home] = available.splice(index, 1);
    return { ...seat, home };
  });
  const systems: Record<string, SystemState> = Object.fromEntries(
    current.galaxy.stars.map((star) => [
      star.id,
      {
        orbit: null,
        surface: null,
        fighters: 0,
        infantry: 0,
        markets: 0,
        camps: 0,
        bases: 0,
        stations: 0,
        escrowMilli: 0,
      },
    ]),
  );
  const empires: Record<string, EmpireState> = {};
  for (const seat of seats) {
    if (!seat.home) throw new Error("Home allocation failed");
    systems[seat.home] = {
      orbit: seat.uid,
      surface: seat.uid,
      fighters: rules.startingAssets.fighters,
      infantry: rules.startingAssets.infantry,
      markets: rules.startingAssets.markets,
      camps: rules.startingAssets.camps,
      bases: rules.startingAssets.bases,
      stations: rules.startingAssets.stations,
      escrowMilli: 0,
    };
    empires[seat.uid] = { creditsMilli: rules.startingAssets.credits * 1000 };
  }
  const active: Campaign = {
    ...current,
    seats,
    systems,
    empires,
    phase: "active",
    revision: current.revision + 1,
  };
  if (active.schemaVersion === 2)
    active.economy = initialEconomy(
      active,
      current.startAt + rules.tickSeconds * 1000,
    );
  if (active.briefingVersion === 1)
    active.visits = Object.fromEntries(
      active.seats.map((seat) => [
        seat.uid,
        { revision: active.revision, tick: 0, at: now },
      ]),
    );
  return active;
}
export function campaignDirectory(state: Campaign) {
  return {
    id: state.id,
    name: state.name,
    capacity: state.capacity,
    revision: state.revision,
    phase: state.phase,
    startAt: state.startAt,
    pausedAt: state.pausedAt ?? null,
    rulesetVersion: state.rulesetVersion,
    development: true,
    mode: state.mode,
    encryptionEpoch: state.encryptionEpoch,
    mockExposed: state.mockExposed,
    productionEnabled: state.schemaVersion === 2,
    production: state.economy
      ? { tick: state.economy.tick, nextTickAt: state.economy.nextTickAt }
      : null,
    migration: null as null | {
      state: string;
      verified: number;
      targetMode: "mock" | "real";
    },
    roster: state.seats.map((seat) => ({
      alias: seat.profile.alias,
      portrait: seat.profile.portrait,
      faction: seat.faction,
    })),
  };
}
export function campaignView(state: Campaign, uid: string) {
  const own = state.seats.find((seat) => seat.uid === uid);
  if (!own) throw new Error("not-member");
  return {
    ...campaignDirectory(state),
    stars: state.galaxy.stars,
    own: { faction: own.faction, home: own.home, profile: own.profile },
    empire: state.empires[uid] ?? null,
    economy: state.economy
      ? {
          research: state.economy.research[uid],
          marketFocus: state.economy.marketFocus?.[uid] ?? initialFocus(),
          ledger: state.economy.ledger[uid] ?? null,
        }
      : null,
    military: militaryView(state, uid),
    briefingEnabled: state.briefingVersion === 1,
    lastVisit: state.visits?.[uid] ?? null,
    conversationsEnabled: state.conversationsVersion === 1,
    conversations: conversationView(state, uid),
    travelEnabled: state.travelVersion === 1,
    fleetContactsEnabled: state.fleetContactsVersion === 1,
    fleetContacts: fleetContactView(state, uid),
    observations: observationView(state, uid),
    scanningEnabled:
      state.schemaVersion === 2 && state.intelligenceVersion === 1,
    construction: state.construction
      ? {
          orders: state.construction.orders.filter(
            (o) =>
              o.uid === uid &&
              state.systems[o.starId][
                rules.developments[o.type].layer as "orbit" | "surface"
              ] === uid,
          ),
          cancellations: state.construction.cancellations.filter(
            (c) => c.uid === uid,
          ),
          ledger: state.construction.ledger[uid] ?? [],
        }
      : null,
    holdings: Object.entries(state.systems)
      .filter(([, system]) => system.orbit === uid || system.surface === uid)
      .map(([starId, system]) => ({
        starId,
        ...(system.orbit === uid
          ? {
              fighters: system.fighters,
              camps: system.camps,
              stations: system.stations,
            }
          : {}),
        ...(system.surface === uid
          ? {
              infantry: system.infantry,
              markets: system.markets,
              bases: system.bases,
            }
          : {}),
        ...(system.orbit === uid && system.surface === uid
          ? {
              escrowMilli: system.escrowMilli,
            }
          : {}),
        orbit: system.orbit === uid ? "You" : "Unknown",
        surface: system.surface === uid ? "You" : "Unknown",
      })),
  };
}
export type CampaignDirectory = ReturnType<typeof campaignDirectory>;
export type CampaignView = ReturnType<typeof campaignView>;

export function selectResearch(
  current: Campaign,
  input: unknown,
  uid: string,
  commandId: string,
  now: number,
): Campaign {
  const action = parseCampaignAction(input);
  if (action.kind !== "research.select") throw new Error("invalid");
  if (!current.seats.some((seat) => seat.uid === uid))
    throw new Error("permission");
  if (current.revision !== action.expectedRevision) throw new Error("conflict");
  if (current.pausedAt != null) throw new Error("paused");
  if (
    current.phase !== "active" ||
    current.schemaVersion !== 2 ||
    !current.economy
  )
    throw new Error("research-unavailable");
  const next = structuredClone(current),
    economy = next.economy;
  if (!economy) throw new Error("research-unavailable");
  const research = economy.research[uid];
  if (!research) throw new Error("research-unavailable");
  // A bounded admission budget protects the encrypted state document. It does
  // not drop or replace previously accepted orders; retry after settlement.
  if ((research.orders?.length ?? 0) >= 64)
    throw new Error("research-queue-full");
  const effectiveTick =
    economy.tick +
    1 +
    (now < economy.nextTickAt
      ? 0
      : Math.floor((now - economy.nextTickAt) / (rules.tickSeconds * 1000)) +
        1);
  next.revision++;
  research.orders ??= [];
  research.orders.push({
    id: commandId,
    sequence: next.revision,
    effectiveTick,
    target: action.target,
  });
  return next;
}

export function orderConstruction(
  current: Campaign,
  input: unknown,
  uid: string,
  commandId: string,
  now: number,
): Campaign {
  const action = parseCampaignAction(input);
  if (
    action.kind !== "construction.build" &&
    action.kind !== "construction.cancel"
  )
    throw new Error("invalid");
  if (!current.seats.some((s) => s.uid === uid)) throw new Error("permission");
  if (current.revision !== action.expectedRevision) throw new Error("conflict");
  if (current.pausedAt != null) throw new Error("paused");
  if (
    current.phase !== "active" ||
    current.schemaVersion !== 2 ||
    !current.economy
  )
    throw new Error("construction-unavailable");
  const next = structuredClone(current);
  next.revision++;
  if (action.kind === "construction.build")
    admitBuild(
      next,
      uid,
      commandId,
      next.revision,
      now,
      action.starId,
      action.type,
    );
  else
    admitCancellation(next, uid, commandId, next.revision, now, action.orderId);
  return next;
}

export function selectMarketFocus(
  current: Campaign,
  input: unknown,
  uid: string,
  commandId: string,
  now: number,
): Campaign {
  const action = parseCampaignAction(input);
  if (action.kind !== "market.focus") throw new Error("invalid");
  if (!current.seats.some((seat) => seat.uid === uid))
    throw new Error("permission");
  if (current.revision !== action.expectedRevision) throw new Error("conflict");
  if (current.pausedAt != null) throw new Error("paused");
  if (
    current.phase !== "active" ||
    current.schemaVersion !== 2 ||
    !current.economy
  )
    throw new Error("focus-unavailable");
  const next = structuredClone(current);
  next.revision++;
  admitFocus(next, uid, commandId, action.allocation, now);
  return next;
}
