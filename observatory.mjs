// tokenops Observatory — per-session waste + cost concentration (where the money actually is).
import { scan, usd, tok } from "./lib.mjs";

export function observatory(data) {
  const big = data.sessions.filter(s => s.msgs >= 5);
  const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 0; };
  const medRead = med(big.map(s => s.readPerMsg)), medOut = med(big.map(s => s.outPerMsg));
  const total = big.reduce((a, s) => a + s.cost, 0);
  const sorted = [...big].sort((a, b) => b.cost - a.cost);
  const top8 = sorted.slice(0, 8).reduce((a, s) => a + s.cost, 0);

  const L = [];
  L.push(`observatory · ${big.length} sessions (≥5 msg) · median ctx/turn ${tok(medRead)} · median out/msg ${Math.round(medOut)}`);
  L.push(`concentration: top 8 sessions = ${(top8 / total * 100).toFixed(0)}% of est cost — cost lives in a few mega-sessions`);
  L.push("");
  L.push("top sessions by cost  (W = bloated ctx re-read each turn):");
  for (const s of sorted.slice(0, 12)) {
    const w = s.readPerMsg > 1.8 * medRead ? "W" : " ";
    L.push(`  ${w} ${s.project.slice(0, 20).padEnd(20)} ${usd(s.cost).padStart(9)}  ${String(s.msgs).padStart(5)}msg  ${tok(s.readPerMsg).padStart(6)}/turn  out ${String(Math.round(s.outPerMsg)).padStart(4)}`);
  }
  return L.join("\n");
}

// weekly cost trend — ACTUAL spend per ISO week (not a before/after optimization curve; honest).
export function trend(data) {
  const byWeek = {};
  for (const s of data.sessions) {
    if (!s.first) continue;
    const d = new Date(s.first), jan1 = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`;
    (byWeek[key] = byWeek[key] || { cost: 0, msgs: 0 }).cost += s.cost;
    byWeek[key].msgs += s.msgs;
  }
  const weeks = Object.entries(byWeek).sort();
  if (!weeks.length) return "no dated sessions.";
  const max = Math.max(...weeks.map(w => w[1].cost));
  const L = ["weekly cost trend · est actual spend (not an optimized before/after curve):"];
  for (const [k, v] of weeks)
    L.push(`  ${k}  ${usd(v.cost).padStart(9)}  ${String(v.msgs).padStart(6)}msg  ${"█".repeat(Math.max(0, Math.round(v.cost / max * 32)))}`);
  return L.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("observatory.mjs")) console.log(observatory(scan()));
