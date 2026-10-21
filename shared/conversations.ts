import type { Campaign } from "./campaign.js";

export interface ConversationMessage {
  id: string;
  sequence: number;
  author: string;
  body: string;
  at: number;
  keyVersion: number;
  recipients: string[];
}
export const maximumSharedMessages = 8;
export interface MessageReference {
  id: string;
  revision: number;
}
export interface SharedHistoryMessage extends ConversationMessage {
  sourceRevision: number;
}
export interface ConversationMessageView {
  id: string;
  sequence: number;
  author: number;
  body: string;
  at: number;
  keyVersion: number;
  sourceRevision?: number;
  sharedAt?: number;
  sharedBy?: number;
}
export interface Conversation {
  id: string;
  title: string;
  creator: string;
  revision: number;
  keyVersion: number;
  sequence: number;
  closed: boolean;
  members: string[];
  invitations: string[];
  invitationHistory?: Record<string, SharedHistoryMessage[]>;
  invitationIds?: Record<string, string>;
  sharing?: {
    id: string;
    recipient: string;
    at: number;
    messages: SharedHistoryMessage[];
  };
  lastReceived: Record<string, number>;
  readThrough: Record<string, number>;
  // Earlier messages remain in immutable encrypted recipient history. Keeping
  // one current event bounds active state independently of conversation length.
  message?: ConversationMessage;
}
export interface Diplomacy {
  rooms: Record<string, Conversation>;
}
export type ConversationAction =
  | { kind: "conversation.create"; expectedRevision: number; title: string }
  | {
      kind: "conversation.invite" | "conversation.remove";
      expectedRevision: number;
      roomId: string;
      roomRevision: number;
      seat: number;
      scope?: "future" | "selected";
      history?: MessageReference[];
    }
  | {
      kind:
        | "conversation.accept"
        | "conversation.decline"
        | "conversation.leave"
        | "conversation.close";
      expectedRevision: number;
      roomId: string;
      roomRevision: number;
      historyConsent?: string;
    }
  | {
      kind: "conversation.send";
      expectedRevision: number;
      roomId: string;
      keyVersion: number;
      body: string;
    }
  | {
      kind: "conversation.read";
      expectedRevision: number;
      roomId: string;
      keyVersion: number;
      sequence: number;
    };

