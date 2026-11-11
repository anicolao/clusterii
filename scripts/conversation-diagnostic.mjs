import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, statfsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { verifyRequest, spec, title } from './conversation-diagnostic-request.mjs';
assert.deepEqual(process.argv.slice(2), ['conversation-original']);
const r = verifyRequest();
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'arm64');
assert.ok(!existsSync('test-results'));
assert.ok(!process.env.CLUSTER_STORY_MODE && !process.env.CLUSTER_STORY_FILTER);
const disk = statfsSync('.');
assert.ok(Number(disk.bavail) * Number(disk.bsize) > 3 * 1024 ** 3, 'Disk reserve');
for (const port of [4173, 19099, 19000, 18080, 19150, 15001, 14400, 14500]) {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); reject(new Error(`Occupied port ${port}`)); });
    socket.once('error', resolve);
  });
}
const evidence = 'ci-evidence/conversation-diagnostic';
mkdirSync(evidence, { recursive: true });
const env = { ...process.env, CLUSTER_PROFILE_INGRESS_DIAGNOSTICS: '1', CLUSTER_PROFILE_INGRESS_LOG: `${process.cwd()}/ci-evidence/profile-ingress.jsonl`, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${process.cwd()}/scripts/profile-ingress-observer.mjs` };
const args = ['x', 'playwright', 'test', spec, '--grep', title, '--workers=1', '--retries=0', '--update-snapshots=none', '--trace=on'];
const run = (a) => {
  const result = spawnSync('bun', a, { env, stdio: 'inherit', timeout: 15 * 60 * 1000 });
  if (result.error) console.error(result.error);
  return result.status ?? 1;
};
assert.equal(run(['x', 'svelte-kit', 'sync']), 0);
const collection = JSON.parse(execFileSync('bun', [...args, '--list', '--reporter=json'], { env, encoding: 'utf8', maxBuffer: 16 * 1024 ** 2 }));
const found = [];
const visit = (s) => { for (const x of s.specs ?? []) for (const t of x.tests ?? []) found.push({ title: x.title, file: x.file }); for (const x of s.suites ?? []) visit(x); };
visit(collection);
assert.equal(found.length, 1);
assert.equal(found[0].title, title.slice(0, -1));
writeFileSync(`${evidence}/collection.json`, JSON.stringify(collection, null, 2));
assert.equal(run(['run', '--cwd', 'functions', 'build']), 0);
const startedAt = new Date().toISOString();
const command = `bunx playwright test ${spec} --grep '${title}' --workers=1 --retries=0 --update-snapshots=none --trace=on`;
const code = run(['x', 'firebase', 'emulators:exec', '--project', 'demo-clusterii', '--only', 'auth,database,firestore,functions', command]);
const unchanged = spawnSync('git', ['diff', '--exit-code', '--', 'src', 'shared', 'functions', 'tests', 'playwright.config.ts'], { stdio: 'inherit' }).status;
writeFileSync(`${evidence}/outcome.json`, JSON.stringify({ ...r, startedAt, finishedAt: new Date().toISOString(), exit: code, sourceDiffExit: unchanged, assertions: 'Original 180-second mock test and 5-second acknowledgement assertions unchanged; no snapshot comparisons changed.' }, null, 2));
process.exitCode = code || unchanged || 0;
