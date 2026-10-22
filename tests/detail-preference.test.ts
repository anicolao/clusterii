import { expect, test } from "bun:test";
import { get } from "svelte/store";
import { Texture } from "three";
import {
  createDetailPreference,
  detailPreferenceKey,
} from "../src/lib/detail-preference";
import { decorativeTexture } from "../src/lib/decorative-texture";

function environment(value: string | null = null) {
  let stored = value;
  let denied = false;
  const listeners = new Set<(event: StorageEvent) => void>();
  const host = {
    localStorage: {
      getItem: () => {
        if (denied) throw new Error("denied");
        return stored;
      },
      setItem: (key: string, value: string) => {
        if (denied) throw new Error("denied");
        expect(key).toBe(detailPreferenceKey);
        stored = value;
      },
    },
    addEventListener: (
      _: "storage",
      listener: (event: StorageEvent) => void,
    ) => {
      listeners.add(listener);
    },
    removeEventListener: (
      _: "storage",
      listener: (event: StorageEvent) => void,
    ) => {
      listeners.delete(listener);
    },
  };
  return {
    host,
    listeners,
    deny: () => {
      denied = true;
    },
    event: (
      key: string | null,
      newValue: string | null,
      storageArea = host.localStorage,
    ) => {
      for (const listener of listeners)
        listener({ key, newValue, storageArea } as unknown as StorageEvent);
    },
  };
}

test("detail preference waits for initialization and persists browser-local selection", () => {
  const env = environment();
  const preference = createDetailPreference();
  expect(get(preference).ready).toBe(false);
  const stop = preference.connect(env.host);
  expect(get(preference)).toEqual({ lower: false, ready: true, saved: true });
  preference.setLower(true);
  const recovered = createDetailPreference();
  const disconnect = recovered.connect(env.host);
  expect(get(recovered)).toEqual({ lower: true, ready: true, saved: true });
  env.event("cluster-reduce-motion", "false");
  expect(get(preference).lower).toBe(true);
  env.event(detailPreferenceKey, "false", {
    getItem: () => null,
    setItem: () => {},
  });
  expect(get(preference).lower).toBe(true);
  env.event(detailPreferenceKey, "false");
  expect(get(preference).lower).toBe(false);
  stop();
  disconnect();
  expect(env.listeners.size).toBe(0);
});

test("storage denial is explicit while the current-page setting still works", () => {
  const env = environment();
  env.deny();
  const preference = createDetailPreference();
  const stop = preference.connect(env.host);
  expect(get(preference)).toEqual({ lower: false, ready: true, saved: false });
  preference.setLower(true);
  expect(get(preference)).toEqual({ lower: true, ready: true, saved: false });
  stop();
});

test("late decorative texture cannot restore a retired render generation", () => {
  let first!: (texture: Texture) => void;
  let second!: (texture: Texture) => void;
  const published: Texture[] = [];
  const oldTexture = new Texture();
  const newTexture = new Texture();
  let oldDisposals = 0,
    newDisposals = 0;
  oldTexture.addEventListener("dispose", () => {
    oldDisposals++;
  });
  newTexture.addEventListener("dispose", () => {
    newDisposals++;
  });
  const retire = decorativeTexture<Texture>(
    (loaded) => {
      first = loaded;
    },
    (texture) => published.push(texture),
  );
  retire();
  const stop = decorativeTexture<Texture>(
    (loaded) => {
      second = loaded;
    },
    (texture) => published.push(texture),
  );
  second(newTexture);
  first(oldTexture);
  expect(published).toEqual([newTexture]);
  expect(oldDisposals).toBe(1);
  expect(newDisposals).toBe(0);
  stop();
  stop();
  expect(newDisposals).toBe(1);
  expect(published).toEqual([newTexture]);
});
