import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const checker = resolve(import.meta.dirname, 'check-prompts.mjs');
const initial = '# Project prompts\n\n## Prompt 1: Initial Request\n\nFirst user request.\n';
const next = '\n## Prompt 2: Followup Request\n\nSecond user request.\n';

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'cluster-prompts-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'Prompt Test');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'core.hooksPath', '/dev/null');
  git('config', 'commit.gpgsign', 'false');
  const write = (text, path = 'PROMPTS.md') => writeFileSync(join(cwd, path), text);
  const check = (...args) => spawnSync(process.execPath, [checker, ...args], { cwd, encoding: 'utf8' }).status;
  const seed = () => { write(initial); git('add', 'PROMPTS.md'); git('commit', '-qm', 'Record first prompt'); };
  return { git, write, check, seed };
}

test('requires a staged prompt log, including on the initial commit', (t) => {
  const f = fixture(t);
  assert.notEqual(f.check(), 0);
  f.write(initial);
  assert.notEqual(f.check(), 0);
  f.git('add', 'PROMPTS.md');
  assert.equal(f.check(), 0);
});

test('accepts a staged append and rejects an unstaged append', (t) => {
  const f = fixture(t); f.seed(); f.write(initial + next);
  assert.notEqual(f.check(), 0);
  f.git('add', 'PROMPTS.md');
  assert.equal(f.check(), 0);
});

test('rejects rewritten or deleted historical prompts', (t) => {
  const f = fixture(t); f.seed(); f.write(initial.replace('First user', 'Changed user') + next);
  f.git('add', 'PROMPTS.md');
  assert.notEqual(f.check(), 0);
  f.git('rm', '-f', 'PROMPTS.md');
  assert.notEqual(f.check(), 0);
});

test('rejects empty bodies, invalid summaries, numbering gaps, and bare append text', (t) => {
  const f = fixture(t); f.seed();
  for (const added of [
    '\n## Prompt 2: Empty Request\n\n  \n',
    '\n## Prompt 2: Single\n\nRequest.\n',
    '\n## Prompt 2: Too Many Summary Words\n\nRequest.\n',
    '\n## Prompt 3: Wrong Number\n\nRequest.\n',
    '\nUnheaded text.\n',
  ]) {
    f.write(initial + added); f.git('add', 'PROMPTS.md');
    assert.notEqual(f.check(), 0, added);
  }
});

test('accepts a unique continuation bound to the latest exact prompt log', (t) => {
  const f = fixture(t); f.seed();
  const hash = createHash('sha256').update(initial).digest('hex');
  f.write(`Prompt 1 | ${hash} | Implement the second logical step\n`, 'PROMPT_WORK.md');
  f.git('add', 'PROMPT_WORK.md');
  assert.equal(f.check(), 0);
  f.git('commit', '-qm', 'Record continuation');
  assert.notEqual(f.check(), 0);
  f.write(`Prompt 1 | ${'0'.repeat(64)} | Implement another logical step\n`, 'PROMPT_WORK.md');
  f.git('add', 'PROMPT_WORK.md');
  assert.notEqual(f.check(), 0);
});

test('checks a PR against its base, including a base with no prompt log', (t) => {
  const f = fixture(t);
  f.git('commit', '--allow-empty', '-qm', 'Repository foundation');
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write(initial); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Record first prompt');
  assert.equal(f.check('--base', base), 0);
  assert.notEqual(f.check('--base', 'HEAD'), 0);
});

test('the installed pre-commit hook blocks commits without a staged prompt', (t) => {
  const f = fixture(t);
  const cwd = f.git('rev-parse', '--show-toplevel').trim();
  mkdirSync(join(cwd, '.githooks'));
  mkdirSync(join(cwd, 'scripts'));
  cpSync(resolve(import.meta.dirname, '../.githooks/pre-commit'), join(cwd, '.githooks/pre-commit'));
  cpSync(checker, join(cwd, 'scripts/check-prompts.mjs'));
  chmodSync(join(cwd, '.githooks/pre-commit'), 0o755);
  f.git('config', 'core.hooksPath', '.githooks');
  f.git('add', '.');
  const commit = () => spawnSync('git', ['commit', '--allow-empty', '-qm', 'Check real hook'], { cwd }).status;
  assert.notEqual(commit(), 0);
  f.write(initial); f.git('add', 'PROMPTS.md');
  assert.equal(commit(), 0);
  f.write(initial + next);
  assert.notEqual(commit(), 0);
});


