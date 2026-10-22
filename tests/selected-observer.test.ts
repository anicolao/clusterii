import { expect, test } from "bun:test";
import { selectedObserver } from "../src/lib/selected-observer";

test("superseded selection rejects late data and errors and retires delayed subscription", async () => {
  let generation = 1;
  let selection = 1;
  let deliver!: (value: string) => void;
  let reject!: (error: Error) => void;
  let ready!: (stop: () => void) => void;
  let stopped = 0;
  const values: string[] = [];
  const errors: Error[] = [];
  const observer = selectedObserver(
    () => generation === 1 && selection === 1,
    (next, fail) => {
      deliver = next;
      reject = fail;
      return new Promise<() => void>((resolve) => {
        ready = resolve;
      });
    },
    (value: string) => values.push(value),
    (error) => errors.push(error),
  );
  deliver("current");
  const currentError = new Error("current");
  reject(currentError);
  expect(values).toEqual(["current"]);
  expect(errors).toEqual([currentError]);
  selection++;
  deliver("old selection");
  reject(new Error("old selection"));
  expect(values).toEqual(["current"]);
  expect(errors).toEqual([currentError]);
  ready(() => {
    stopped++;
  });
  const stop = await observer;
  expect(stopped).toBe(1);
  stop();
  expect(stopped).toBe(1);
  selection = 1;
  generation++;
  deliver("old account");
  reject(new Error("old account"));
  expect(values).toEqual(["current"]);
  expect(errors).toEqual([currentError]);
});

test("current observer preserves ownership of cleanup and propagates initialization failure", async () => {
  let stopped = 0;
  const stop = await selectedObserver(
    () => true,
    async () => () => {
      stopped++;
    },
    () => {},
    () => {},
  );
  expect(stopped).toBe(0);
  stop();
  expect(stopped).toBe(1);
  const failure = new Error("authorization failed");
  await expect(
    selectedObserver(
      () => true,
      async () => {
        throw failure;
      },
      () => {},
      () => {},
    ),
  ).rejects.toBe(failure);
});
