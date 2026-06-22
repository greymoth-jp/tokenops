// tokenops doctor — weigh the ALWAYS-ON context (CLAUDE.md + per-project MEMORY.md indexes)
// that gets re-read from cache every single turn. Operationalizes lever ①: keep HOT load small.
// Read-only, no JSONL scan (fast). Token counts are ROUGH estimates (no public Claude tokenizer).
import fs from "fs";
import path from "path";
import os from "os";

const estTok = (s) => Math.round(s.length / 3); // rough; JP-heavy markdown ≈ chars/3
const usd = (n) => "$" + (n >= 1000 ? Math.round(n).toLocaleString("en-US") : n.toFixed(2));
const readSafe = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };

export function doctor() {
  const dir = path.join(os.homedir(), ".claude");
  const L = [];
  const claude = readSafe(path.join(dir, "CLAUDE.md"));
  const claudeTok = claude ? estTok(claude) : 0;

  // per-project MEMORY.md (each loads only in its own project, but every turn within it)
  const projDir = path.join(dir, "projects");
  const mems = [];
  try {
    for (const d of fs.readdirSync(projDir)) {
      const t = readSafe(path.join(projDir, d, "memory", "MEMORY.md"));
      if (!t) continue;
      const proj = d === "C--Users-mhira" ? "(self)"
        : d === "C--Users-mhira-OneDrive-Desktop" ? "Desktop"
        : d.replace(/^C--Users-mhira-OneDrive-Desktop-/, "").replace(/^C--Users-mhira-?/, "") || d;
      mems.push({ proj, tok: estTok(t), lines: t.split("\n").filter(x => x.trim().startsWith("- ")).length });
    }
  } catch {}
  mems.sort((a, b) => b.tok - a.tok);

  // cost of re-reading 1k tokens of always-on context across 1000 turns, at opus cacheRead $0.5/M
  const per1k = (tok) => tok * 1000 * 0.5 / 1e6; // $ per 1000 turns
  L.push("tokenops doctor · always-on context weight (re-read from cache EVERY turn)");
  L.push("rough token est (chars/3, JP-heavy) · the lever: keep this small + static (dynamic content = cache miss)");
  L.push("");
  L.push(`CLAUDE.md         ≈ ${claudeTok.toLocaleString()} tok   loads every session, every project`);
  L.push(`  → at opus cacheRead $0.5/M, that overhead ≈ ${usd(per1k(claudeTok))} per 1000 turns it's re-read`);
  L.push("");
  L.push(`per-project MEMORY.md indexes (load in that project, every turn) — ${mems.length} projects:`);
  for (const m of mems.slice(0, 10))
    L.push(`  ${m.proj.slice(0, 26).padEnd(26)} ≈ ${String(m.tok).padStart(5)} tok  (${m.lines} memories)  ${usd(per1k(m.tok))}/1k turns`);
  const memTotal = mems.reduce((a, m) => a + m.tok, 0);
  L.push("");
  L.push(`heaviest always-on (CLAUDE.md + this project's MEMORY.md) is the per-turn baseline you pay on every message.`);
  L.push(`trim targets: the biggest MEMORY.md indexes above — archive stale memories (reversible), keep hooks terse.`);
  L.push(`reminder: this is the SAME debt as the knowledge audit — leaner HOT load lowers cacheRead on every future session.`);
  return L.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("doctor.mjs")) console.log(doctor());
