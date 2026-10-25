import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function trackedAt(ref, path) {
  return git(['ls-tree', '--name-only', ref, '--', path]).trim()
    ? git(['show', `${ref}:${path}`]) : '';
}

function validateLog(log) {
  if (!log.startsWith('# Project prompts\n\n')) fail('Missing project prompt-log header.');
  const entries = [...log.matchAll(/^## Prompt ([1-9][0-9]*): ([^\n]+)\n\n/gm)];
  if (!entries.length) fail('Record at least one verbatim user prompt.');
  if ([...log.matchAll(/^## Prompt /gm)].length !== entries.length) {
    fail('Every prompt needs a numbered heading, summary, and blank line.');
  }
  for (const [index, entry] of entries.entries()) {
    if (Number(entry[1]) !== index + 1) fail('Prompt numbers must be consecutive from 1.');
    if (!/^\S+(?: \S+){1,2}$/.test(entry[2])) fail('Use a 2–3 word summary.');
    const body = log.slice(entry.index + entry[0].length, entries[index + 1]?.index ?? log.length);
    if (!body.trim()) fail('Prompt bodies must be nonempty.');
  }
  return entries.at(-1)[1];
}

// Divergent stacked branches can each append the same next prompt number.
// Keep the child's file append-only and retain the other complete log at an
// immutable commit-addressed path; its requests must also occur in order here.
function preservePromptHistory(staged, previous, ref, allowArchive = false) {
  if (staged.startsWith(previous)) return false;
  if (!allowArchive) fail('Preserve existing prompt history byte for byte.');
  const revision = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  const path = `docs/prompt-history/${revision}/PROMPTS.md`;
  const entry = git(['ls-files', '--stage', '--', path]);
  if (!new RegExp(`^100644 [0-9a-f]+ 0\\t${path.replaceAll('.', '\\.')}\\n$`).test(entry)
      || git(['show', `:${path}`]) !== previous) {
    fail('Preserve divergent parent prompt history in an exact regular commit-addressed archive.');
  }
  validateLog(previous);
  const records = log => [...log.matchAll(/^## Prompt [1-9][0-9]*: ([^\n]+)\n\n([\s\S]*?)(?=^## Prompt |$(?![\s\S]))/gm)]
    .map(match => `${match[1]}\n\n${match[2]}`);
  const prior = records(previous), current = records(staged);
  // A preceding integration may already have copied a request with its single
  // structural LF. Recognize that separator only from its exact Git-verified
  // ancestor archive, never by trimming arbitrary request whitespace.
  const originals = new Set();
  for (const archive of git(['ls-tree', '-r', '--name-only', revision, '--', 'docs/prompt-history']).trim().split('\n')) {
    const match = /^docs\/prompt-history\/([0-9a-f]{40})\/PROMPTS\.md$/.exec(archive);
    if (!match || spawnSync('git', ['merge-base', '--is-ancestor', match[1], revision], {stdio:'ignore'}).status !== 0) continue;
    const archived = trackedAt(revision, archive);
    if (archived !== trackedAt(match[1], 'PROMPTS.md')) fail('Inherited prompt archive differs from its source commit.');
    for (const record of records(archived)) originals.add(record);
  }
  const same = (record, priorRecord) => record === priorRecord
    || (originals.has(record) && priorRecord === `${record}\n`);

  let cursor = 0;
  while (cursor < prior.length && same(current[cursor], prior[cursor])) cursor++;
  // Reconciled records are appended with exactly one additional LF separator.
  // Never trim body bytes: trailing spaces and every original newline survive.
  for (const record of current.slice(cursor)) if (record === `${prior[cursor]}\n`) cursor++;
  if (cursor !== prior.length) fail('Retain every archived parent request verbatim and in order in the canonical log.');
  return true;
}

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--base')) {
    fail('Usage: node scripts/check-prompts.mjs [--base REVISION]');
  }
  let base = args[1];
  if (!base && spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { stdio: 'ignore' }).status === 0) {
    base = 'HEAD';
  }
  const entries = git(['ls-files', '--stage', '--', 'PROMPTS.md']);
  if (!/^100644 [0-9a-f]+ 0\tPROMPTS\.md\n$/.test(entries)) {
    fail('Stage PROMPTS.md as a regular file with the verbatim user prompts.');
  }
  const staged = git(['show', ':PROMPTS.md']);
  const previous = base ? trackedAt(base, 'PROMPTS.md') : '';
  const merging = !args.length && spawnSync('git', ['rev-parse', '--verify', 'MERGE_HEAD'], {stdio:'ignore'}).status === 0;
  if (merging) preservePromptHistory(staged, trackedAt('MERGE_HEAD', 'PROMPTS.md'), 'MERGE_HEAD', true);
  const latest = validateLog(staged);
  const baseIsAncestor = args.length && spawnSync('git', ['merge-base', '--is-ancestor', base, 'HEAD'], {stdio:'ignore'}).status === 0;
  const archivedBase = preservePromptHistory(staged, previous, base, baseIsAncestor);
  if (archivedBase || merging) {
    const stagedWork = git(['ls-files', '--stage', '--', 'PROMPT_WORK.md']);
    const parents = merging ? ['HEAD', 'MERGE_HEAD'] : [base];
    const priorWork = parents.map(ref => trackedAt(ref, 'PROMPT_WORK.md'));
    if (priorWork.some(Boolean)) {
      if (!/^100644 [0-9a-f]+ 0\tPROMPT_WORK\.md\n$/.test(stagedWork)) fail('Retain inherited continuation history as a regular file.');
      const all = git(['show', ':PROMPT_WORK.md']).split('\n').filter(Boolean);
      if (new Set(all).size !== all.length) fail('Do not duplicate continuation records.');
      for (const parent of priorWork) {
        const prior = parent.split('\n').filter(Boolean); let cursor = 0;
        for (const line of all) if (line === prior[cursor]) cursor++;
        if (cursor !== prior.length) fail('Preserve inherited continuation records verbatim and in order.');
      }
    }
  }
  if (archivedBase || staged.length > previous.length) {
    const added = archivedBase ? staged : staged.slice(previous.length);
    if (!/(?:^|\n)## Prompt [1-9][0-9]*: /m.test(added)) {
      fail('Append a complete new prompt, not just text after an existing entry.');
    }
    console.log('Prompt log check passed.');
  } else {
    const work = git(['show', ':PROMPT_WORK.md']);
    const oldWork = base ? trackedAt(base, 'PROMPT_WORK.md') : '';
    let lines;
    const inherited = new Set(oldWork.split('\n').filter(Boolean));
    if (merging) {
      const otherPrompt = trackedAt('MERGE_HEAD', 'PROMPTS.md');
      preservePromptHistory(staged, otherPrompt, 'MERGE_HEAD', true);
      const parents = [oldWork, trackedAt('MERGE_HEAD', 'PROMPT_WORK.md')];
      for (const parent of parents) {
        const prior = parent.split('\n').filter(Boolean); let cursor = 0;
        for (const line of work.split('\n').filter(Boolean)) if (line === prior[cursor]) cursor++;
        if (cursor !== prior.length) fail('Preserve both merging continuation histories.');
        for (const line of prior) inherited.add(line);
      }
      const all = work.split('\n').filter(Boolean);
      if (new Set(all).size !== all.length) fail('Do not duplicate continuation records.');
      lines = all.filter(line => !inherited.has(line));
    } else if (!args.length) {
      if (!work.startsWith(oldWork)) fail('Preserve existing continuation history.');
      lines = work.slice(oldWork.length).trim().split('\n').filter(Boolean);
    } else {
      // A stacked merge keeps each parent's records verbatim and in order,
      // while its other branch can contribute intervening continuation entries.
      const prior=oldWork.split('\n').filter(Boolean);let cursor=0;lines=[];
      for(const line of work.split('\n').filter(Boolean)) {
        if(line===prior[cursor])cursor++;else lines.push(line);
      }
      if(cursor!==prior.length)fail('Preserve existing continuation history.');
    }
    // A commit appends one step; CI's explicit PR base can span several commits.
    if (!lines.length || (!args.length && lines.length !== 1)) fail('Append one unique continuation per commit.');
    const digest = createHash('sha256').update(staged).digest('hex');
    const historical = new Set([`Prompt ${latest} | ${digest}`]);
    if (args.length) {
      // A PR can include continuations committed before a newer prompt arrived
      // on its base. Accept only exact logs from its own committed ancestry.
      for (const revision of git(['rev-list', '--full-history', 'HEAD', '--', 'PROMPTS.md']).trim().split('\n').filter(Boolean)) {
        const log = trackedAt(revision, 'PROMPTS.md');
        if (log && staged.startsWith(log)) historical.add(`Prompt ${validateLog(log)} | ${createHash('sha256').update(log).digest('hex')}`);
      }
    }
    const seen = new Set(oldWork.split('\n'));
    for (const line of lines) {
      const parts = line.split(' | ');
      if (parts.length !== 3 || !historical.has(`${parts[0]} | ${parts[1]}`)
          || !/^[^\r\n]{10,200}$/.test(parts[2]) || seen.has(line)) {
        fail('Append a unique continuation for the latest prompt and exact staged log SHA-256.');
      }
      seen.add(line);
    }
    console.log('Prompt continuation check passed.');
  }
} catch (error) {
  console.error(`Prompt log check failed: ${error.message}`);
  process.exitCode = 1;
}
