// AUDIT — one scan exercises every exported path. Not shipped (files: in package.json excludes it).
import { scan, usd } from "./lib.mjs";
import { advise } from "./advisor.mjs";
import { observatory, trend } from "./observatory.mjs";
import { buildCard, buildAnimatedHTML } from "./savings-card.mjs";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));

const data = scan();
const a = (c, m) => { if (!c) throw new Error("AUDIT FAIL: " + m); };
a(data.sessions.length > 0, "sessions");
a(data.totals.cost > 0, "cost");
a(Math.abs((data.totals.c.in + data.totals.c.out + data.totals.c.read + data.totals.c.write) - data.totals.cost) < 1, "component sum == total");
a(data.days.length > 0, "days");

console.log(`scan: ${data.sessions.length} sessions · ${data.totals.msgs} msgs · ${usd(data.totals.cost)} · ${data.days.length} days`);
console.log("\n--- ADVISE ---\n" + advise(data));
console.log("\n--- WASTE ---\n" + observatory(data));
console.log("\n--- TREND ---\n" + trend(data));
const r = buildCard(data);
a(r.svg.includes("<svg") && r.svg.length > 50000, "card svg + embedded fonts");
a(r.after < r.total && r.after > 0, "after < before > 0");
const html = buildAnimatedHTML(data);
a(html.includes("#final") && html.includes("setFinal") && html.length > 50000, "animated html + #final + fonts");
const OUT = path.join(HERE, "_out"); fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "savings-card.svg"), r.svg);
console.log(`\n--- CARD --- BEFORE ${usd(r.total)} → AFTER ${usd(r.after)} (−${r.pct}%) · svg ${(r.svg.length / 1024).toFixed(0)}KB`);
console.log("\nAUDIT: ALL PASS");
