import { expect, test } from "bun:test";
import { get } from "svelte/store";
import {
  createMotionPreference,
  motionPreference,
  motionPreferenceKey,
} from "../src/lib/motion-preference";
import { feedbackMotion } from "../src/lib/motion";
function environment(initial: string | null = null, system = false) {
  let value = initial;
  let denied = false;
  const changes = new Set<() => void>();
  const storageListeners = new Set<(event: StorageEvent) => void>();
  const media = {
    matches: system,
    addEventListener: (_: string, listener: () => void) =>
      changes.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      changes.delete(listener),
  };
  const storage = {
    getItem: () => {
      if (denied) throw new Error("denied");
      return value;
    },
    setItem: (key: string, next: string) => {
      if (denied) throw new Error("denied");
      expect(key).toBe(motionPreferenceKey);
      value = next;
    },
  };
  const host = {
    localStorage: storage,
    matchMedia: () => media as unknown as MediaQueryList,
    addEventListener: (_: "storage", listener: (event: StorageEvent) => void) =>
      storageListeners.add(listener),
    removeEventListener: (
      _: "storage",
      listener: (event: StorageEvent) => void,
    ) => storageListeners.delete(listener),
  };
  return {
    host,
    media,
    changes,
    storageListeners,
    value: () => value,
    deny: () => {
      denied = true;
    },
    system: (next: boolean) => {
      media.matches = next;
      for (const change of changes) change();
    },
    otherTab: (key: string | null, newValue: string | null) => {
      for (const listener of storageListeners)
        listener({ key, newValue } as StorageEvent);
    },
  };
}

test("explicit reduction persists and OS reduction cannot be overridden", () => {
  const env = environment();
  const setting = createMotionPreference();
  const stop = setting.connect(env.host);
  expect(get(setting).effective).toBe(false);
  setting.setReduce(true);
  expect(env.value()).toBe("true");
  expect(get(setting).effective).toBe(true);
  env.system(true);
  setting.setReduce(false);
  expect(get(setting)).toMatchObject({
    reduce: false,
    system: true,
    effective: true,
    saved: true,
  });
  env.system(false);
  expect(get(setting).effective).toBe(false);
  stop();
  expect(env.changes.size).toBe(0);
  expect(env.storageListeners.size).toBe(0);
  const recovered = createMotionPreference();
  const disconnect = recovered.connect(environment("true").host);
  expect(get(recovered).effective).toBe(true);
  disconnect();
});

test("cross-tab changes and unavailable storage preserve honest usable state", () => {
  const env = environment("invalid");
  const setting = createMotionPreference();
  const stop = setting.connect(env.host);
  expect(get(setting).reduce).toBe(false);
  env.otherTab("unrelated", "true");
  expect(get(setting).reduce).toBe(false);
  env.otherTab(motionPreferenceKey, "true");
  expect(get(setting).effective).toBe(true);
  env.otherTab(null, null);
  expect(get(setting).effective).toBe(false);
  env.deny();
  setting.setReduce(true);
  expect(get(setting)).toMatchObject({
    reduce: true,
    effective: true,
    saved: false,
  });
  stop();
  const inaccessible = createMotionPreference();
  const disconnect = inaccessible.connect(env.host);
  expect(get(inaccessible).saved).toBe(false);
  disconnect();
});

test("shared feedback cancels active motion on local reduction without replaying the event", () => {
  const env = environment();
  const original = globalThis.matchMedia;
  globalThis.matchMedia = env.host.matchMedia;
  const disconnect = motionPreference.connect(env.host);
  let created = 0,
    cancelled = 0;
  const node = {
    animate: () => {
      created++;
      return {
        cancel: () => {
          cancelled++;
        },
        pause: () => {},
        onfinish: null,
      };
    },
  } as unknown as HTMLElement;
  const action = feedbackMotion(node, { key: "accepted" });
  expect(created).toBe(1);
  motionPreference.setReduce(true);
  expect(cancelled).toBeGreaterThan(0);
  expect(created).toBe(1);
  motionPreference.setReduce(false);
  expect(created).toBe(1);
  action.destroy();
  disconnect();
  globalThis.matchMedia = original;
});
