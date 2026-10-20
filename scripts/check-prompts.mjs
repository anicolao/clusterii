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
  if (!staged.startsWith(previous)) fail('Preserve existing prompt history byte for byte.');
  const latest = validateLog(staged);
  if (staged.length > previous.length) {
    const added = staged.slice(previous.length);
    if (!/(?:^|\n)## Prompt [1-9][0-9]*: /m.test(added)) {
      fail('Append a complete new prompt, not just text after an existing entry.');
    }
    console.log('Prompt log check passed.');
  } else {
    const work = git(['show', ':PROMPT_WORK.md']);
    const oldWork = base ? trackedAt(base, 'PROMPT_WORK.md') : '';
    let lines;
    const merging = !args.length && spawnSync('git', ['rev-parse', '--verify', 'MERGE_HEAD'], {stdio:'ignore'}).status === 0;
    const inherited = new Set(oldWork.split('\n').filter(Boolean));
    if (merging) {
      const otherPrompt = trackedAt('MERGE_HEAD', 'PROMPTS.md');
      if (!staged.startsWith(otherPrompt)) fail('Preserve merging prompt history byte for byte.');
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
      for (const revision of git(['rev-list', 'HEAD', '--', 'PROMPTS.md']).trim().split('\n').filter(Boolean)) {
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