function text(value: unknown, limit: number, multiline = false) {
  if (typeof value !== "string") throw new Error("conversation-invalid");
  const result = value.trim();
  if (
    !result ||
    [...result].length > limit ||
    [...result].some((char) => {
      const code = char.charCodeAt(0);
      return (
        code < 32 && !(multiline && (code === 9 || code === 10 || code === 13))
      );
    })
  )
    throw new Error("conversation-invalid");
  return result;
}
export function converse(
  current: Campaign,
  raw: unknown,
  uid: string,
  commandId: string,
  now: number,
  resolvedHistory: SharedHistoryMessage[] = [],
): Campaign {
  if (current.conversationsVersion !== 1)
    throw new Error("conversation-unavailable");
  if (!current.seats.some((s) => s.uid === uid)) throw new Error("permission");
  if (current.phase !== "active") throw new Error("not-active");
  if (current.pausedAt != null) throw new Error("paused");
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("conversation-invalid");
  const action = raw as ConversationAction;
  if (
    !Number.isSafeInteger(action.expectedRevision) ||
    action.expectedRevision < 1 ||
    action.expectedRevision > current.revision
  )
    throw new Error("conversation-invalid");
  const next = structuredClone(current);
  next.diplomacy ??= { rooms: {} };
  const rooms = next.diplomacy.rooms;
  if (action.kind === "conversation.create") {
    if (Object.values(rooms).filter((r) => r.creator === uid).length >= 4)
      throw new Error("conversation-limit");
    const id = `room:${commandId}`;
    if (rooms[id]) throw new Error("conflict");
    rooms[id] = {
      id,
      title: text(action.title, 60),
      creator: uid,
      revision: 1,
      keyVersion: 1,
      sequence: 0,
      closed: false,
      members: [uid],
      invitations: [],
      lastReceived: { [uid]: 0 },
      readThrough: { [uid]: 0 },
    };
  } else {
    const room = rooms[action.roomId];
    if (
      !room ||
      (!room.members.includes(uid) && !room.invitations.includes(uid))
    )
      throw new Error("permission");
    if (room.closed && action.kind !== "conversation.read")
      throw new Error("conversation-closed");
    if (
      action.kind === "conversation.send" ||
      action.kind === "conversation.read"
    ) {
      if (!room.members.includes(uid)) throw new Error("permission");
      if (action.keyVersion !== room.keyVersion) throw new Error("conflict");
      if (action.kind === "conversation.send") {
        room.sequence++;
        room.message = {
          id: commandId,
          sequence: room.sequence,
          author: uid,
          body: text(action.body, 2000, true),
          at: now,
          keyVersion: room.keyVersion,
          recipients: [...room.members],
        };
        for (const member of room.members)
          if (member !== uid) room.lastReceived[member] = room.sequence;
      } else {
        if (
          !Number.isSafeInteger(action.sequence) ||
          action.sequence < 0 ||
          action.sequence > room.sequence
        )
          throw new Error("conversation-invalid");
        room.readThrough[uid] = Math.max(
          room.readThrough[uid] ?? 0,
          action.sequence,
        );
      }
    } else {
      if (action.roomRevision !== room.revision) throw new Error("conflict");
      if (
        action.kind === "conversation.invite" ||
        action.kind === "conversation.remove"
      ) {
        if (room.creator !== uid) throw new Error("permission");
        if (!Number.isSafeInteger(action.seat))
          throw new Error("conversation-invalid");
        const target = current.seats[action.seat]?.uid;
        if (!target || target === uid) throw new Error("conversation-invalid");
        if (action.kind === "conversation.invite") {
          if (
            !["future", "selected"].includes(action.scope ?? "") ||
            room.members.includes(target) ||
            room.invitations.includes(target)
          )
            throw new Error("conversation-invalid");
          if (action.scope === "selected") {
            const refs = selectedHistoryReferences(current, action, uid);
            if (
              resolvedHistory.length !== refs.length ||
              resolvedHistory.some(
                (message, index) =>
                  message.id !== refs[index].id ||
                  message.sourceRevision !== refs[index].revision ||
                  !message.recipients.includes(uid),
              )
            )
              throw new Error("conversation-history");
            room.invitationHistory ??= {};
            room.invitationHistory[target] = structuredClone(resolvedHistory);
          } else if (action.history?.length || resolvedHistory.length)
            throw new Error("conversation-history");
          room.invitationIds ??= {};
          room.invitationIds[target] = commandId;
          room.invitations.push(target);
        } else {
          if (!room.members.includes(target))
            throw new Error("conversation-invalid");
          room.members = room.members.filter((member) => member !== target);
          delete room.lastReceived[target];
          delete room.readThrough[target];
          room.keyVersion++;
        }
      } else if (
        action.kind === "conversation.accept" ||
        action.kind === "conversation.decline"
      ) {
        if (!room.invitations.includes(uid)) throw new Error("permission");
        room.invitations = room.invitations.filter((member) => member !== uid);
        const granted = room.invitationHistory?.[uid];
        if (
          action.kind === "conversation.accept" &&
          granted?.length &&
          action.historyConsent !== room.invitationIds?.[uid]
        )
          throw new Error("conversation-history-consent");
        if (action.kind === "conversation.accept") {
          room.members.push(uid);
          room.keyVersion++;
          room.lastReceived[uid] = room.sequence;
          room.readThrough[uid] = room.sequence;
          const selectedHistory = room.invitationHistory?.[uid];
          if (selectedHistory?.length) {
            room.lastReceived[uid] = Math.max(
              ...selectedHistory.map((message) => message.sequence),
            );
            room.readThrough[uid] =
              Math.min(...selectedHistory.map((message) => message.sequence)) -
              1;
            room.sharing = {
              id: commandId,
              recipient: uid,
              at: now,
              messages: structuredClone(selectedHistory),
            };
          }
        }
        if (room.invitationHistory) delete room.invitationHistory[uid];
        if (room.invitationIds) delete room.invitationIds[uid];
      } else if (action.kind === "conversation.leave") {
        if (room.creator === uid || !room.members.includes(uid))
          throw new Error("permission");
        room.members = room.members.filter((member) => member !== uid);
        delete room.lastReceived[uid];
        delete room.readThrough[uid];
        room.keyVersion++;
      } else if (action.kind === "conversation.close") {
        if (room.creator !== uid) throw new Error("permission");
        room.closed = true;
        room.invitations = [];
        room.invitationHistory = {};
        room.invitationIds = {};
        room.keyVersion++;
      } else throw new Error("conversation-invalid");
    }
    room.revision++;
  }
  next.revision++;
  return next;
}

