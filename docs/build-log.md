# Build log

Running notes for the blog post. Newest entries at the bottom.

## 2026-10-20: Day 1, Milestone 0 (setup and spikes)

- Reviewed CLAUDE.md with the agent before writing code. Fixed a bug in the spec's next-reminder rule: with an offset that crosses a year boundary (e.g. 3 Jan birthday, 14-day offset, checked on 25 Dec), "try this year, then next year" can still return a past date. The rule now advances year by year until the reminder is in the future.
- Pinned down the delivery-estimate rule (order day not counted, weekend orders start Monday).
- Primary test device: iPhone.
- Repo initialised with `.gitignore`, README stub and this log.
