import { type Galaxy, generateGalaxy } from "./galaxy.js";
import { type Portrait, type Profile, portraits } from "./profile.js";
import { type FactionId, faction, rules } from "./rules.js";
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
  schemaVersion: 1;
  commandProtocolVersion: 1;
  development: true;
  mode: "mock" | "real";
  mockExposed: boolean;
  encryptionEpoch: 1;
  createdAt: number;
  startAt: number | null;
  phase: "waiting" | "scheduled" | "active";
  seed: string;
  galaxy: Galaxy;
  seats: Seat[];
  systems: Record<string, SystemState>;
  empires: Record<string, EmpireState>;
}
export type CampaignAction =
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
  | { kind: "campaign.leave"; expectedRevision: number };
export function parseCampaignAction(input: unknown): CampaignAction {
  if (!input || typeof input !== "object") throw new Error("invalid");
  const a = input as CampaignAction;
  if (!Number.isSafeInteger(a.expectedRevision) || a.expectedRevision < 0)
    throw new Error("invalid");
  const fields =
    a.kind === "campaign.create"
      ? ["kind", "expectedRevision", "name", "capacity", "mode", "development"]
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
  } else if (a.kind === "campaign.join") {
    if (
      (a.portrait !== undefined && !portraits.includes(a.portrait)) ||
      !rules.factions.some((f) => f.id === a.faction)
    )
      throw new Error("invalid");
  } else if (a.kind !== "campaign.leave") throw new Error("invalid");
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
    schemaVersion: 1,
    commandProtocolVersion: 1,
    development: true,
    mode: action.mode,
    mockExposed: action.mode === "mock",
    encryptionEpoch: 1,
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
export function startCampaign(current: Campaign, now: number): Campaign {
  if (
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
  return {
    ...current,
    seats,
    systems,
    empires,
    phase: "active",
    revision: current.revision + 1,
  };
}
export function campaignDirectory(state: Campaign) {
  return {
    id: state.id,
    name: state.name,
    capacity: state.capacity,
    revision: state.revision,
    phase: state.phase,
    startAt: state.startAt,
    rulesetVersion: state.rulesetVersion,
    development: true,
    mode: state.mode,
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
