// cc-usage engine — parse local Claude Code JSONL transcripts into deduped usage + cost.
// Local-only: reads ~/.claude/projects, sends nothing. Token/cost are ESTIMATES (bundled rate table).
import fs from "fs";
import path from "path";
import os from "os";

export function claudeProjectsDir() {
  return path.join(os.homedir(), ".claude", "projects");
}

export function* iterJsonlFiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* iterJsonlFiles(p);
    else if (e.name.endsWith(".jsonl")) yield p;
  }
}

// One usage record per assistant message.id. message.id is the real dedup key: streaming writes
// several JSONL lines with the SAME message.id + identical usage (each line has a distinct uuid, so
// uuid would double-count ~2.4x). Dedup is global, which also collapses cross-file duplicates
// (e.g. a sidechain message echoed into a subagents/ file).
function recordFrom(o, project) {
  const m = o.message, u = m.usage;
  return {
    id: m.id,
    ts: o.timestamp || null,
    model: m.model || "unknown",
    // friendly project name from cwd basename (the encoded dir name is ugly); fall back to dir
    project: o.cwd ? (o.cwd.split(/[\\/]/).filter(Boolean).pop() || project) : project,
    cwd: o.cwd || null,
    gitBranch: o.gitBranch || null,
    sidechain: !!o.isSidechain,
    inTok: u.input_tokens || 0,
    outTok: u.output_tokens || 0,
    cacheRead: u.cache_read_input_tokens || 0,
    cacheWrite5m: (u.cache_creation && u.cache_creation.ephemeral_5m_input_tokens) || 0,
    cacheWrite1h: (u.cache_creation && u.cache_creation.ephemeral_1h_input_tokens) || 0,
    webSearch: (u.server_tool_use && u.server_tool_use.web_search_requests) || 0,
    webFetch: (u.server_tool_use && u.server_tool_use.web_fetch_requests) || 0,
  };
}

export function collectUsage(dir = claudeProjectsDir()) {
  const byId = new Map();
  for (const file of iterJsonlFiles(dir)) {
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    const project = path.relative(dir, file).split(path.sep)[0] || "(root)";
    for (const ln of text.split("\n")) {
      if (!ln) continue;
      let o; try { o = JSON.parse(ln); } catch { continue; }
      if (o.type !== "assistant" || !o.message || !o.message.usage || !o.message.id) continue;
      if (byId.has(o.message.id)) continue;
      byId.set(o.message.id, recordFrom(o, project));
    }
  }
  return [...byId.values()];
}

// --- pricing (USD per 1M tokens). ESTIMATE — current Anthropic rates; sync from LiteLLM if stale.
// ponytail: matched by family keyword (opus/sonnet/haiku/fable) — version bumps keep the same price.
// Known gap: 1M-context (>200k input) premium tiers and web_search/web_fetch per-request fees are
// not modelled; token cost dominates, add later only if users care.
export const RATES = {
  opus:   { in: 5,  out: 25, cacheRead: 0.5, w5: 6.25, w1h: 10 },
  sonnet: { in: 3,  out: 15, cacheRead: 0.3, w5: 3.75, w1h: 6 },
  haiku:  { in: 1,  out: 5,  cacheRead: 0.1, w5: 1.25, w1h: 2 },
  fable:  { in: 10, out: 50, cacheRead: 1,   w5: 12.5, w1h: 20 },
};

export function rateFor(model) {
  const s = (model || "").toLowerCase();
  if (s.includes("opus")) return RATES.opus;
  if (s.includes("sonnet")) return RATES.sonnet;
  if (s.includes("haiku")) return RATES.haiku;
  if (s.includes("fable")) return RATES.fable;
  return null;
}

export function costOf(r) {
  const t = rateFor(r.model);
  if (!t) return 0;
  return (
    (r.inTok || 0) * t.in + (r.outTok || 0) * t.out + (r.cacheRead || 0) * t.cacheRead +
    (r.cacheWrite5m || 0) * t.w5 + (r.cacheWrite1h || 0) * t.w1h
  ) / 1e6;
}

// What cache reads would have cost at full input price minus what they actually cost (0.1x).
export function cacheSavedOf(r) {
  const t = rateFor(r.model);
  if (!t) return 0;
  return (r.cacheRead || 0) * (t.in - t.cacheRead) / 1e6;
}

