// tokenops Advisor — turns the scan into PRIORITIZED, $-quantified actions.
// Levers are data-validated (RESEARCH_SURVIVORS.md): cache hygiene > boundary routing > output.
// Input compression / semantic cache / per-turn routing are NOT recommended for this profile.
// computeLevers() is the SINGLE source of the savings estimate (card + advise share it → consistent).
import { scan, usd, tok, shortModel } from "./lib.mjs";

const pct = (v, t) => (v / t * 100).toFixed(1) + "%";

// blended cacheRead rate, weighted by where reads actually happened (opus 0.5 / sonnet 0.3 / haiku 0.1 per 1M).
function readCost(readTokens, models) {
  let wsum = 0, w = 0;
  for (const [m, v] of Object.entries(models)) {
    const rate = m.includes("opus") ? 0.5 : m.includes("sonnet") ? 0.3 : m.includes("haiku") ? 0.1 : 0;
    wsum += rate * v.read; w += v.read;
  }
  return readTokens * (w ? wsum / w : 0.45) / 1e6;
}

// Conservative, transparent lever math. Targets only the sessions actually amenable to each lever.
export function computeLevers(data) {
  const { sessions, totals, models } = data;
  // ① cache hygiene: only the bloated mega-sessions (≥300k ctx/turn); assume ~40% of their re-read is avoidable.
  const mega = sessions.filter(s => s.readPerMsg >= 300_000 && s.msgs >= 20).sort((a, b) => b.cost - a.cost);
  const hygiene = readCost(mega.reduce((a, s) => a + s.read, 0), models) * 0.40;
  // ② boundary routing: whole low-yield opus sessions → cheaper tier (~60% off the routable share).
  const route = sessions.filter(s => s.topModel.includes("opus") && s.outPerMsg < 120 && s.msgs >= 20).sort((a, b) => b.cost - a.cost);
  const routing = route.reduce((a, s) => a + s.cost, 0) * 0.60;
  // ③ output discipline.
  const output = totals.c.out * 0.30;
  const savings = (hygiene + routing + output) * 0.85; // overlap discount (hygiene & routing touch same sessions)
  return { hygiene, routing, output, savings, after: totals.cost - savings, pct: Math.round(savings / totals.cost * 100), mega, route };
}

export function advise(data) {
  const { totals } = data, T = totals.cost, lv = computeLevers(data);
  const out = [];
  out.push(`tokenops advise · ${data.sessions.length} sessions · est total ${usd(T)} (est. API-equivalent)`);
  out.push(`components: cacheRead ${pct(totals.c.read, T)} · cacheWrite ${pct(totals.c.write, T)} · output ${pct(totals.c.out, T)} · input ${pct(totals.c.in, T)}`);
  out.push("");
  out.push(`① CACHE HYGIENE — ${lv.mega.length} bloated sessions (≥300k ctx/turn) · est reclaimable ${usd(lv.hygiene)}`);
  out.push(`   action: milestone /compact, /clear before ~70%, keep CLAUDE.md/tools STATIC (dynamic content = cache miss). don't run mega-sessions.`);
  for (const s of lv.mega.slice(0, 6))
    out.push(`   · ${s.project.slice(0, 20).padEnd(20)} ${usd(s.cost).padStart(9)}  ${s.msgs}msg  ${tok(s.readPerMsg)}/turn  ${shortModel(s.topModel)}`);
  out.push("");
  out.push(`② BOUNDARY ROUTING — ${lv.route.length} low-yield opus sessions · est ${usd(lv.routing)}`);
  out.push(`   action: run mechanical sessions on sonnet/haiku as a WHOLE session. NEVER switch model mid-session (resets prefix cache = net loss).`);
  for (const s of lv.route.slice(0, 5))
    out.push(`   · ${s.project.slice(0, 20).padEnd(20)} ${usd(s.cost).padStart(9)}  ${s.msgs}msg  out ${Math.round(s.outPerMsg)}/msg  ${shortModel(s.topModel)}`);
  out.push("");
  out.push(`③ OUTPUT DISCIPLINE — output is ${pct(totals.c.out, T)} · est ${usd(lv.output)}`);
  out.push(`   action: terser, structured output; avoid restating. (input compression NOT worth it — input is ${pct(totals.c.in, T)}.)`);
  out.push("");
  out.push(`≈ reclaimable (conservative, overlap-discounted): ${usd(lv.savings)} of ${usd(T)} = −${lv.pct}% (est.)`);
  out.push(`NOT recommended here: input compression (input ${pct(totals.c.in, T)}), semantic-caching outputs (agentic=broken), per-turn model switching (breaks cache).`);
  return out.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("advisor.mjs")) console.log(advise(scan()));
