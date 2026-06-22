#!/usr/bin/env node
// tokenops — Claude Code cost truth + data-validated optimization advice + share card.
// ONE scan of ~/.claude/projects feeds every subcommand. Local-only. Cost = ESTIMATE.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scan, usd, tok, shortModel } from "../lib.mjs";
import { advise } from "../advisor.mjs";
import { observatory, trend } from "../observatory.mjs";
import { buildCard, buildAnimatedHTML, buildWasteCard } from "../savings-card.mjs";
import { buildPortfolio } from "../portfolio.mjs";
import { doctor } from "../doctor.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function report(data) {
  const { totals, models, days } = data, c = totals.c, T = totals.cost;
  const p = (v) => (v / T * 100).toFixed(1) + "%";
  const L = [];
  L.push(`tokenops report · ${days.length} days (${days[0]} → ${days[days.length - 1]}) · ${totals.msgs.toLocaleString()} msgs`);
  L.push(`est. API-equivalent cost: ${usd(T)}  (推定 · Max/Pro 購読なら抽出価値で実支払いでない)`);
  L.push("");
  L.push("cost by component:");
  L.push(`  cacheRead  ${tok(totals.read).padStart(7)}  ${usd(c.read).padStart(11)}  ${p(c.read).padStart(6)}`);
  L.push(`  cacheWrite ${tok(totals.write).padStart(7)}  ${usd(c.write).padStart(11)}  ${p(c.write).padStart(6)}`);
  L.push(`  output     ${tok(totals.outTok).padStart(7)}  ${usd(c.out).padStart(11)}  ${p(c.out).padStart(6)}`);
  L.push(`  input      ${tok(totals.inTok).padStart(7)}  ${usd(c.in).padStart(11)}  ${p(c.in).padStart(6)}`);
  L.push(`  → the lever is cache (90%+), not input (${p(c.in)}).`);
  L.push("");
  L.push("by model:");
  for (const [m, v] of Object.entries(models).sort((a, b) => b[1].cost - a[1].cost))
    L.push(`  ${shortModel(m).padEnd(24)} ${usd(v.cost).padStart(11)}  ${p(v.cost).padStart(6)}  ${v.msgs.toLocaleString()} msg`);
  return L.join("\n");
}

function help() {
  return `tokenops <command>   — Claude Code cost truth + optimization advice (local-only · estimate)
  report     cost by component + by-model (default)
  advise     prioritized, $-quantified actions: cache hygiene > boundary routing > output
  waste      per-session waste + cost concentration
  trend      weekly cost trend (actual spend)
  doctor     weigh always-on context (CLAUDE.md + memory) — fast, no scan
  card       riso Before→After share card → _out/savings-card.svg
  portfolio  one-page story (the whole audit) → _out/portfolio.html
reads ~/.claude/projects · sends nothing · $ = estimated API-equivalent, not subscription spend`;
}

const cmd = (process.argv[2] || "report").toLowerCase();
if (["help", "-h", "--help"].includes(cmd)) { console.log(help()); process.exit(0); }
if (cmd === "doctor") { console.log(doctor()); process.exit(0); } // no JSONL scan needed — fast
const data = scan();
if (cmd === "report" || cmd === "summary") console.log(report(data));
else if (cmd === "advise" || cmd === "advice") console.log(advise(data));
else if (cmd === "waste" || cmd === "observatory") console.log(observatory(data));
else if (cmd === "trend" || cmd === "weekly") console.log(trend(data));
else if (cmd === "card") {
  const r = buildCard(data);
  const OUT = path.join(HERE, "..", "_out"); fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "savings-card.svg"), r.svg);
  fs.writeFileSync(path.join(OUT, "card-animated.html"), buildAnimatedHTML(data));
  fs.writeFileSync(path.join(OUT, "waste-card.svg"), buildWasteCard(data));
  console.log(`BEFORE ${usd(r.total)} → AFTER ${usd(r.after)} (−${r.pct}%) · wrote savings-card.svg + card-animated.html + waste-card.svg`);
} else if (cmd === "portfolio") {
  const OUT = path.join(HERE, "..", "_out"); fs.mkdirSync(OUT, { recursive: true });
  const f = path.join(OUT, "portfolio.html"); fs.writeFileSync(f, buildPortfolio(data));
  console.log(`wrote ${f}`);
} else { console.log(help()); process.exit(1); }