const emptyTot = () => ({ msgs: 0, inTok: 0, outTok: 0, cacheRead: 0, cacheWrite: 0, cost: 0, cacheSaved: 0 });
function add(t, r) {
  t.msgs++; t.inTok += r.inTok; t.outTok += r.outTok;
  t.cacheRead += r.cacheRead; t.cacheWrite += r.cacheWrite5m + r.cacheWrite1h;
  t.cost += costOf(r); t.cacheSaved += cacheSavedOf(r);
  return t;
}

// group records by a key function → { key: totals }
export function groupBy(records, keyFn) {
  const out = {};
  for (const r of records) {
    const k = keyFn(r);
    (out[k] = out[k] || emptyTot()), add(out[k], r);
  }
  return out;
}

export function summarize(records) {
  const total = records.reduce((t, r) => add(t, r), emptyTot());
  const days = [...new Set(records.map((r) => (r.ts || "").slice(0, 10)).filter(Boolean))].sort();
  return {
    total,
    byModel: groupBy(records, (r) => r.model),
    byDay: groupBy(records, (r) => (r.ts || "?").slice(0, 10)),
    byProject: groupBy(records, (r) => r.project),
    range: days.length ? { from: days[0], to: days[days.length - 1], days: days.length } : null,
  };
}

// --- self-check + real-data run -----------------------------------------------
function selfCheck() {
  const assert = (c, m) => { if (!c) throw new Error("FAIL " + m); };
  // cost math
  assert(Math.abs(costOf({ model: "claude-opus-4-8", inTok: 1e6, outTok: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 }) - 5) < 1e-9, "opus in");
  assert(Math.abs(costOf({ model: "claude-opus-4-8", inTok: 0, outTok: 1e6, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 }) - 25) < 1e-9, "opus out");
  assert(Math.abs(costOf({ model: "claude-opus-4-8", inTok: 0, outTok: 0, cacheRead: 1e6, cacheWrite5m: 0, cacheWrite1h: 0 }) - 0.5) < 1e-9, "opus cacheRead");
  assert(Math.abs(costOf({ model: "claude-haiku-4-5", inTok: 1e6, outTok: 0 }) - 1) < 1e-9, "haiku in");
  assert(rateFor("claude-sonnet-4-6") === RATES.sonnet, "sonnet match");
  assert(rateFor("gpt-4") === null && costOf({ model: "gpt-4", inTok: 1e6 }) === 0, "unknown → 0");
  // grouping
  const recs = [
    { model: "claude-opus-4-8", inTok: 10, outTok: 2, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, ts: "2026-06-22T00:00:00Z", project: "A" },
    { model: "claude-haiku-4-5", inTok: 4, outTok: 1, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, ts: "2026-06-21T00:00:00Z", project: "B" },
  ];
  const s = summarize(recs);
  assert(s.total.msgs === 2, "total msgs");
  assert(s.range.days === 2, "2 days");
  assert(Object.keys(s.byModel).length === 2, "2 models");
  console.log("engine.mjs self-check: PASS");
}

if (import.meta.url === `file://${process.argv[1].split(path.sep).join("/")}` || process.argv[1].endsWith("engine.mjs")) {
  const arg = process.argv[2];
  if (arg === "selfcheck") { selfCheck(); }
  else {
    const target = arg || claudeProjectsDir();
    const t0 = Date.now();
    const recs = collectUsage(target);
    const s = summarize(recs);
    const ms = Date.now() - t0;
    const usd = (n) => "$" + n.toFixed(2);
    console.log(`scanned ${target} in ${ms}ms`);
    console.log(`messages (deduped): ${s.total.msgs}`);
    console.log(`tokens: in ${s.total.inTok.toLocaleString()} · out ${s.total.outTok.toLocaleString()} · cacheRead ${s.total.cacheRead.toLocaleString()} · cacheWrite ${s.total.cacheWrite.toLocaleString()}`);
    console.log(`EST. COST: ${usd(s.total.cost)}`);
    if (s.range) console.log(`range: ${s.range.from} → ${s.range.to} (${s.range.days} days)`);
    console.log("by model:");
    for (const [m, t] of Object.entries(s.byModel).sort((a, b) => b[1].cost - a[1].cost))
      console.log(`  ${m.padEnd(28)} ${String(t.msgs).padStart(6)} msgs  ${usd(t.cost)}`);
    console.log("top projects by cost:");
    for (const [p, t] of Object.entries(s.byProject).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8))
      console.log(`  ${p.slice(0, 40).padEnd(40)} ${usd(t.cost)}`);
  }
}
