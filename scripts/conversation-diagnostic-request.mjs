import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
export const branch = 'investigate/pr140-conversation-20261111';
export const target = '730297e72db62967d28db609a788fb06edb9d1d5';
export const requestPath = '.github/recovery/conversation-diagnostic.json';
export const spec = 'tests/browser/conversations.spec.ts';
export const title = 'ordinary commanders negotiate through invitation, retry, revocation and recovery mock$';
export const renderer = 'mcr.microsoft.com/playwright:v1.61.1-noble@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321';
export function validateRequest(r, env, parent) {
  assert.equal(env.GITHUB_REF_NAME, branch);
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(env.CLUSTER_PINNED_RENDERER, renderer);
  assert.match(r.source, /^[a-f0-9]{40}$/);
  assert.equal(r.source, parent);
  assert.equal(r.target, target);
  assert.equal(r.spec, spec);
  assert.equal(r.title, title);
  assert.equal(r.tests, 1);
  assert.equal(r.retries, 0);
  assert.equal(r.updates, 'none');
  assert.equal(r.mode, 'unchanged-application-diagnostic');
  return r;
}
export function verifyRequest() {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const r = validateRequest(JSON.parse(readFileSync(requestPath)), process.env, git('rev-parse', 'HEAD^'));
  assert.deepEqual(git('diff', '--name-only', 'HEAD^', 'HEAD').split('\n').filter(Boolean).sort(), [requestPath, 'PROMPT_WORK.md'].sort());
  assert.equal(git('status', '--porcelain', '--untracked-files=no'), '', 'Clean tracked source required');
  for (const path of ['src', 'shared', 'functions', 'tests', 'package.json', 'bun.lock', 'playwright.config.ts', 'firebase.json']) {
    assert.equal(git('rev-parse', `HEAD:${path}`), git('rev-parse', `${target}:${path}`), `Target differs: ${path}`);
  }
  return r;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) verifyRequest();
