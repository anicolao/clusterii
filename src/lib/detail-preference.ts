import { writable } from "svelte/store";
export const detailPreferenceKey = "cluster-lower-galaxy-detail";
export interface DetailPreference {
  lower: boolean;
  ready: boolean;
  saved: boolean;
}
interface Environment {
  localStorage: Pick<Storage, "getItem" | "setItem">;
  addEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void,
  ) => void;
  removeEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void,
  ) => void;
}
export function createDetailPreference() {
  let host: Environment | undefined;
  const store = writable<DetailPreference>({
    lower: false,
    ready: false,
    saved: true,
  });
  return {
    subscribe: store.subscribe,
    setLower(lower: boolean) {
      let saved = false;
      try {
        if (host) {
          host.localStorage.setItem(detailPreferenceKey, String(lower));
          saved = true;
        }
      } catch {
        /* The current-page choice remains usable, with explicit unsaved copy. */
      }
      store.set({ lower, ready: true, saved });
    },
    connect(environment: Environment) {
      host = environment;
      let lower = false,
        saved = true;
      try {
        lower =
          environment.localStorage.getItem(detailPreferenceKey) === "true";
      } catch {
        saved = false;
      }
      store.set({ lower, ready: true, saved });
      const changed = (event: StorageEvent) => {
        try {
          if (
            event.storageArea &&
            event.storageArea !== environment.localStorage
          )
            return;
        } catch {
          return;
        }
        if (event.key === detailPreferenceKey || event.key === null)
          store.set({
            lower: event.newValue === "true",
            ready: true,
            saved: true,
          });
      };
      environment.addEventListener("storage", changed);
      return () => {
        environment.removeEventListener("storage", changed);
        if (host === environment) host = undefined;
      };
    },
  };
}
export const detailPreference = createDetailPreference();
