import { register } from "node:module";
// NODE_OPTIONS reaches Firebase's CLI and its Playwright child too. Register
// only in the demo Functions runtime; never interfere with their module hooks.
if (
  process.env.FUNCTIONS_EMULATOR === "true" &&
  process.env.GCLOUD_PROJECT === "demo-clusterii"
) {
  register("./emulator-construction-clock-loader.mjs", import.meta.url, {
    data: {
      target: new URL(
        "../../../functions/lib/shared/campaign.js",
        import.meta.url,
      ).href,
    },
  });
  register("./emulator-credit-clock-loader.mjs", import.meta.url, {
    data: {
      target: new URL(
        "../../../functions/lib/shared/trades.js",
        import.meta.url,
      ).href,
    },
  });
  register("./emulator-admission-clock-loader.mjs", import.meta.url, {
    data: {
      target: new URL(
        "../../../functions/lib/shared/campaign.js",
        import.meta.url,
      ).href,
    },
  });
  register("./emulator-catalogue-loader.mjs", import.meta.url, {
    data: {
      target: new URL(
        "../../../functions/lib/shared/campaign.js",
        import.meta.url,
      ).href,
    },
  });
}