test('explicit PR-base validation accepts multiple valid commits while the local hook requires one step',t=>{
 const f=fixture(t);f.seed();const base=f.git('rev-parse','HEAD').trim();
 const digest=createHash('sha256').update(initial).digest('hex');
 f.write(`Prompt 1 | ${digest} | First distinct logical continuation\n\nPrompt 1 | ${digest} | Second distinct logical continuation\n`,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');
 assert.notEqual(f.check(),0);assert.equal(f.check('--base',base),0);
});
test('PR-base continuation validation rejects a bad or duplicate later entry',t=>{
 const f=fixture(t);f.seed();const base=f.git('rev-parse','HEAD').trim();const digest=createHash('sha256').update(initial).digest('hex');
 const first=`Prompt 1 | ${digest} | First distinct logical continuation`;
 for(const bad of [first,`Prompt 1 | ${'0'.repeat(64)} | Incorrect digest continuation`,`Prompt 2 | ${digest} | Incorrect latest prompt continuation`]){
  f.write(`${first}\n\n${bad}\n`,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.notEqual(f.check('--base',base),0);
 }
});

test('stacked PR-base comparison preserves both append-only branch histories without weakening local commit checks',t=>{
 const f=fixture(t);f.seed();const digest=createHash('sha256').update(initial).digest('hex');
 const first=`Prompt 1 | ${digest} | Common logical continuation\n`;
 const parent=`Prompt 1 | ${digest} | Parent logical continuation\n`;
 const child=`Prompt 1 | ${digest} | Child logical continuation\n`;
 f.write(first,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Common step');const common=f.git('rev-parse','HEAD').trim();
 f.write(first+parent,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Parent step');const base=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);f.write(first+child,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Child step');
 f.write(first+child+parent,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.equal(f.check(),0);assert.equal(f.check('--base',base),0);
 for(const invalid of [first+child,child+parent,first+child+parent+child]){f.write(invalid,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.notEqual(f.check('--base',base),0);}
});

test('merge commit preserves both parent histories and adds exactly one new continuation', t=>{
 const f=fixture(t);f.seed();const digest=createHash('sha256').update(initial).digest('hex');
 const step=description=>`Prompt 1 | ${digest} | ${description}\n`;
 const a=step('Parent first logical continuation'),b=step('Parent second logical continuation'),c=step('Child logical continuation'),d=step('Merge independent review checkpoints');
 const common=f.git('rev-parse','HEAD').trim();
 f.write(a+b,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Parent records');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);f.write(c,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Child record');
 f.write(parent+'\n','.git/MERGE_HEAD');
 for(const [value,ok] of [[c+a+b+d,true],[c+a+b,false],[c+b+a+d,false],[c+a+b+d+d,false]]){
  f.write(value,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.equal(f.check()===0,ok);
 }
});

test('PR continuations retain their exact committed prompt hash after a newer base prompt arrives', t=>{
 const f=fixture(t);f.seed();const firstHash=createHash('sha256').update(initial).digest('hex');
 const step=`Prompt 1 | ${firstHash} | Complete the original requested work\n`;
 f.write(step,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Original work');
 f.write(initial+next);f.git('add','PROMPTS.md');f.git('commit','-qm','New reviewer prompt');
 const head=f.git('rev-parse','HEAD').trim();
 // A base containing the new prompt but not the feature's prior continuation.
 f.git('checkout','--orphan','new-base');f.git('rm','-f','PROMPT_WORK.md');f.git('add','PROMPTS.md');f.git('commit','-qm','New base prompt');const base=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',head);
 assert.equal(f.check('--base',base),0);
 // Local commits still require the latest prompt, not an old valid hash.
 f.write(step+`Prompt 1 | ${firstHash} | Incorrect reuse of an older request\n`,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.notEqual(f.check(),0);
});

test('synthetic PR merge retains historical prompt hashes from both parent ancestries',t=>{
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const second=initial+next;
 const third=second+'\n## Prompt 3: Reviewer Followup\n\nThird reviewer request.\n';
 f.write(second);f.git('add','PROMPTS.md');f.git('commit','-qm','Second prompt on feature');
 const digest=createHash('sha256').update(second).digest('hex');
 const step=`Prompt 2 | ${digest} | Complete the illustrated feature work\n`;
 f.write(step,'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');f.git('commit','-qm','Feature continuation');
 f.write(third);f.git('add','PROMPTS.md');f.git('commit','-qm','Third prompt on feature');
 const feature=f.git('rev-parse','HEAD').trim(),tree=f.git('rev-parse','HEAD^{tree}').trim();
 f.git('checkout','--detach',common);f.write(third);f.git('add','PROMPTS.md');f.git('commit','-qm','Backport all later prompts at once');
 const base=f.git('rev-parse','HEAD').trim();
 const merge=f.git('commit-tree',tree,'-p',base,'-p',feature,'-m','Synthetic PR merge').trim();
 f.git('checkout','--detach',merge);
 assert.equal(f.check('--base',base),0);
 f.write(step.replace(digest,'0'.repeat(64)),'PROMPT_WORK.md');f.git('add','PROMPT_WORK.md');assert.notEqual(f.check('--base',base),0);
});


test('divergent prompt merge retains exact parent archive and canonical request order', t => {
  const f = fixture(t); f.seed(); const common = f.git('rev-parse', 'HEAD').trim();
  const parentLog = initial + next;
  const parentWork = `Prompt 2 | ${createHash('sha256').update(parentLog).digest('hex')} | Preserve the parent continuation\n`;
  f.write(parentWork, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md');
  f.write(parentLog); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Parent request');
  const parent = f.git('rev-parse', 'HEAD').trim();
  f.git('checkout', '--detach', common);
  const childLog = initial + next.replace('Second user request.', 'Different child request.');
  const childWork = `Prompt 2 | ${createHash('sha256').update(childLog).digest('hex')} | Preserve the child continuation\n`;
  f.write(childWork, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md');
  f.write(childLog); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Child request');
  f.write(parent + '\n', '.git/MERGE_HEAD');
  const combined = childLog + next.replace('Prompt 2:', 'Prompt 3:') + '\n';
  f.write(combined); f.git('add', 'PROMPTS.md');
  assert.notEqual(f.check(), 0, 'missing archive is rejected even when a new prompt is added');
  const directory = `docs/prompt-history/${parent}`;
  mkdirSync(join(f.git('rev-parse', '--show-toplevel').trim(), directory), {recursive: true});
  const path = `${directory}/PROMPTS.md`;
  f.write(parentLog, path); f.git('add', path);
  assert.notEqual(f.check(), 0, 'missing parent continuation is rejected');
  const work = childWork + parentWork;
  f.write(work, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md');
  assert.equal(f.check(), 0);
  for (const invalid of [parentWork, childWork, work.replace('parent continuation', 'altered continuation')]) {
    f.write(invalid, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md'); assert.notEqual(f.check(), 0);
  }
  f.write(work, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md');
  f.write(parentLog + 'changed', path); f.git('add', path); assert.notEqual(f.check(), 0);
  f.write(parentLog, path); f.git('add', path);
  f.git('update-index', '--chmod=+x', path); assert.notEqual(f.check(), 0);
  f.git('update-index', '--chmod=-x', path);
  f.write(combined.replace('Second user request.', 'Dropped parent text.')); f.git('add', 'PROMPTS.md'); assert.notEqual(f.check(), 0);
  for (const changed of [combined.replace('Second user request.\n', 'Second user request. \n'), combined.slice(0, -1), combined + '\n']) {
    f.write(changed); f.git('add', 'PROMPTS.md'); assert.notEqual(f.check(), 0, 'changed trailing whitespace is rejected');
  }
  f.write(combined); f.git('add', 'PROMPTS.md');
  f.git('commit', '-qm', 'Integrate both histories');
  assert.equal(f.check('--base', parent), 0, 'actual merged ancestor accepted in CI');
  for (const invalid of [childWork, work.replace('parent continuation', 'altered continuation')]) {
    f.write(invalid, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md'); assert.notEqual(f.check('--base', parent), 0);
  }
  f.write(work, 'PROMPT_WORK.md'); f.git('add', 'PROMPT_WORK.md');
  f.write(combined.replace('Different child request.', 'Rewritten child request.')); f.git('add', 'PROMPTS.md');
  assert.notEqual(f.check(), 0, 'archive never permits ordinary local history rewriting');
});


test('later stacked integration recognizes only a Git-verified inherited record separator', t => {
  const f = fixture(t); f.seed();
  const original = initial + next + '\n';
  f.write(original); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Original request bytes');
  const origin = f.git('rev-parse', 'HEAD').trim();
  const third = '## Prompt 3: Parent Addition\n\nParent request.\n';
  const parentLog = original + '\n' + third;
  const archive = revision => {
    const directory = `docs/prompt-history/${revision}`;
    mkdirSync(join(f.git('rev-parse', '--show-toplevel').trim(), directory), {recursive:true});
    const path = `${directory}/PROMPTS.md`;
    f.write(f.git('show', `${revision}:PROMPTS.md`), path); f.git('add', path);
  };
  archive(origin); f.write(parentLog); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Earlier reconciled separator');
  const parent = f.git('rev-parse', 'HEAD').trim();
  f.git('checkout', '--detach', origin);
  const childLog = original + third.replace('Parent', 'Child').replace('Parent request.', 'Child request.');
  f.write(childLog); f.git('add', 'PROMPTS.md'); f.git('commit', '-qm', 'Child history');
  f.write(parent + '\n', '.git/MERGE_HEAD'); archive(parent);
  const combined = childLog + third.replace('Prompt 3:', 'Prompt 4:') + '\n';
  f.write(combined); f.git('add', 'PROMPTS.md'); assert.equal(f.check(), 0);
  f.write(combined.replace('Second user request.', 'Second user request. ')); f.git('add', 'PROMPTS.md'); assert.notEqual(f.check(), 0);
  f.write(combined.replace('Parent request.\n', 'Parent request.\n\n')); f.git('add', 'PROMPTS.md'); assert.notEqual(f.check(), 0);
});


test('explicit structural separators retain exact request whitespace and reject undeclared changes', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const parentLog=initial+next;
 f.write(parentLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent prompt');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);const childLog=initial+next.replace('Second user request.','Child user request.');
 f.write(childLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Child prompt');f.write(parent+'\n','.git/MERGE_HEAD');
 const dir=`docs/prompt-history/${parent}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});
 f.write(parentLog,`${dir}/PROMPTS.md`);f.git('add',dir);
 const combined=childLog+next.replace('Prompt 2:','Prompt 3:')+'\n\n';
 f.write(combined);f.git('add','PROMPTS.md');assert.notEqual(f.check(),0,'default one LF does not accept two');
 const metadata={sourceCommit:parent,recordSeparator:'\n\n'};
 f.write(JSON.stringify(metadata),`${dir}/separator.json`);f.git('add',dir);assert.equal(f.check(),0);
 for(const altered of [combined+'\n',combined.slice(0,-1),combined.replace('Second user request.','Second user request. ')]) {f.write(altered);f.git('add','PROMPTS.md');assert.notEqual(f.check(),0);}
 f.write(combined);f.git('add','PROMPTS.md');
 f.write(JSON.stringify({...metadata,sourceCommit:common}),`${dir}/separator.json`);f.git('add',dir);assert.notEqual(f.check(),0);
 f.write(JSON.stringify(metadata),`${dir}/separator.json`);f.git('add',dir);f.git('commit','-qm','Merge exact records');assert.equal(f.check('--base',parent),0);
});

test('reintegrating a parent retains its formerly final request already archived by child', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const parentOld=initial+next;f.write(parentOld);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent original');const old=f.git('rev-parse','HEAD').trim();
 const later='## Prompt 3: Parent Later\n\nLater parent request.\n';
 const parentNew=parentOld+'\n'+later;f.write(parentNew);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent later');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);
 const child=initial+next.replace('Second user request.','Child request.')+next.replace('Prompt 2:','Prompt 3:')+'\n## Prompt 4: Child Later\n\nChild later request.\n';f.write(child);
 const archive=(ref)=>{const dir=`docs/prompt-history/${ref}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(f.git('show',`${ref}:PROMPTS.md`),`${dir}/PROMPTS.md`);f.git('add',dir);};
 archive(old);f.git('add','PROMPTS.md');f.git('commit','-qm','Child retained original parent');
 f.write(parent+'\n','.git/MERGE_HEAD');archive(parent);
 const combined=child+'\n'+later.replace('Prompt 3:','Prompt 5:')+'\n';f.write(combined);f.git('add','PROMPTS.md');assert.equal(f.check(),0);
 for(const bad of [combined.replace('Second user request.\n','Second user request. \n'),combined.replace('Second user request.\n\n','Second user request.\n'),combined.replace('Later parent request.\n','Later parent request.\n\n')]){f.write(bad);f.git('add','PROMPTS.md');assert.notEqual(f.check(),0);}
});

test('reintegrating a parent respects the child declared two-LF record separator', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const parentOld=initial+next;f.write(parentOld);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent original');const old=f.git('rev-parse','HEAD').trim();
 const later='## Prompt 3: Parent Later\n\nLater parent request.\n';
 const parentNew=parentOld+'\n'+later;f.write(parentNew);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent later');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);
 const child=initial+next.replace('Second user request.','Child request.')+next.replace('Prompt 2:','Prompt 3:')+'\n\n## Prompt 4: Child Later\n\nChild later request.\n';f.write(child);
 const archive=(ref)=>{const dir=`docs/prompt-history/${ref}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(f.git('show',`${ref}:PROMPTS.md`),`${dir}/PROMPTS.md`);f.git('add',dir);};
 archive(old);f.git('add','PROMPTS.md');f.git('commit','-qm','Child retained original parent');
 f.write(parent+'\n','.git/MERGE_HEAD');archive(parent);f.write(JSON.stringify({sourceCommit:parent,recordSeparator:'\n\n'}),`docs/prompt-history/${parent}/separator.json`);f.git('add',`docs/prompt-history/${parent}/separator.json`);
 const combined=child+'\n'+later.replace('Prompt 3:','Prompt 5:')+'\n\n';f.write(combined);f.git('add','PROMPTS.md');assert.equal(f.check(),0);
 for(const bad of [combined.replace('Second user request.\n','Second user request. \n'),combined.replace('Second user request.\n\n','Second user request.\n'),combined.replace('Later parent request.\n','Later parent request.\n\n')]){f.write(bad);f.git('add','PROMPTS.md');assert.notEqual(f.check(),0);}
});

test('post-merge appended prompt retains the exact copied final parent record in base checks', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();const parentLog=initial+next;
 f.write(parentLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent request');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);const child=initial+next.replace('Second user request.','Child request.');f.write(child);f.git('add','PROMPTS.md');f.git('commit','-qm','Child request');
 const dir=`docs/prompt-history/${parent}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(parentLog,`${dir}/PROMPTS.md`);f.git('add',dir);f.write(parent+'\n','.git/MERGE_HEAD');
 const merged=child+next.replace('Prompt 2:','Prompt 3:')+'\n';f.write(merged);f.git('add','PROMPTS.md');assert.equal(f.check(),0);f.git('commit','-qm','Merge copied parent request');
 const appended=merged+'\n## Prompt 4: Later Work\n\nLater request.\n';f.write(appended);f.git('add','PROMPTS.md');f.git('commit','-qm','Append later request');assert.equal(f.check('--base',parent),0);
 for(const bad of [appended.replace('Second user request.','Second user request. '),appended.replace('Second user request.\n\n\n','Second user request.\n\n')]){f.write(bad);f.git('add','PROMPTS.md');assert.notEqual(f.check('--base',parent),0);}
});

test('shared Git ancestor proves a final common request without inventing an archive', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const parentLog=initial+next;f.write(parentLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent adds structural separator');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);const childLog=initial+next.slice(1).replace('Second user request.','Child request.');f.write(childLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Child exact original prefix');
 const dir=`docs/prompt-history/${parent}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(parentLog,`${dir}/PROMPTS.md`);f.git('add',dir);f.write(parent+'\n','.git/MERGE_HEAD');
 const combined=childLog+next.replace('Prompt 2:','Prompt 3:')+'\n';f.write(combined);f.git('add','PROMPTS.md');assert.equal(f.check(),0);
 f.write(combined.replace('First user request.','First user request. '));f.git('add','PROMPTS.md');assert.notEqual(f.check(),0);
});

test('earlier append-only common history proves original shared final record', t => {
 const f=fixture(t);f.seed();f.write(initial+next);f.git('add','PROMPTS.md');f.git('commit','-qm','Shared append');const common=f.git('rev-parse','HEAD').trim();
 const later='\n## Prompt 3: Parent Work\n\nLater parent request.\n';
 const parentLog=initial+next+later;f.write(parentLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent adds later request');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);const childLog=initial+next.slice(1).replace('Second user request.','Child request.');f.write(childLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Retained historical child log');
 const dir=`docs/prompt-history/${parent}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(parentLog,`${dir}/PROMPTS.md`);f.git('add',dir);f.write(parent+'\n','.git/MERGE_HEAD');
 const combined=childLog+next.replace('Prompt 2:','Prompt 3:')+'\n'+later.replace('Prompt 3:','Prompt 4:')+'\n';f.write(combined);f.git('add','PROMPTS.md');assert.equal(f.check(),0);
 f.write(combined.replace('First user request.','First user request. '));f.git('add','PROMPTS.md');assert.notEqual(f.check(),0);
});

test('sibling integration recognizes only committed common-prefix append separators', t => {
 const f=fixture(t);f.seed();const common=f.git('rev-parse','HEAD').trim();
 const parentLog=initial+next.slice(1);f.write(parentLog);f.git('add','PROMPTS.md');f.git('commit','-qm','Parent historical separator');const parent=f.git('rev-parse','HEAD').trim();
 f.git('checkout','--detach',common);const child=initial+next.replace('Second user request.','Child request.');f.write(child);f.git('add','PROMPTS.md');f.git('commit','-qm','Child append proves separator');
 const dir=`docs/prompt-history/${parent}`;mkdirSync(join(f.git('rev-parse','--show-toplevel').trim(),dir),{recursive:true});f.write(parentLog,`${dir}/PROMPTS.md`);f.git('add',dir);f.write(parent+'\n','.git/MERGE_HEAD');
 const combined=child+next.replace('Prompt 2:','Prompt 3:')+'\n';f.write(combined);f.git('add','PROMPTS.md');assert.equal(f.check(),0);f.git('commit','-qm','Integrate sibling parent');assert.equal(f.check('--base',parent),0);
 for(const bad of [combined.replace('First user request.','First user request. '),combined.replace('First user request.\n\n','First user request.\n\n\n')]){f.write(bad);f.git('add','PROMPTS.md');assert.notEqual(f.check('--base',parent),0);}
});
