import { test, expect } from "@playwright/test";
import { geometry } from "./helpers";

test("geometry rejects overlapping visible target edges even when their centres are reachable", async ({
  page,
}) => {
  await page.setContent(
    `<style>button {position:absolute;top:20px;width:80px;height:48px} #one {left:20px} #two {left:95px}</style><button id="one">One</button><button id="two">Two</button>`,
  );
  // Both centres pass hit testing. The shared five-pixel strip must still fail.
  await expect(geometry(page)).rejects.toThrow();
  await page.locator("#two").evaluate((el) => {
    el.style.left = "110px";
  });
  await geometry(page);
});
