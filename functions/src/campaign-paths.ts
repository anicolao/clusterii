export const canonicalVersions = (id: string, epoch: number) =>
  epoch === 1
    ? `campaignStates/${id}/versions`
    : `campaignStates/${id}/epochs/${epoch}/versions`;
export const recipientKeyPath = (id: string, uid: string, epoch: number) =>
  epoch === 1
    ? `campaignKeys/${id}/members/${uid}`
    : `campaignKeys/${id}/epochs/${epoch}/members/${uid}`;
export const memberVersions = (id: string, uid: string, epoch: number) =>
  epoch === 1
    ? `campaignViews/${id}/members/${uid}/versions`
    : `campaignViews/${id}/members/${uid}/epochs/${epoch}/versions`;
