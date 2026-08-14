# Unattended Cloud Agent prompt — Michi Binder V1

Jacob is away. Paste **everything in the box below** into a Cursor Cloud Agent on repo
`jfmayeda/michi-binder`, branch `main`. Use this exact text for both runs (Grok 4.6 and
GPT-5.6 Sol at 272K). This file is the prompt; `AGENTS.md` remains the standing rules for
attended work.

---

```
You are the solo coding agent for Michi Binder Studio. Jacob approved docs/plan.md on 2026-08-14 and is unavailable. You write ALL product code yourself. Do not delegate implementation to Composer or any cheaper model. Built-in explore / browser / terminal helpers are fine.

THIS RUN OVERRIDES AGENTS.md on two points only:
1. Do NOT stop to ask Jacob. Do NOT stop at Gates 1–4.
2. If a decision is not in the docs: pick the smallest option that unblocks, log it, continue.

Every other AGENTS.md rule still binds: cozy tokens over default Tailwind/shadcn, print math, non-destructive media, AT-1…AT-11 as exhaustive tests, 2D fallback required, no pricing/inventory/community-backend/card-proxy scope.

## Read first, in this order
AGENTS.md, docs/PRD.md, docs/architecture.md, docs/data-model.md, docs/plan.md, docs/decisions.md, docs/agent-runbook.md. Then execute.

## How to work
- Scaffold in this repo root (it is already apps/michi-binder). Match architecture.md §9. Do not run a stock create-next-app that pulls default shadcn styling and leave it. Tokens from T1.2 are the theme.
- Execute plan.md tasks IN ORDER using the corresponding prompt in docs/agent-runbook.md.
- After EACH task: re-read that task's acceptance criteria. Prove them with command output and/or a screenshot. Only then start the next task.
- One logical git commit per task. Never force-push. Never commit .env, .env.local, or secrets.
- Supabase URL / publishable key / service role are already injected as environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). Use them. Do not print secret values. Do not write secrets into the repo. You may write .env.local locally if needed; it is gitignored.

## Gates (do not stop — log instead)
Append every skipped gate, invented assumption, BLOCKED task, and unverified item to docs/unattended-log.md as you go.

- Gate 1 (tokens + flip feel): use your best cozy/scrapbook judgment (PRD Design Language). Screenshot /dev/styleguide and /dev/flip. Continue.
- Gate 2 (color clusters): eyeball /dev/color-check, log what you see, continue to full-catalog color only if the one-set pass looks sane.
- Gate 3 (print + ruler): generate the calibration PDF and one real export. You cannot physically print. Log "needs Jacob ruler check." Continue.
- Gate 4: skip. Open the PR instead.
- D3: if CSS 3D is janky, keep CSS 3D AND ship the 2D fallback. Do NOT switch to WebGL.
- Safari backface: Cloud is Linux/Chrome. Log "Safari unverified."
- M5 draft content (templates, theme collections, art packs): ship documented placeholders; Jacob curates later.
- T5.1–T5.3: apply migrations and wire auth against the injected Supabase env. If live auth still fails after two honest attempts, log BLOCKED, leave migrations + adapter in place, continue with playground persistence.

## Stuck protocol
Same task fails twice → mark BLOCKED in the log with what you tried, skip it, continue. Do not burn the run looping. If you cannot scaffold (T1.1) or cannot get tokens+flip (M1) working, stop and open a PR with what exists — later milestones depend on M1.

## Done
When the plan is finished, or you are blocked past M3, or you cannot usefully continue:
1. Capture artifacts: /dev/styleguide, /dev/flip (and 2D fallback), editor with a merge, one export/calibration PDF.
2. Commit docs/unattended-log.md.
3. Open a PR to main titled: "V1 unattended — <your model name>"
4. PR body: what shipped, what's BLOCKED, where Jacob should look first (flip + styleguide).

Start at T1.1 now.
```
