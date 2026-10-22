/** Own a decorative resource across an asynchronous load, toggle and unmount. */
export function decorativeTexture<T extends { dispose(): void }>(
  load: (loaded: (texture: T) => void) => void,
  publish: (texture: T) => void,
): () => void {
  let active = true;
  let texture: T | undefined;
  load((loaded) => {
    if (!active) {
      loaded.dispose();
      return;
    }
    texture = loaded;
    publish(loaded);
  });
  return () => {
    if (!active) return;
    active = false;
    texture?.dispose();
  };
}
