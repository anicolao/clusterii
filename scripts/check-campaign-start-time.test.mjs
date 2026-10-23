import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compile } from "svelte/compiler";
import { render } from "svelte/server";

// Static rendering of the actual production component; no browser, emulator or service fixture.
const source = readFileSync(new URL("../src/lib/components/CampaignStartStatus.svelte", import.meta.url), "utf8");
const code = compile(source, { generate: "server" }).js.code.replace(
  /from (['"])(svelte[^'"]*)\1/g,
  (_, quote, name) => `from ${quote}${import.meta.resolve(name)}${quote}`,
);
const Component = (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;
const startAt = Date.UTC(2026, 9, 23, 9, 15);
function status(phase, now, at = startAt) {
  return render(Component, { props: {
    game: { phase, startAt: at, capacity: 4, pausedAt: null }, inspectTime: now,
  } }).body;
}
test("future, overdue and begun statuses retain the same authoritative ISO start identity", () => {
  for (const [phase, now, wording] of [
    ["scheduled", startAt - 300000, "Starts"],
    ["scheduled", startAt + 300000, "Awaiting home assignment"],
    ["active", startAt + 300000, "Began"],
  ]) {
    const html = status(phase, now);
    assert.match(html, /role="status" aria-label="Campaign start"/);
    assert.ok(html.includes(wording));
    assert.ok(html.includes(`datetime="${new Date(startAt).toISOString()}"`));
    assert.ok(html.includes(new Date(startAt).toLocaleString()));
    assert.equal((html.match(/<time /g) ?? []).length, 1);
  }
});
test("a roster without a scheduled start does not fabricate a time", () => {
  const html = status("waiting", startAt, null);
  assert.ok(html.includes("Waiting for players"));
  assert.doesNotMatch(html, /<time /);
});
