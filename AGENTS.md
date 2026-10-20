# Project instructions

README.md and VISION.md are the plan of record. Describe the design directly and assertively. Distinguish the design contract from implementation status.

Record every user prompt concerning this project verbatim in PROMPTS.md, including corrections and follow-up requests. Append each prompt once, in conversation order, under the next `## Prompt N: Summary` heading. Use a 2–3 word summary, a blank line, and the verbatim prompt. Preserve spelling, punctuation, capitalization, and line breaks. Exclude assistant messages and automatically supplied environment context.

Update the log before other project work. Never rewrite or remove entries, and never invent or duplicate prompts to satisfy a hook. Stage new entries with the related work.

Install the versioned pre-commit hook with `git config core.hooksPath .githooks`. It checks the staged index for a new prompt or an explicit continuation. It cannot verify the conversation; the agent is responsible for the verbatim copy.

For multiple commits responding to the same prompt, append one unique logical step to PROMPT_WORK.md:

```text
Prompt N | SHA256 | Description of this continuation
```

`N` is the latest prompt number. `SHA256` is the lowercase SHA-256 of the exact staged PROMPTS.md bytes. The description is 10–200 characters on one line and identifies a distinct step. Preserve existing records. A new user request requires a new prompt entry, not a continuation.

For supervised work, the supervising agent logs human requests verbatim in meta-prompts.md and identifies its own handoffs and findings separately. The implementation agent logs delegated instructions in PROMPTS.md, explicitly attributed to the reviewer, and refers to the relevant meta-prompts.md entry instead of duplicating the human request. Direct human requests still belong in PROMPTS.md. Do not rewrite historical entries to change attribution.

Commit and push requested changes to the active PR before reporting them complete. Never merge a review PR unless the user asks. Keep the public repository licensed under GPL-3.0-only.