export function selectedHistoryReferences(
  current: Campaign,
  raw: unknown,
  uid: string,
): MessageReference[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("conversation-history");
  const action = raw as Extract<
    ConversationAction,
    { kind: "conversation.invite" | "conversation.remove" }
  >;
  if (current.conversationSharingVersion !== 1)
    throw new Error("conversation-sharing-unavailable");
  if (
    action.kind !== "conversation.invite" ||
    action.scope !== "selected" ||
    typeof action.roomId !== "string"
  )
    throw new Error("conversation-history");
  if (current.phase !== "active") throw new Error("not-active");
  if (current.pausedAt != null) throw new Error("paused");
  const room = current.diplomacy?.rooms[action.roomId];
  if (!room || room.creator !== uid || !room.members.includes(uid))
    throw new Error("permission");
  if (room.closed) throw new Error("conversation-closed");
  if (action.roomRevision !== room.revision) throw new Error("conflict");
  if (
    !Array.isArray(action.history) ||
    action.history.length < 1 ||
    action.history.length > maximumSharedMessages
  )
    throw new Error("conversation-history");
  const ids = new Set<string>();
  for (const ref of action.history) {
    if (
      !ref ||
      typeof ref.id !== "string" ||
      !ref.id ||
      !Number.isSafeInteger(ref.revision) ||
      ref.revision < 1 ||
      ref.revision > current.revision ||
      ids.has(ref.id)
    )
      throw new Error("conversation-history");
    ids.add(ref.id);
  }
  return action.history;
}

export function conversationView(state: Campaign, uid: string) {
  const seat = (id: string) => state.seats.findIndex((s) => s.uid === id);
  const project = (
    message: ConversationMessage,
    sourceRevision: number,
  ): ConversationMessageView => ({
    id: message.id,
    sequence: message.sequence,
    author: seat(message.author),
    body: message.body,
    at: message.at,
    keyVersion: message.keyVersion,
    sourceRevision,
  });
  return Object.values(state.diplomacy?.rooms ?? {}).flatMap((room) => {
    const member = room.members.includes(uid),
      invited = room.invitations.includes(uid);
    if (!member && !invited) return [];
    return [
      {
        id: room.id,
        title: room.title,
        creator: seat(room.creator),
        revision: room.revision,
        keyVersion: room.keyVersion,
        closed: room.closed,
        invited,
        member,
        members: room.members.map(seat),
        invitations: room.creator === uid ? room.invitations.map(seat) : [],
        sharingEnabled: state.conversationSharingVersion === 1,
        invitation: invited
          ? {
              id: room.invitationIds?.[uid] ?? null,
              scope: room.invitationHistory?.[uid]?.length
                ? ("selected" as const)
                : ("future" as const),
              messages: (room.invitationHistory?.[uid] ?? []).map(
                (message) => ({
                  id: message.id,
                  sequence: message.sequence,
                  author: seat(message.author),
                  at: message.at,
                }),
              ),
            }
          : null,
        invitationScopes:
          room.creator === uid
            ? room.invitations.map((id) => ({
                seat: seat(id),
                count: room.invitationHistory?.[id]?.length ?? 0,
              }))
            : [],
        sharedMessages:
          member && room.sharing?.recipient === uid
            ? room.sharing.messages.map((message) => ({
                ...project(message, message.sourceRevision),
                sharedAt: room.sharing?.at,
                sharedBy: seat(room.creator),
              }))
            : [],
        sequence: member ? room.sequence : 0,
        unread:
          member &&
          (room.lastReceived[uid] ?? 0) > (room.readThrough[uid] ?? 0),
        message:
          member && room.message?.recipients.includes(uid)
            ? project(room.message, state.revision)
            : null,
      },
    ];
  });
}
