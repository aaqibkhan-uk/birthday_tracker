# Session starter prompt

Paste this after `/clear` to start a new Claude Code session. CLAUDE.md and project memory load automatically, so the prompt only says where we are and what "done" means.

**When to clear:** after every commit, unless the next step works on the same files. Small, tightly linked milestones (e.g. Milestone 2) can stay in one conversation. Plan a milestone and do its first step in the same conversation.

## Template

```
We're on Milestone <N>: <step, e.g. "domain date functions + tests (section 8)">.

1. Check `git log --oneline -5` and `git status` to confirm where we are.
2. <Choose one:>
   - Plan this step in under 15 lines and wait for my approval.
   - Go ahead and implement it.
3. If anything is ambiguous, ask all your questions in one batch before starting.

Done means: tests, lint and typecheck pass; app still opens in Expo Go;
CLAUDE.md progress / decision log updated if anything changed; committed and pushed.
Stay within this step: nothing from later milestones.

When finished, reply briefly: what changed, how I verify it on my iPhone
(if relevant), and the next step.
```

## Tips

- Use "plan and wait" for big steps or anything touching the data model; use "go ahead" for small, clear steps.
- Paste only the relevant lines of terminal output (errors, last ~20 lines), not whole logs.
- Ask for images or screenshots to be reviewed only when an opinion on them is needed.
- Say "quick check" when web research doesn't need to be thorough.
- Anything decided in chat must end up in CLAUDE.md or `docs/build-log.md` before clearing.
