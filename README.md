# tokenops

[![npm](https://img.shields.io/npm/v/@greymoth/tokenops?color=FF3B12)](https://www.npmjs.com/package/@greymoth/tokenops) · MIT · 100% local

![Claude Code cost concentration](examples/waste-card.png)

A local CLI that **audits your real Claude Code token cost and hands you data-validated optimization actions**. It reads `~/.claude/projects` and sends nothing. Cost figures are estimates (there's no public Claude tokenizer) and are labeled as such.

Reuses the cc-usage engine + fonts.

## Try it (no setup)

```bash
npx @greymoth/tokenops demo    # synthetic data — try it without your own usage
npm i -g @greymoth/tokenops    # global install
tokenops report                # analyze your own ~/.claude
```

## Why I built it — I measured, and the common advice fell apart

37 days, ~188k messages:

| component | share |
|---|---|
| cacheRead | **72%** |
| cacheWrite | 18.6% |
| output | 9% |
| **input** | **0.3%** |

opus was 91.6% of the cost, and it concentrates in a few mega-sessions (top 8 ≈ half the spend, re-reading ~500k tokens of context every turn).

So "compress your prompts" (LLMLingua and friends) is **pointless for this profile** — input is 0.3%. Worse, compressing a static prompt breaks the prefix cache, so it can cost *more*. After triangulating with parallel research + self-kill:

- **Rejected here**: input compression · semantic-caching outputs (broken for agentic work) · per-turn model switching (resets the prefix cache).
- **What actually works**: ① cache hygiene ② boundary (whole-session) model selection ③ output discipline.

## Commands

```bash
tokenops report     # cost by component + by-model (default)
tokenops advise     # prioritized, $-quantified actions
tokenops waste      # per-session waste + cost concentration
tokenops trend      # weekly cost trend (actual spend)
tokenops doctor     # weigh always-on context (CLAUDE.md + memory) as cache cost — fast, no scan
tokenops card       # share cards → _out/  (add --anon to hide project names)
tokenops portfolio  # one-page story → _out/portfolio.html
tokenops demo       # run on synthetic data (try it without your own usage)
```

The 3 levers (ordered by cost share):

1. **CACHE HYGIENE** — bloated sessions (≥300k ctx/turn) carry the bill. Use milestone `/compact`, `/clear` before ~70%, and keep `CLAUDE.md`/tools **static** (dynamic content busts the prefix cache).
2. **BOUNDARY ROUTING** — route a whole mechanical session to a cheaper tier. **Never mid-session** — that resets the prefix cache and costs more.
3. **OUTPUT DISCIPLINE** — terser, structured output. (Input compression isn't worth it — input is ~0.3%.)

## Honesty / privacy

- Sends nothing. Reads local JSONL only.
- Costs use the engine's estimate rates (cacheRead 0.1×, cacheWrite 1.25×/2×). No exaggeration — if you're on Max/Pro this is extracted value, not real spend.
- The card's AFTER is a **conservative** estimate from transparent lever math + an overlap discount — not a fabricated "97% saved". A `#final` deterministic mode lets you verify the end state.

## Layout

- `lib.mjs` — one scan → per-session aggregates + component cost (reuses the cc-usage engine). Self-check: `node lib.mjs`.
- `advisor.mjs` / `observatory.mjs` / `savings-card.mjs` / `doctor.mjs` / `demo.mjs` — each exports a function and has a small CLI.
- `bin/tokenops.mjs` — one scan feeds every subcommand.

> `engine.mjs` and the fonts are vendored from cc-usage (the author's own work). Self-contained; `npm pack`-able. MIT.
