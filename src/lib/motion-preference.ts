import { writable } from "svelte/store";
export const motionPreferenceKey = "cluster-reduce-motion";
export interface MotionPreference {
  reduce: boolean;
  system: boolean;
  effective: boolean;
  saved: boolean;
}
interface Environment {
  localStorage: Pick<Storage, "getItem" | "setItem">;
  matchMedia: (query: string) => MediaQueryList;
  addEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void,
  ) => void;
  removeEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void,
  ) => void;
}
export function createMotionPreference() {
  let environment: Environment | undefined;
  let state: MotionPreference = {
    reduce: false,
    system: false,
    effective: false,
    saved: true,
  };
  const store = writable(state);
  const publish = (patch: Partial<MotionPreference>) => {
    state = { ...state, ...patch };
    state.effective = state.reduce || state.system;
    store.set(state);
  };
  return {
    subscribe: store.subscribe,
    setReduce(reduce: boolean) {
      let saved = false;
      try {
        if (environment) {
          environment.localStorage.setItem(
            motionPreferenceKey,
            reduce ? "true" : "false",
          );
          saved = true;
        }
      } catch {
        /* Keep the usable current-page choice and explain persistence failure. */
      }
      publish({ reduce, saved });
    },
    connect(host: Environment) {
      environment = host;
      const media = host.matchMedia("(prefers-reduced-motion: reduce)");
      let reduce = false;
      let saved = true;
      try {
        reduce = host.localStorage.getItem(motionPreferenceKey) === "true";
      } catch {
        saved = false;
      }
      publish({ reduce, system: media.matches, saved });
      const change = () => publish({ system: media.matches });
      const storage = (event: StorageEvent) => {
        // Session-storage events must not change a browser-local preference.
        try {
          if (event.storageArea && event.storageArea !== host.localStorage)
            return;
        } catch {
          return;
        }
        if (event.key === motionPreferenceKey || event.key === null)
          publish({ reduce: event.newValue === "true", saved: true });
      };
      media.addEventListener("change", change);
      host.addEventListener("storage", storage);
      return () => {
        media.removeEventListener("change", change);
        host.removeEventListener("storage", storage);
        if (environment === host) environment = undefined;
      };
    },
  };
}
export const motionPreference = createMotionPreference();
