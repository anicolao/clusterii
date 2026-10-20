import { reduceProfile, type Receipt } from '@shared/profile';
import { receiptFeedback, pendingMessage, networkMessage } from '$lib/identity-feedback';
// Deterministic presentation fixtures, using the production validation/reducer and receipt copy.
// This route never creates Firebase users, commands or games.
function receipt(expectedRevision: number, currentRevision: number, alias: string): Receipt {
  try {
    reduceProfile(currentRevision, { kind: 'profile.set', expectedRevision, profile: { alias, portrait: 'M2' } });
    return { status: 'accepted', revision: currentRevision + 1 };
  } catch (error) {
    return { status: 'rejected', revision: currentRevision, reason: error instanceof Error && error.message === 'conflict' ? 'conflict' : 'invalid' };
  }
}
const accepted = receiptFeedback(receipt(1, 1, 'The envoy'));
const conflict = receiptFeedback(receipt(1, 2, 'Preserved draft'));
const invalid = receiptFeedback(receipt(1, 1, 'A'.repeat(25)));
const pending = { message: pendingMessage, error: '', remedy: 'none' };
const reconnect = { message: '', error: networkMessage, remedy: 'network' };
export const scenarios = [
  { id: 'accepted', label: 'Pending → accepted', frames: [{ at: 0, feedback: pending }, { at: 1200, feedback: accepted }] },
  { id: 'conflict', label: 'Pending → conflict', frames: [{ at: 0, feedback: pending }, { at: 1200, feedback: conflict }] },
  { id: 'invalid', label: 'Validation rejected', frames: [{ at: 0, feedback: invalid }] },
  { id: 'reconnect', label: 'Pending → reconnect → accepted', frames: [{ at: 0, feedback: pending }, { at: 1000, feedback: reconnect }, { at: 2200, feedback: pending }, { at: 3200, feedback: accepted }] },
] as const;
export const duration = 3600;
