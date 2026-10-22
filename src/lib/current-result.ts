/** Publish an asynchronous snapshot result only while that snapshot owns the view. */
export async function currentResult<T>(
  result: Promise<T>,
  current: () => boolean,
  next: (value: T) => void,
  fail: (error: Error) => void,
): Promise<void> {
  try {
    const value = await result;
    if (current()) next(value);
  } catch (error) {
    if (current()) fail(error as Error);
  }
}
