// tokenops — Token-Savings Visualizer card (riso editorial, dependency-free SVG).
// Reuses cc-usage fonts (read-only) + lib.scan. BEFORE = measured. AFTER = conservative,
// transparent lever math (NOT a fabricated %). All figures labelled 推定/ESTIMATE.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scan, usd, tok, shortModel } from "./lib.mjs";
import { computeLevers } from "./advisor.mjs";

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS = path.join(HERE, "assets", "fonts"); // vendored
const INK = "#111111", PAPER = "#FAF7F0", ACCENT = "#FF3B12", DIM = "#6B6B6B", GREEN = "#1F7A4D";
const W = 1080, H = 1350, M = 90;
const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString("base64");
const fontFace = () => [
  `@font-face{font-family:'Grotesk';font-weight:700;src:url(data:font/woff2;base64,${b64("space-grotesk-700.woff2")}) format('woff2')}`,
  `@font-face{font-family:'Mono';font-weight:400;src:url(data:font/woff2;base64,${b64("jetbrains-mono-400.woff2")}) format('woff2')}`,
  `@font-face{font-family:'Mono';font-weight:700;src:url(data:font/woff2;base64,${b64("jetbrains-mono-700.woff2")}) format('woff2')}`,
].join("");

// BEFORE measured + AFTER via transparent conservative levers. Returns {svg, total, after, pct, L, savings}.
export function buildCard(data) {
  const { totals, days } = data;
  const c = totals.c, total = totals.cost;
  const lv = computeLevers(data); // shared with advisor → card and advise always agree
  const L = { hygiene: lv.hygiene, routing: lv.routing, output: lv.output };
  const savings = lv.savings, after = lv.after, pct = lv.pct;

  const comps = [["cacheRead", c.read, ACCENT], ["cacheWrite", c.write, INK], ["output", c.out, DIM], ["input", c.in, "#C9C2B4"]];
  const barW = W - 2 * M, barY = 600, barH = 46; let bx = M;
  const bar = comps.map(([k, v]) => { const w = Math.max(2, barW * (v / total)); const seg = `<rect x="${bx.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" fill="${comps.find(z => z[0] === k)[2]}"/>`; bx += w; return seg; }).join("");
  const legend = comps.map(([k, v], i) => `<text x="${M + i * 250}" y="${barY + barH + 34}" font-family="Mono" font-size="20" fill="${DIM}">${k} ${(v / total * 100).toFixed(1)}%</text>`).join("");
  const levers = [["SESSION HYGIENE", "compact / lean prefix / no mega-ctx", L.hygiene],
    ["BOUNDARY ROUTING", "opus→sonnet/haiku per session", L.routing],
    ["OUTPUT DISCIPLINE", "terser, structured", L.output]];
  let ly = 880;
  const leverSVG = levers.map(([k, d, v]) => { const y = ly; ly += 78;
    return `<text x="${M}" y="${y}" font-family="Mono" font-weight="700" font-size="26" fill="${INK}">${k}</text>
  <text x="${M}" y="${y + 28}" font-family="Mono" font-size="18" fill="${DIM}">${d}</text>
  <text x="${W - M}" y="${y + 8}" text-anchor="end" font-family="Grotesk" font-weight="700" font-size="34" fill="${GREEN}">− ${usd(v)}</text>`; }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>${fontFace()}</style>
<rect width="${W}" height="${H}" fill="${PAPER}"/>
<text x="${M}" y="120" font-family="Mono" font-weight="700" font-size="38" fill="${INK}">CLAUDE CODE</text>
<text x="${W - M}" y="122" text-anchor="end" font-family="Grotesk" font-weight="700" font-size="38" fill="${ACCENT}">✺</text>
<rect x="${M}" y="150" width="${W - 2 * M}" height="5" fill="${INK}"/>
<text x="${M}" y="196" font-family="Mono" font-size="22" fill="${DIM}">✺ COST OPTIMIZED · ${days.length} DAYS · ${Math.round(totals.msgs / 1000)}k msgs</text>
<text x="${M}" y="300" font-family="Mono" font-size="24" fill="${DIM}">BEFORE — measured</text>
<text x="${M}" y="392" font-family="Grotesk" font-weight="700" font-size="118" fill="${INK}">≈ ${usd(total)}</text>
<text x="${M}" y="436" font-family="Mono" font-size="22" fill="${DIM}">est. API-equivalent · where it goes ↓</text>
${bar}
${legend}
<text x="${M}" y="540" font-family="Mono" font-weight="700" font-size="22" fill="${ACCENT}">input ${(c.in / total * 100).toFixed(1)}% — compressing it saves nothing. the lever is cache.</text>
<rect x="${M}" y="${barY + barH + 58}" width="${W - 2 * M}" height="2" fill="${INK}"/>
<text x="${M}" y="836" font-family="Mono" font-size="22" fill="${DIM}">few mega-sessions = most of the cost · reclaimable (推定):</text>
${leverSVG}
<rect x="${M}" y="1118" width="${W - 2 * M}" height="2" fill="${INK}"/>
<text x="${M}" y="1180" font-family="Mono" font-size="24" fill="${DIM}">AFTER — 推定</text>
<text x="${M}" y="1240" font-family="Grotesk" font-weight="700" font-size="82" fill="${GREEN}">≈ ${usd(after)}</text>
<text x="${W - M}" y="1200" text-anchor="end" font-family="Grotesk" font-weight="700" font-size="64" fill="${ACCENT}">−${pct}%</text>
<text x="${W - M}" y="1240" text-anchor="end" font-family="Mono" font-size="20" fill="${DIM}">conservative est.</text>
<text x="${M}" y="1300" font-family="Mono" font-size="19" fill="${DIM}">✺ ESTIMATE · 100% local · not input-compression hype — TOKENOPS</text>
</svg>`;
  return { svg, total, after, pct, L, savings };
}

// Self-contained ANIMATED card (HTML) for screen-recording: BEFORE counts down to AFTER,
// levers tick in, final −% stamp. Fonts embedded base64. Honest labels preserved.
export function buildAnimatedHTML(data) {
  const r = buildCard(data); const c = data.totals.c, total = data.totals.cost;
  const comp = { read: (c.read / total * 100).toFixed(1), write: (c.write / total * 100).toFixed(1), out: (c.out / total * 100).toFixed(1), in: (c.in / total * 100).toFixed(1) };
  const F = (b64f, fam, wt) => `@font-face{font-family:'${fam}';font-weight:${wt};src:url(data:font/woff2;base64,${b64f}) format('woff2')}`;
  const fonts = F(b64("space-grotesk-700.woff2"), "Grotesk", 700) + F(b64("jetbrains-mono-400.woff2"), "Mono", 400) + F(b64("jetbrains-mono-700.woff2"), "Mono", 700);
  const J = (o) => JSON.stringify(o);
  const levers = [["SESSION HYGIENE", r.L.hygiene], ["BOUNDARY ROUTING", r.L.routing], ["OUTPUT DISCIPLINE", r.L.output]];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
body{background:#FAF7F0;color:#111;font-family:'Mono',monospace;width:1080px;height:1350px;overflow:hidden;padding:90px}
.h{font-weight:700;font-size:38px;letter-spacing:1px}.rule{height:5px;background:#111;margin:28px 0}
.sub{color:#6B6B6B;font-size:22px;margin-bottom:46px}
.lbl{color:#6B6B6B;font-size:24px}
.big{font-family:'Grotesk';font-weight:700;font-size:120px;line-height:1.05;color:#111}
.bar{display:flex;height:46px;margin:26px 0 8px;border:0}
.bar i{display:block;height:100%}
.legend{color:#6B6B6B;font-size:20px;display:flex;gap:40px;margin-bottom:18px}
.zing{color:#FF3B12;font-weight:700;font-size:22px;opacity:0;transition:opacity .5s}
.lev{display:flex;justify-content:space-between;align-items:baseline;margin-top:26px;opacity:0;transform:translateY(8px);transition:all .45s}
.lev .k{font-weight:700;font-size:26px}.lev .v{font-family:'Grotesk';font-weight:700;font-size:34px;color:#1F7A4D}
.after{font-family:'Grotesk';font-weight:700;font-size:82px;color:#1F7A4D}
.stamp{position:absolute;right:90px;font-family:'Grotesk';font-weight:700;font-size:64px;color:#FF3B12;opacity:0;transform:scale(1.6);transition:all .4s}
.foot{color:#6B6B6B;font-size:19px;position:absolute;bottom:90px}
#accent{color:#FF3B12}
</style></head><body>
<div class="h">CLAUDE CODE <span id="accent" style="float:right">✺</span></div><div class="rule"></div>
<div class="sub">✺ COST OPTIMIZED · ${data.days.length} DAYS · ${Math.round(data.totals.msgs / 1000)}k msgs</div>
<div class="lbl">BEFORE → AFTER — <span id="state">measured</span></div>
<div class="big" id="num">≈ $0</div>
<div class="bar">
  <i style="width:${comp.read}%;background:#FF3B12"></i><i style="width:${comp.write}%;background:#111"></i><i style="width:${comp.out}%;background:#6B6B6B"></i><i style="width:${comp.in}%;background:#C9C2B4"></i>
</div>
<div class="legend"><span>cacheRead ${comp.read}%</span><span>cacheWrite ${comp.write}%</span><span>output ${comp.out}%</span><span>input ${comp.in}%</span></div>
<div class="zing" id="zing">input ${comp.in}% — compressing it saves nothing. the lever is cache.</div>
<div class="rule" style="height:2px;margin:30px 0"></div>
<div id="levers">${levers.map((l, i) => `<div class="lev" id="lev${i}"><div><div class="k">${l[0]}</div></div><div class="v">− ${usd(l[1])}</div></div>`).join("")}</div>
<div style="position:absolute;left:90px;bottom:170px">
  <div class="lbl">AFTER — 推定</div><div class="after" id="num2">≈ $0</div>
</div>
<div class="stamp" id="stamp" style="bottom:230px">−${r.pct}%</div>
<div class="foot">✺ ESTIMATE · 100% local · not input-compression hype — TOKENOPS</div>
<script>
const BEFORE=${total.toFixed(0)}, AFTER=${r.after.toFixed(0)};
const fmt=n=>"≈ $"+Math.round(n).toLocaleString("en-US");
const num=document.getElementById("num"),num2=document.getElementById("num2"),zing=document.getElementById("zing"),stamp=document.getElementById("stamp"),state=document.getElementById("state");
const ease=t=>1-Math.pow(1-t,3);
function count(el,from,to,ms,cb){const t0=performance.now();(function f(t){let p=Math.max(0,Math.min(1,(t-t0)/ms));el.textContent=fmt(from+(to-from)*ease(p));if(p<1)requestAnimationFrame(f);else if(cb)cb();})(performance.now());}
function setFinal(){num.textContent=fmt(AFTER);num2.textContent=fmt(AFTER);zing.style.opacity=1;[0,1,2].forEach(i=>{const e=document.getElementById("lev"+i);e.style.opacity=1;e.style.transform="translateY(0)";});stamp.style.opacity=1;stamp.style.transform="scale(1)";state.textContent="推定";}
if(location.hash==="#final"){setFinal();}  // deterministic end-state (for verification / static export)
else{
  setTimeout(()=>count(num,0,BEFORE,900),300);
  setTimeout(()=>zing.style.opacity=1,1300);
  [0,1,2].forEach(i=>setTimeout(()=>{const e=document.getElementById("lev"+i);e.style.opacity=1;e.style.transform="translateY(0)";},2000+i*450));
  setTimeout(()=>{state.textContent="推定";count(num,BEFORE,AFTER,1100);count(num2,0,AFTER,1100);},3700);
  setTimeout(()=>{stamp.style.opacity=1;stamp.style.transform="scale(1)";},4900);
  setTimeout(setFinal,5300);// guarantee correct final state
}
</script></body></html>`;
}

// Second share card: COST CONCENTRATION leaderboard — "few mega-sessions carry the bill".
export function buildWasteCard(data) {
  const big = data.sessions.filter(s => s.msgs >= 5).sort((a, b) => b.cost - a.cost);
  const total = big.reduce((a, s) => a + s.cost, 0);
  const top = big.slice(0, 9);
  const pctTop8 = Math.round(big.slice(0, 8).reduce((a, s) => a + s.cost, 0) / total * 100);
  const maxCost = top[0].cost, barMax = 320;
  const rows = top.map((s, i) => {
    const y = 660 + i * 68;
    const barW = Math.max(4, barMax * (s.cost / maxCost));
    return `<text x="${M}" y="${y}" font-family="Mono" font-weight="700" font-size="24" fill="${DIM}">${String(i + 1).padStart(2, "0")}</text>
  <text x="${M + 52}" y="${y - 6}" font-family="Mono" font-weight="700" font-size="25" fill="${INK}">${esc(s.project.slice(0, 16))}</text>
  <text x="${M + 52}" y="${y + 17}" font-family="Mono" font-size="16" fill="${DIM}">${s.msgs}msg · ${tok(s.readPerMsg)}/turn · ${esc(shortModel(s.topModel))}</text>
  <rect x="${W - M - barMax - 132}" y="${y - 21}" width="${barW.toFixed(0)}" height="13" fill="${ACCENT}"/>
  <text x="${W - M}" y="${y}" text-anchor="end" font-family="Grotesk" font-weight="700" font-size="30" fill="${INK}">${usd(s.cost)}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>${fontFace()}</style>
<rect width="${W}" height="${H}" fill="${PAPER}"/>
<text x="${M}" y="120" font-family="Mono" font-weight="700" font-size="38" fill="${INK}">CLAUDE CODE</text>
<text x="${W - M}" y="122" text-anchor="end" font-family="Grotesk" font-weight="700" font-size="38" fill="${ACCENT}">✺</text>
<rect x="${M}" y="150" width="${W - 2 * M}" height="5" fill="${INK}"/>
<text x="${M}" y="196" font-family="Mono" font-size="22" fill="${DIM}">✺ COST CONCENTRATION · ${data.days.length} DAYS</text>
<text x="${M}" y="330" font-family="Mono" font-size="26" fill="${DIM}">where the cost actually lives —</text>
<text x="${M}" y="470" font-family="Grotesk" font-weight="700" font-size="170" fill="${ACCENT}">${pctTop8}%</text>
<text x="${M}" y="540" font-family="Grotesk" font-weight="700" font-size="40" fill="${INK}">of spend = just 8 sessions</text>
<text x="${M}" y="586" font-family="Mono" font-size="21" fill="${DIM}">they ran at ~500k-token context for thousands of turns. that is the lever.</text>
<rect x="${M}" y="612" width="${W - 2 * M}" height="2" fill="${INK}"/>
${rows}
<text x="${M}" y="1268" font-family="Mono" font-size="19" fill="${DIM}">✺ est · 100% local · /compact + split these, don't input-compress — TOKENOPS</text>
</svg>`;
}

if (process.argv[1] && process.argv[1].endsWith("savings-card.mjs")) {
  const data = scan();
  const r = buildCard(data);
  const OUT = path.join(HERE, "_out"); fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "savings-card.svg"), r.svg);
  fs.writeFileSync(path.join(OUT, "card-animated.html"), buildAnimatedHTML(data));
  fs.writeFileSync(path.join(OUT, "waste-card.svg"), buildWasteCard(data));
  console.log(`BEFORE ${usd(r.total)} · AFTER ${usd(r.after)} (−${r.pct}%) · wrote savings + animated + waste card`);
}
