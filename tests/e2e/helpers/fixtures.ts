import { test as base } from "@playwright/test";
import { finishStory } from "./test-step-helper";
export { expect } from "@playwright/test";
export const test = base.extend<{ illustratedStory: void }>({
  illustratedStory: [
    async ({}, use, info) => {
      await use();
      await finishStory(info);
    },
    { auto: true },
  ],
});
