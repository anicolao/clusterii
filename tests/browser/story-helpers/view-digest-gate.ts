import { expect, type Page } from "@playwright/test";
import type { Envelope } from "../../../shared/crypto";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { faultSources, validateFaultScope } from "./membership-fault.mjs";

/** Delay only the actual digest for one previously authorized encrypted view. */
export async function holdViewDigest(
  page: Page,
  envelope: Envelope,
  uid: string,
) {
  validateFaultScope({
    project: "demo-clusterii",
    host: process.env.FIRESTORE_EMULATOR_HOST,
    origin: new URL(page.url()).origin,
    sources: Object.fromEntries(
      Object.keys(faultSources).map((path) => [
        path,
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ]),
    ),
  });
  expect(envelope).toMatchObject({
    mode: "mock",
    algorithm: "MOCK-PREFIX-SHA256",
    objectId: `member:${uid}`,
    epoch: 1,
    keyVersion: 1,
    format: 1,
  });
  const input =
    JSON.stringify([
      envelope.gameId,
      envelope.objectId,
      envelope.revision,
      envelope.epoch,
      envelope.keyVersion,
    ]) +
    envelope.nonce +
    envelope.ciphertext;
  await page.evaluate((input) => {
    if (location.origin !== "http://127.0.0.1:4173")
      throw new Error("Digest fault requires loopback");
    const host = window as typeof window & {
      __clusterViewGate?: {
        held: number;
        resumed: number;
        release: () => void;
        restore: () => void;
      };
    };
    if (host.__clusterViewGate)
      throw new Error("Digest fault already installed");
    const original = crypto.subtle.digest;
    let release = () => {},
      active = true;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const state = {
      held: 0,
      resumed: 0,
      release: () => {
        active = false;
        release();
      },
      restore: () => {
        state.release();
        crypto.subtle.digest = original;
        delete host.__clusterViewGate;
      },
    };
    host.__clusterViewGate = state;
    crypto.subtle.digest = async (algorithm, data) => {
      const result = await original.call(crypto.subtle, algorithm, data);
      const name = typeof algorithm === "string" ? algorithm : algorithm.name;
      if (
        active &&
        name === "SHA-256" &&
        new TextDecoder().decode(data) === input
      ) {
        state.held++;
        await gate;
        state.resumed++;
      }
      return result;
    };
  }, input);
  const counts = () =>
    page.evaluate(() => {
      const s = (
        window as unknown as {
          __clusterViewGate: { held: number; resumed: number };
        }
      ).__clusterViewGate;
      return { held: s.held, resumed: s.resumed };
    });
  return {
    async held() {
      await expect.poll(async () => (await counts()).held).toBeGreaterThan(0);
    },
    async release() {
      await page.evaluate(() =>
        (
          window as unknown as { __clusterViewGate: { release: () => void } }
        ).__clusterViewGate.release(),
      );
      await expect
        .poll(async () => {
          const s = await counts();
          return s.held > 0 && s.resumed === s.held;
        })
        .toBe(true);
      // Flush the released promise's microtasks through an actual rendered frame.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      );
    },
    async dispose() {
      if (!page.isClosed())
        await page.evaluate(() =>
          (
            window as unknown as { __clusterViewGate?: { restore: () => void } }
          ).__clusterViewGate?.restore(),
        );
    },
  };
}
