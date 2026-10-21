import type { CampaignView } from "@shared/campaign";
import { type Envelope, type Grant, provider, unwrap } from "@shared/crypto";
import {
  collection,
  type Firestore,
  getDocsFromServer,
  limit,
  orderBy,
  type QueryConstraint,
  query,
  where,
} from "firebase/firestore";
import { type Functions, httpsCallable } from "firebase/functions";
export interface HistoryCursor {
  epoch: number;
  before: number;
  ceiling: number;
}
export interface HistoryPage {
  records: CampaignView[];
  cursor: HistoryCursor | null;
}
export const historyPageSize = 10;
export const historyRecoveryMessage =
  "History could not be recovered. Check your connection and retry. Your current records remain in place.";
export class HistoryEpochChanged extends Error {
  constructor() {
    super("Campaign protection changed. Open the latest records to continue.");
  }
}
// Dependencies are explicit so emulator tests exercise the same reader and rules.
export async function readCampaignHistory(
  firestore: Firestore,
  functions: Functions,
  gameId: string,
  uid: string,
  cursor: HistoryCursor | null = null,
): Promise<HistoryPage> {
  const { data: access } = await httpsCallable<
    { gameId: string },
    | { joined: false }
    | { joined: true; kek: string; mode: "mock" | "real"; epoch: number }
  >(
    functions,
    "campaignKey",
  )({ gameId });
  if (!access.joined) throw new Error("This campaign is no longer accessible.");
  if (cursor && cursor.epoch !== access.epoch) throw new HistoryEpochChanged();
  const path = `campaignViews/${gameId}/members/${uid}/${access.epoch === 1 ? "versions" : `epochs/${access.epoch}/versions`}`;
  const constraints: QueryConstraint[] = [
    orderBy("revision", "desc"),
    limit(historyPageSize + 1),
  ];
  if (cursor)
    constraints.push(
      where("revision", "<", cursor.before),
      where("revision", "<=", cursor.ceiling),
    );
  const snapshot = await getDocsFromServer(
    query(collection(firestore, path), ...constraints),
  );
  const records = await Promise.all(
    snapshot.docs.slice(0, historyPageSize).map(async (document) => {
      const { revision, envelope, grant } = document.data() as {
        revision: number;
        envelope: Envelope;
        grant: Grant;
      };
      if (document.id !== String(revision) || !Number.isSafeInteger(revision))
        throw new Error("Invalid campaign record.");
      const context = {
        gameId,
        objectId: `member:${uid}`,
        revision,
        epoch: access.epoch,
        keyVersion: 1,
      };
      const key = await unwrap(grant, access.kek, uid, context, access.mode);
      const view = await provider(access.mode).open<CampaignView>(
        envelope,
        key,
        context,
      );
      if (
        view.id !== gameId ||
        view.revision !== revision ||
        view.encryptionEpoch !== access.epoch
      )
        throw new Error("Campaign record does not match its protection.");
      return view;
    }),
  );
  return {
    records,
    cursor:
      snapshot.size > historyPageSize
        ? {
            epoch: access.epoch,
            before: records[records.length - 1].revision,
            ceiling: cursor?.ceiling ?? records[0].revision,
          }
        : null,
  };
}
