import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, branch, target, spec, title, renderer } from './conversation-diagnostic-request.mjs';
const source = '1'.repeat(40);
const r = { source, target, spec, title, tests: 1, retries: 0, updates: 'none', mode: 'unchanged-application-diagnostic' };
const env = { GITHUB_REF_NAME: branch, GITHUB_RUN_ATTEMPT: '1', CLUSTER_PINNED_RENDERER: renderer };
test('exact unchanged single-case binding', () => assert.equal(validateRequest(r, env, source), r));
test('reject broad, empty, changed-source and snapshot-update requests', () => {
  for (const delta of [{ title: '' }, { title: '.*' }, { spec: 'tests/browser' }, { target: source }, { source: target }, { tests: 0 }, { tests: 2 }, { retries: 1 }, { updates: 'all' }]) assert.throws(() => validateRequest({ ...r, ...delta }, env, source));
});
test('reject replay, other branch and renderer', () => {
  for (const delta of [{ GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_REF_NAME: 'main' }, { CLUSTER_PINNED_RENDERER: 'other' }]) assert.throws(() => validateRequest(r, { ...env, ...delta }, source));
});

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
test('both launchers retain narrow recovery routing and reject invalid outer selection', () => {
  const outer = readFileSync('nix/ci-renderer.sh', 'utf8');
  const inner = readFileSync('scripts/ci-in-renderer.sh', 'utf8');
  assert.match(outer, /recovery:conversation-original\|recovery:feature010-phone/);
  assert.match(inner, /conversation-original\) node scripts\/conversation-diagnostic\.mjs "\$2" ;;/);
  assert.match(inner, /\[ "\$#" -eq 2 \] \|\| exit 2/);
  const env = { ...process.env };
  for (const key of ['containerd', 'rootShell', 'engine', 'imageArchive', 'imageTag', 'imageConfig', 'imageDigest', 'nixCommand']) env[key] = 'unused';
  delete env.RUNNER_TEMP;
  for (const args of [[], ['recovery', ''], ['recovery', 'conversation-other'], ['recovery', 'conversation-original', 'extra']]) assert.equal(spawnSync('bash', ['nix/ci-renderer.sh', ...args], { env }).status, 2);
  const exact = spawnSync('bash', ['nix/ci-renderer.sh', 'recovery', 'conversation-original'], { env, encoding: 'utf8' });
  assert.equal(exact.status, 1);
  assert.match(exact.stderr, /RUNNER_TEMP/);
});
