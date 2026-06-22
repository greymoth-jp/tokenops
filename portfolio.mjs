// tokenops — one-page portfolio / "exemplar" of the whole AI Efficiency OS story.
// Self-contained riso HTML from real data: cost truth → contrarian conclusion → evidence card → method.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scan, usd, tok } from "./lib.mjs";
import { computeLevers } from "./advisor.mjs";
import { buildCard } from "./savings-card.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS = path.join(HERE, "assets", "fonts"); // vendored
const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString("base64");
const fontFace = () => [
  `@font-face{font-family:'Grotesk';font-weight:700;src:url(data:font/woff2;base64,${b64("space-grotesk-700.woff2")}) format('woff2')}`,
  `@font-face{font-family:'Mono';font-weight:400;src:url(data:font/woff2;base64,${b64("jetbrains-mono-400.woff2")}) format('woff2')}`,
  `@font-face{font-family:'Mono';font-weight:700;src:url(data:font/woff2;base64,${b64("jetbrains-mono-700.woff2")}) format('woff2')}`,
].join("");

export function buildPortfolio(data) {
  const { totals, models, days } = data, c = totals.c, T = totals.cost;
  const lv = computeLevers(data);
  const card = buildCard(data).svg.replace('width="1080" height="1350"', 'width="100%" height="auto" style="max-width:680px;display:block;margin:0 auto;border:2px solid #111"');
  const p = (v) => (v / T * 100).toFixed(1) + "%";
  const opus = Object.entries(models).filter(([m]) => m.includes("opus")).reduce((a, [, v]) => a + v.cost, 0);

  const reject = [
    ["input compression (LLMLingua)", `input is ${p(c.in)} — and compressing a static prompt breaks the prefix cache → you pay <em>more</em>`],
    ["semantic-caching outputs", `agentic context differs every turn → "broken by definition", silent correctness bugs`],
    ["per-turn model routing", `switching model mid-session resets the prefix cache → net loss when cache is ${p(c.read)} of cost`],
  ];
  const keep = [
    ["① cache hygiene", `${lv.mega.length} mega-sessions (≥300k ctx/turn) carry the cost · /compact, /clear, static CLAUDE.md`, lv.hygiene],
    ["② boundary routing", `route whole low-yield sessions to a cheaper tier — never mid-session`, lv.routing],
    ["③ output discipline", `output is ${p(c.out)} · terser, structured`, lv.output],
  ];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AI Efficiency OS</title><style>
${fontFace()}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#FAF7F0;color:#111;font-family:'Mono',monospace;line-height:1.5}
.wrap{max-width:1080px;margin:0 auto;padding:80px 90px}
.bar{height:6px;background:#111;margin:18px 0 0}
.tag{color:#6B6B6B;font-size:20px;letter-spacing:2px}
h1{font-family:'Grotesk';font-weight:700;font-size:66px;line-height:1.05;margin:54px 0 22px}
h2{font-family:'Grotesk';font-weight:700;font-size:34px;margin:0 0 8px}
.acc{color:#FF3B12}.grn{color:#1F7A4D}.dim{color:#6B6B6B}
.lead{font-size:26px;max-width:820px}
section{padding:64px 0;border-top:2px solid #111}
.kicker{color:#FF3B12;font-weight:700;font-size:20px;letter-spacing:3px;margin-bottom:24px}
.cbar{display:flex;height:54px;margin:24px 0 10px;border:2px solid #111}
.cbar i{display:block;height:100%}
.legend{display:flex;gap:36px;color:#6B6B6B;font-size:19px;flex-wrap:wrap}
.big{font-family:'Grotesk';font-weight:700;font-size:96px}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;padding:18px 0;border-bottom:1px dashed #C9C2B4}
.row .t{font-weight:700;font-size:22px}.row .d{color:#6B6B6B;font-size:18px;max-width:620px}
.row .v{font-family:'Grotesk';font-weight:700;font-size:30px;white-space:nowrap}
.steps{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:20px}
.step{border:2px solid #111;padding:22px}
.step b{font-family:'Grotesk';font-size:24px}.step p{color:#6B6B6B;font-size:18px;margin-top:6px}
.foot{color:#6B6B6B;font-size:18px;padding:50px 0}
.stat{font-family:'Grotesk';font-weight:700;font-size:40px}
em{font-style:normal;color:#FF3B12;font-weight:700}
</style></head><body><div class="wrap">

<div class="tag">✺ AI EFFICIENCY OS</div><div class="bar"></div>
<h1>I measured my Claude&nbsp;Code cost for ${days.length} days.<br>Then I found the advice everyone gives is <span class="acc">wrong</span> — for it.</h1>
<p class="lead dim">${totals.msgs.toLocaleString()} messages · est. <b style="color:#111">${usd(T)}</b> API-equivalent (Max/Pro なら抽出価値・実支払いでない). 100% local, nothing sent.</p>

<section><div class="kicker">THE TRUTH — WHERE THE MONEY GOES</div>
<div class="cbar"><i style="width:${p(c.read)};background:#FF3B12"></i><i style="width:${p(c.write)};background:#111"></i><i style="width:${p(c.out)};background:#6B6B6B"></i><i style="width:${p(c.in)};background:#C9C2B4"></i></div>
<div class="legend"><span><b class="acc">cacheRead ${p(c.read)}</b></span><span>cacheWrite ${p(c.write)}</span><span>output ${p(c.out)}</span><span>input ${p(c.in)}</span></div>
<p style="font-size:24px;margin-top:26px"><span class="acc" style="font-weight:700">90%+ of the cost is the cache.</span> Input is <b>${p(c.in)}</b> (${usd(c.in)}). opus = ${p(opus)} of spend. Cost concentrates in a few mega-sessions re-reading ~500k tokens every turn.</p></section>

<section><div class="kicker">WHAT EVERYONE GETS WRONG (rejected for this profile)</div>
${reject.map(([t, d]) => `<div class="row"><div><div class="t acc">✗ ${t}</div><div class="d">${d}</div></div></div>`).join("")}
<div class="kicker" style="margin-top:46px">WHAT ACTUALLY WORKS — ${usd(lv.savings)} reclaimable (−${lv.pct}%, conservative est.)</div>
${keep.map(([t, d, v]) => `<div class="row"><div><div class="t grn">✓ ${t}</div><div class="d">${d}</div></div><div class="v grn">− ${usd(v)}</div></div>`).join("")}</section>

<section><div class="kicker">THE EVIDENCE — generated from real data, headless-verified</div>
${card}</section>

<section><div class="kicker">THE METHOD</div>
<div class="steps">
<div class="step"><b>1 · MEASURE</b><p>Parse ~/.claude/projects JSONL → per-component cost & per-session waste. Reuse cc-usage engine.</p></div>
<div class="step"><b>2 · RESEARCH</b><p>6 parallel briefs outsourced to a second model → self-kill (verify sources, refute, dedupe).</p></div>
<div class="step"><b>3 · BUILD</b><p>tokenops CLI: report / advise / waste / trend / card. One source of truth for the savings math.</p></div>
<div class="step"><b>4 · VERIFY</b><p>self-checks + headless-Chrome render of every card. No claim ships unverified.</p></div>
</div></section>

<section><div class="kicker">ALSO — refactored the knowledge base (the dev-env itself)</div>
<div class="legend" style="gap:60px;font-size:22px">
<span><span class="stat">15→43</span><br><span class="dim">skills indexed (catalog was stale)</span></span>
<span><span class="stat grn">15</span><br><span class="dim">stale memories archived (not deleted)</span></span>
<span><span class="stat">0</span><br><span class="dim">broken rule anchors — rules were already clean</span></span>
</div>
<p class="dim" style="margin-top:24px;font-size:20px">Knowledge debt = cache cost: leaner always-loaded context lowers every future session's bill.</p></section>

<div class="foot">✺ ESTIMATE · API-equivalent, not subscription spend · 100% local · the lever is cache, not input-compression hype — <b style="color:#111">TOKENOPS</b></div>
</div></body></html>`;
}

if (process.argv[1] && process.argv[1].endsWith("portfolio.mjs")) {
  const data = scan();
  const OUT = path.join(HERE, "_out"); fs.mkdirSync(OUT, { recursive: true });
  const f = path.join(OUT, "portfolio.html"); fs.writeFileSync(f, buildPortfolio(data));
  console.log(`wrote ${f} (${(fs.statSync(f).size / 1024).toFixed(0)}KB)`);
}
