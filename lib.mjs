// tokenops shared core — ONE scan of Claude Code JSONL → per-session + totals + components.
// Reuses cc-usage engine primitives (no reinvention). Local-only. Cost = ESTIMATE (engine RATES).
import { claudeProjectsDir, iterJsonlFiles, rateFor } from "./engine.mjs"; // vendored from cc-usage (greymoth)
import fs from "fs";
import path from "path";

// per-message cost split into the 4 components (input/output/cacheRead/cacheWrite).
export function costParts(r) {
  const t = rateFor(r.model);
  if (!t) return { in: 0, out: 0, read: 0, write: 0, total: 0 };
  const i = r.inTok * t.in / 1e6, o = r.outTok * t.out / 1e6,
    rd = r.cacheRead * t.cacheRead / 1e6, w = (r.cw5 * t.w5 + r.cw1h * t.w1h) / 1e6;
  return { in: i, out: o, read: rd, write: w, total: i + o + rd + w };
}

// Single pass over all transcripts. Dedup per session by message.id (streaming writes dup lines).
export function scan(dir = claudeProjectsDir()) {
  const sessions = [];
  const totals = { msgs: 0, inTok: 0, outTok: 0, read: 0, write: 0, cost: 0, c: { in: 0, out: 0, read: 0, write: 0 } };
  const models = {};
  const days = new Set();
  for (const file of iterJsonlFiles(dir)) {
    let text; try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    const projEnc = path.relative(dir, file).split(path.sep)[0] || "(root)";
    const seen = new Set();
    const s = { file: path.basename(file), project: projEnc, msgs: 0, inTok: 0, outTok: 0, read: 0, write: 0, cost: 0, models: {}, first: null, last: null, cwd: null };
    for (const ln of text.split("\n")) {
      if (!ln) continue; let o; try { o = JSON.parse(ln); } catch { continue; }
      if (o.cwd && !s.cwd) s.cwd = o.cwd;
      if (o.type !== "assistant" || !o.message || !o.message.usage || !o.message.id) continue;
      if (seen.has(o.message.id)) continue; seen.add(o.message.id);
      const u = o.message.usage, m = o.message.model || "unknown";
      const r = { model: m, inTok: u.input_tokens || 0, outTok: u.output_tokens || 0,
        cacheRead: u.cache_read_input_tokens || 0,
        cw5: (u.cache_creation && u.cache_creation.ephemeral_5m_input_tokens) || 0,
        cw1h: (u.cache_creation && u.cache_creation.ephemeral_1h_input_tokens) || 0 };
      const cp = costParts(r);
      s.msgs++; s.inTok += r.inTok; s.outTok += r.outTok; s.read += r.cacheRead; s.write += r.cw5 + r.cw1h; s.cost += cp.total;
      s.models[m] = (s.models[m] || 0) + 1;
      totals.msgs++; totals.inTok += r.inTok; totals.outTok += r.outTok; totals.read += r.cacheRead; totals.write += r.cw5 + r.cw1h;
      totals.c.in += cp.in; totals.c.out += cp.out; totals.c.read += cp.read; totals.c.write += cp.write;
      models[m] = models[m] || { msgs: 0, cost: 0, read: 0, outTok: 0 };
      models[m].msgs++; models[m].cost += cp.total; models[m].read += r.cacheRead; models[m].outTok += r.outTok;
      if (o.timestamp) { s.first = s.first || o.timestamp; s.last = o.timestamp; days.add(o.timestamp.slice(0, 10)); }
    }
    if (s.msgs < 1) continue;
    s.project = s.cwd ? (s.cwd.split(/[\\/]/).filter(Boolean).pop() || projEnc) : projEnc;
    s.readPerMsg = s.read / s.msgs; s.outPerMsg = s.outTok / s.msgs;
    s.topModel = Object.entries(s.models).sort((a, b) => b[1] - a[1])[0]?.[0] || "?";
    sessions.push(s);
  }
  totals.cost = totals.c.in + totals.c.out + totals.c.read + totals.c.write;
  return { sessions, totals, models, days: [...days].sort() };
}

// formatters
export const usd = (n) => "$" + (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : n.toFixed(2));
export const tok = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));
export const shortModel = (m) => (m || "").replace(/^claude-/, "").replace(/-\d{8}$/, "");

if (process.argv[1] && process.argv[1].endsWith("lib.mjs")) {
  // self-check on a tiny synthetic record (no disk dependency)
  const r = { model: "claude-opus-4-8", inTok: 1e6, outTok: 0, cacheRead: 0, cw5: 0, cw1h: 0 };
  const cp = costParts(r);
  if (Math.abs(cp.in - 5) > 1e-9 || Math.abs(cp.total - 5) > 1e-9) throw new Error("FAIL costParts");
  if (costParts({ model: "gpt-4", inTok: 1e6 }).total !== 0) throw new Error("FAIL unknown→0");
  console.log("lib.mjs self-check: PASS");
}
