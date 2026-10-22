import { describe, expect, test } from "bun:test";
import type { CampaignView } from "../shared/campaign";
import { constructionSettlementFeedback } from "../src/lib/construction-feedback";
const command = { gameId: "game", orderId: "original", revision: 10 };
const view = (construction: unknown, revision = 10, id = "game") =>
  ({ id, revision, construction }) as CampaignView;
describe("construction acknowledgement reconciliation", () => {
  test("only a current matching game can reconcile; queued work preserves its actual accepted status", () => {
    expect(constructionSettlementFeedback(view(null, 9), command)).toBeNull();
    expect(
      constructionSettlementFeedback(view(null, 11, "other"), command),
    ).toBeNull();
    expect(
      constructionSettlementFeedback(
        view({
          orders: [{ id: "original" }],
          ledger: [
            {
              id: "other",
              type: "base",
              result: "cancelled",
              refundMilli: 69000,
            },
          ],
        }),
        command,
      ),
    ).toBeNull();
  });
  test("matching completion and cancellation replace future-tense acknowledgement with actual outcomes", () => {
    expect(
      constructionSettlementFeedback(
        view({
          orders: [],
          ledger: [
            {
              id: "original",
              type: "camp",
              result: "completed",
              refundMilli: 0,
            },
          ],
        }),
        command,
      )?.message,
    ).toBe("Training camp completed.");
    expect(
      constructionSettlementFeedback(
        view({
          orders: [],
          ledger: [
            {
              id: "original",
              type: "base",
              result: "cancelled",
              refundMilli: 34500,
            },
          ],
        }),
        command,
      )?.message,
    ).toBe("Base cancelled. 34.5 credits returned.");
  });
  test("an advanced ledger cannot manufacture a future build, refund or successful completion", () => {
    expect(
      constructionSettlementFeedback(
        view({ orders: [], ledger: [] }, 20),
        command,
      )?.message,
    ).toBe(
      "Construction order acknowledged. Open history to inspect its outcome.",
    );
  });
});
