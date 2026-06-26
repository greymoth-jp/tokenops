# tokenops

**Find out where your Claude Code spend actually goes — then get $-quantified actions to cut it. Local-only, sends nothing.**

> Claude Codeのコスト実態を出し、データ検証済みの最適化アドバイスとBefore→After共有カードを生成。ローカルのみ。

[![npm](https://img.shields.io/npm/v/@greymoth/tokenops?color=FF3B12&label=npm)](https://www.npmjs.com/package/@greymoth/tokenops)
[![license](https://img.shields.io/badge/license-MIT-111111)](./LICENSE)
![no network](https://img.shields.io/badge/network_calls-0-23502f)

![Claude Code cost concentration](examples/waste-card.png)

A local CLI that **audits your real Claude Code token cost and hands you data-validated optimization actions**. It reads `~/.claude/projects`, computes cost by component (cacheRead / cacheWrite / output / input) and by model, finds your most expensive sessions, and tells you which lever actually moves the bill. Sends nothing; cost figures are estimates (there's no public Claude tokenizer) and are labeled as such everywhere.

## Quickstart — try it in 10 seconds, no setup

```bash
npx @greymoth/tokenops demo    # runs on synthetic data — no Claude usage of your own needed
```

Then point it at your real `~/.claude`:

```bash
npm i -g @greymoth/tokenops
tokenops report                # cost by component + by model
tokenops advise                # prioritized, $-quantified actions
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

## What the output looks like

`tokenops demo` on synthetic data (so you can see the shape before you run it on your own):

```
tokenops report · 34 days · 26,500 msgs
est. API-equivalent cost: $6,842  (estimate · API-equivalent value, not subscription spend)

cost by component:
  cacheRead   11.47B    $5,299   77.4%
  cacheWrite  189.0M    $1,069   15.6%
  output       20.3M   $464.45    6.8%
  input         2.3M     $9.87    0.1%
  → the lever is cache (90%+), not input (0.1%).

① CACHE HYGIENE   — 7 bloated sessions (≥300k ctx/turn) · est reclaimable $1,881
② BOUNDARY ROUTING — 1 low-yield opus session · est $137.58
③ OUTPUT DISCIPLINE — output is 6.8% · est $139.33
```

## Honesty / privacy

- **Sends nothing.** Reads local JSONL only — no network calls, no account, no API key.
- Costs use the engine's estimate rates (cacheRead 0.1×, cacheWrite 1.25×/2×). No exaggeration — if you're on Max/Pro this is *extracted value*, not real spend.
- The card's AFTER is a **conservative** estimate from transparent lever math + an overlap discount — not a fabricated "97% saved". A `#final` deterministic mode lets you verify the end state.

**What it does *not* do:** it isn't a billing reconciler (there's no public Claude tokenizer, so totals are close, not exact), it doesn't change your settings or files, and it doesn't touch the network — it reads, measures, and prints.

> Vendors `engine.mjs` + fonts from the author's own [cc-usage](https://github.com/greymoth-jp/ccwrapped) / ccwrapped work. Self-contained; `npm pack`-able. MIT.
