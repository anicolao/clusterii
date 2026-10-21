import type { CampaignView } from "@shared/campaign";
export type ConversationView = CampaignView["conversations"][number];
export type MessageView = NonNullable<ConversationView["message"]>;
export interface ConversationReceipt {
  id: string;
  gameId: string;
  kind: string;
  roomId: string;
  status: string;
  body: string;
}
export interface MessageRecord {
  revision?: number;
  conversations?: {
    id: string;
    message?: MessageView | null;
    sharedMessages?: MessageView[];
  }[];
}
export function conversationMessages(
  records: MessageRecord[],
  roomId: string,
): MessageView[] {
  const messages = new Map<string, MessageView>();
  for (const record of records) {
    const room = record.conversations?.find((room) => room.id === roomId);
    for (const message of [room?.message, ...(room?.sharedMessages ?? [])]) {
      if (message)
        messages.set(message.id, {
          ...message,
          sourceRevision: message.sourceRevision ?? record.revision,
        });
    }
  }
  return [...messages.values()].sort((a, b) => a.sequence - b.sequence);
}
