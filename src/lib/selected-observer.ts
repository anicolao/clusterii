/** Retire an asynchronous observer when its owning selection is superseded. */
export async function selectedObserver<T>(
  current: () => boolean,
  observe: (
    next: (value: T) => void,
    fail: (error: Error) => void,
  ) => Promise<() => void>,
  next: (value: T) => void,
  fail: (error: Error) => void,
): Promise<() => void> {
  const stop = await observe(
    (value) => {
      if (current()) next(value);
    },
    (error) => {
      if (current()) fail(error);
    },
  );
  if (!current()) {
    stop();
    return () => {};
  }
  return stop;
}
