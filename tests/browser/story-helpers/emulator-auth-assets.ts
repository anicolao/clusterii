import type { BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const configured = new WeakSet<BrowserContext>();
export function emulatorAsset(url: string, frameUrl: string) {
  const frame = new URL(frameUrl);
  if (
    frame.origin !== "http://127.0.0.1:19099" ||
    frame.pathname !== "/emulator/auth/handler"
  )
    return undefined;
  const asset = new URL(url);
  if (asset.origin !== "https://unpkg.com") return undefined;
  const match =
    /^\/material-components-web@(?:10|10\.0\.0)\/dist\/material-components-web\.min\.(js|css)$/.exec(
      asset.pathname,
    );
  if (!match || asset.search) return undefined;
  return {
    path: resolve(
      `node_modules/material-components-web/dist/material-components-web.min.${match[1]}`,
    ),
    contentType: match[1] === "js" ? "application/javascript" : "text/css",
  };
}
/** Authentic pinned dependency bytes for the emulator's own UI, not an auth
 * response fixture. Production pages and all auth/API requests are untouched. */
export async function useEmulatorAuthAssets(context: BrowserContext) {
  if (configured.has(context)) return;
  await context.route(
    "https://unpkg.com/material-components-web@*/dist/*",
    async (route) => {
      const asset = emulatorAsset(
        route.request().url(),
        route.request().frame().url(),
      );
      if (!asset) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: asset.contentType,
        body: readFileSync(asset.path),
      });
    },
  );
  configured.add(context);
}
