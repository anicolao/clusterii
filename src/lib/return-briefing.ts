import type { CampaignView } from "@shared/campaign";
export type BriefingCategory =
  | "Control"
  | "Arrivals and losses"
  | "Research"
  | "Economy"
  | "Messages";
export interface BriefingEvent {
  id: string;
  category: BriefingCategory;
  title: string;
  detail: string;
  tick: number;
  destination: "system" | "arrivals" | "economy" | "conversations";
  starId?: string;
  roomId?: string;
}
export function returnBriefing(
  snapshot: CampaignView,
  records: CampaignView[],
) {
  const checkpoint = snapshot.lastVisit;
  const ordered = [
    ...new Map(
      [...records, snapshot]
        .filter((r) => r.id === snapshot.id && r.revision <= snapshot.revision)
        .map((r) => [r.revision, r]),
    ).values(),
  ].sort((a, b) => a.revision - b.revision);
  const baseline = checkpoint
    ? ordered.find((r) => r.revision === checkpoint.revision)
    : undefined;
  const period = checkpoint
    ? ordered.filter((record) => record.revision >= checkpoint.revision)
    : [];
  const complete =
    !!baseline &&
    !!checkpoint &&
    period.length === snapshot.revision - checkpoint.revision + 1 &&
    period.every(
      (record, index) => record.revision === checkpoint.revision + index,
    );
  const events = new Map<string, BriefingEvent>();
  const knownMessages = new Set<string>();
  for (const room of baseline?.conversations ?? []) {
    if (room.message) knownMessages.add(room.message.id);
    for (const message of room.sharedMessages ?? [])
      knownMessages.add(message.id);
  }
  const knownConstruction = new Set(
    baseline?.construction?.ledger.map((event) => event.id) ?? [],
  );
  let previous = baseline;
  // No claims about change are made until the exact authorized baseline is recovered.
  if (complete && baseline && checkpoint)
    for (const record of ordered.filter(
      (r) => r.revision > checkpoint.revision,
    )) {
      const tick = record.production?.tick ?? 0;
      const name = (id: string) =>
        record.stars.find((s) => s.id === id)?.name ?? id;
      const before = new Map(previous?.holdings.map((h) => [h.starId, h]));
      const after = new Map(record.holdings.map((h) => [h.starId, h]));
      for (const starId of new Set([...before.keys(), ...after.keys()]))
        for (const layer of ["orbit", "surface"] as const) {
          const was = before.get(starId)?.[layer] === "You",
            now = after.get(starId)?.[layer] === "You";
          if (was !== now) {
            const id = `control:${record.revision}:${starId}:${layer}`;
            events.set(id, {
              id,
              category: "Control",
              title: `${name(starId)} · ${layer} ${now ? "gained" : "lost"}`,
              detail:
                "Recorded control change. Inspect your current authorized knowledge.",
              tick,
              destination: "system",
              starId,
            });
          }
        }
      for (const arrival of record.military?.arrivals ?? [])
        if (arrival.tick > checkpoint.tick) {
          const id = `arrival:${arrival.tick}:${arrival.starId}`;
          if (!events.has(id))
            events.set(id, {
              id,
              category: "Arrivals and losses",
              title: `${name(arrival.starId)} · ${arrival.contested ? "combat settled" : "arrival settled"}`,
              detail: `${arrival.fightersBefore - arrival.fightersAfter} fighter losses · ${arrival.infantryBefore - arrival.infantryAfter} infantry losses. Open the authorized report for combat and control details.`,
              tick: arrival.tick,
              destination: "arrivals",
              starId: arrival.starId,
            });
        }
      for (const outcome of record.construction?.ledger ?? [])
        if (!knownConstruction.has(outcome.id)) {
          knownConstruction.add(outcome.id);
          const id = `construction:${outcome.id}`;
          events.set(id, {
            id,
            category: outcome.result === "captured" ? "Control" : "Economy",
            title: `${name(outcome.starId)} · ${outcome.type} ${outcome.result === "invalid" ? "could not complete" : outcome.result}`,
            detail: `${outcome.refundMilli / 1000} credits refunded. Inspect the system’s current development state.`,
            tick,
            destination: "system",
            starId: outcome.starId,
          });
        }
      if (previous?.economy && record.economy)
        for (const [technology, level] of Object.entries(
          record.economy.research.levels,
        )) {
          const old =
            previous.economy.research.levels[
              technology as keyof typeof previous.economy.research.levels
            ];
          if (level > old) {
            const id = `research:${technology}:${level}`;
            events.set(id, {
              id,
              category: "Research",
              title: `${technology} reached level ${level}`,
              detail: `Previously level ${old}.`,
              tick,
              destination: "economy",
            });
          }
        }
      if (tick > checkpoint.tick && record.economy?.ledger) {
        const id = `economy:${tick}`,
          ledger = record.economy.ledger;
        if (!events.has(id))
          events.set(id, {
            id,
            category: "Economy",
            title: `Tick ${tick} production`,
            detail: `${ledger.creditsMilli / 1000} credits · ${ledger.scienceMilli / 1000} science · ${ledger.fighters} fighters · ${ledger.infantry} infantry.`,
            tick,
            destination: "economy",
          });
      }
      const own = record.roster.findIndex(
        (r) => r.faction === record.own.faction,
      );
      for (const room of record.conversations ?? [])
        for (const message of [room.message, ...(room.sharedMessages ?? [])])
          if (message && !knownMessages.has(message.id)) {
            knownMessages.add(message.id);
            if (message.author === own) continue;
            const id = `message:${message.id}`;
            events.set(id, {
              id,
              category: "Messages",
              title: `${room.title} · Message ${message.sequence}`,
              detail: `Received from ${record.roster[message.author]?.alias}. Message contents remain in your authorized conversation history.`,
              tick,
              destination: "conversations",
              roomId: room.id,
            });
          }
      previous = record;
    }
  return {
    complete,
    checkpoint,
    throughRevision: snapshot.revision,
    latestTick: snapshot.production?.tick ?? 0,
    events: [...events.values()],
    loaded: ordered.length,
  };
}
