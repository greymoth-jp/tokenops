// tokenops demo — synthetic data so anyone can try the tool without their own Claude Code usage.
// Numbers are INVENTED but shaped like a real profile (cacheRead-dominant, opus-heavy, a few mega-sessions).
import { costParts } from "./lib.mjs";

// [project, model, msgs, inTok, outTok, cacheRead, cacheWrite]
const SESSIONS = [
  ["api-migration",    "claude-opus-4-8",  5200, 520000, 5800000, 2700000000, 42000000],
  ["dashboard-ui",     "claude-opus-4-7",  4800, 460000, 3200000, 2500000000, 39000000],
  ["data-pipeline",    "claude-opus-4-8",  3600, 300000, 4100000, 1900000000, 30000000],
  ["auth-service",     "claude-opus-4-7",  2900, 250000, 2400000, 1500000000, 24000000],
  ["infra-terraform",  "claude-sonnet-4-6", 3100, 280000, 1700000, 900000000, 18000000],
  ["docs-rewrite",     "claude-opus-4-8",  1800,  90000, 1300000,  700000000, 12000000],
  ["bugfix-batch",     "claude-haiku-4-5", 2200, 180000,  600000,  300000000,  7000000],
  ["test-coverage",    "claude-sonnet-4-6", 1400, 120000,  900000,  500000000,  9000000],
  ["scratch-explore",  "claude-opus-4-7",   900,  70000,   58000,  380000000,  6000000],
  ["readme-polish",    "claude-haiku-4-5",  600,  40000,  200000,   90000000,  2000000],
];

export function demoData() {
  const sessions = SESSIONS.map(([project, model, msgs, inTok, outTok, read, write], i) => {
    const cost = costParts({ model, inTok, outTok, cacheRead: read, cw5: write, cw1h: 0 }).total;
    return { file: `demo-${i}.jsonl`, project, msgs, inTok, outTok, read, write, cost,
      readPerMsg: read / msgs, outPerMsg: outTok / msgs, topModel: model, models: { [model]: msgs },
      first: "2026-05-20T00:00:00Z", last: "2026-06-22T00:00:00Z" };
  });
  const totals = { msgs: 0, inTok: 0, outTok: 0, read: 0, write: 0, cost: 0, c: { in: 0, out: 0, read: 0, write: 0 } };
  const models = {};
  for (const [, model, msgs, inTok, outTok, read, write] of SESSIONS) {
    const cp = costParts({ model, inTok, outTok, cacheRead: read, cw5: write, cw1h: 0 });
    totals.msgs += msgs; totals.inTok += inTok; totals.outTok += outTok; totals.read += read; totals.write += write;
    totals.c.in += cp.in; totals.c.out += cp.out; totals.c.read += cp.read; totals.c.write += cp.write;
    (models[model] = models[model] || { msgs: 0, cost: 0, read: 0, outTok: 0 });
    models[model].msgs += msgs; models[model].cost += cp.total; models[model].read += read; models[model].outTok += outTok;
  }
  totals.cost = totals.c.in + totals.c.out + totals.c.read + totals.c.write;
  const days = [];
  for (let d = 20; d <= 31; d++) days.push(`2026-05-${d}`);
  for (let d = 1; d <= 22; d++) days.push(`2026-06-${String(d).padStart(2, "0")}`);
  return { sessions, totals, models, days };
}
