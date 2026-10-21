import { register } from "node:module";
register("./emulator-catalogue-loader.mjs", import.meta.url, {
  data: {
    target: new URL(
      "../../../functions/lib/shared/campaign.js",
      import.meta.url,
    ).href,
  },
});
