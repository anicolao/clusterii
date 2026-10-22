import { expect, test } from "bun:test";
import { currentResult } from "../src/lib/current-result";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("a superseded snapshot error cannot replace a newer saved identity", async () => {
  let serial = 1;
  let active = true;
  const first = deferred<string>();
  const second = deferred<string>();
  const values: string[] = [];
  const failures: Error[] = [];
  const pending = currentResult(
    first.promise,
    () => active && serial === 1,
    (value) => values.push(value),
    (error) => failures.push(error),
  );
  serial = 2;
  const latest = currentResult(
    second.promise,
    () => active && serial === 2,
    (value) => values.push(value),
    (error) => failures.push(error),
  );
  second.resolve("Saved identity revision 2");
  await latest;
  first.reject(new Error("Old revision decrypt failed"));
  await pending;
  expect(values).toEqual(["Saved identity revision 2"]);
  expect(failures).toEqual([]);
  const stopped = deferred<string>();
  const stoppedResult = currentResult(
    stopped.promise,
    () => active,
    (value) => values.push(value),
    (error) => failures.push(error),
  );
  active = false;
  stopped.reject(new Error("Retired subscription failed"));
  await stoppedResult;
  expect(failures).toEqual([]);
  expect(values).toEqual(["Saved identity revision 2"]);
});

test("current errors remain actionable and retired successes cannot restore identity", async () => {
  const error = new Error("Current identity cannot be decrypted");
  const failures: Error[] = [];
  const values: string[] = [];
  await currentResult(
    Promise.reject(error),
    () => true,
    (value) => values.push(value as string),
    (reason) => failures.push(reason),
  );
  expect(failures).toEqual([error]);
  await currentResult(
    Promise.resolve("old account"),
    () => false,
    (value) => values.push(value),
    (reason) => failures.push(reason),
  );
  expect(values).toEqual([]);
  expect(failures).toEqual([error]);
});
