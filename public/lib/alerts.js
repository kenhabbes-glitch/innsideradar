// Varsler for aksjer du eier eller følger. Brukes i appen (varselliste) og av push-funksjonen.
import { book, activeOrders } from "./portfolio.js";

const IMPORTANT = new Set(["golden", "death", "rsiHøy", "rsiLav", "volum", "toppår", "bunnår"]);

export function alerts(P, Q, radar = {}, fund = {}, today) {
  const b = book(P);
  const watched = Object.entries(P.watch || {}).filter(([, w]) => w?.on).map(([s]) => s);
  const owned = Object.values(b.pos).filter(p => p.qty > 0).map(p => p.sym);
  const syms = [...new Set([...owned, ...watched])];
  const out = [];
  const add = (sym, type, tone, text, date = today) => out.push({ key: `${sym}|${type}|${date}`, sym, type, tone, text, d: date, navn: Q.q?.[sym]?.navn || sym });

  for (const sym of syms) {
    const q = Q.q?.[sym];
    if (!q) continue;
    const navn = q.navn, tk = sym.replace(/\.OL$/, "");
    for (const [tone, title, key] of q.sig || []) {
      if (IMPORTANT.has(key) || (key || "").startsWith("mønster-")) add(sym, key, tone, `${navn}: ${title}`, q.d);
    }
    const ins = (radar.ins || []).filter(r => r.tk === tk && r.d >= daysAgo(today, 2));
    for (const r of ins) if (r.type === "K" || r.type === "S") add(sym, "innside-" + r.id, r.type === "K" ? "opp" : "ned", `${navn}: innside${r.type === "K" ? "kjøp" : "salg"} av ${r.person || "primærinnsider"}`, r.d);
    const sh = radar.short?.[tk];
    if (sh && sh.p30 != null && sh.p - sh.p30 >= 0.5 && sh.d >= daysAgo(today, 3)) add(sym, "short", "ned", `${navn}: shorten har økt til ${sh.p.toFixed(2).replace(".", ",")} %`, sh.d);
    const f = fund.f?.[sym];
    const next = (f?.earnings || []).find(d => d >= today);
    if (next && daysBetween(today, next) <= 2) add(sym, "rapport", "nøytral", `${navn}: kvartalsrapport ${next === today ? "i dag" : next.split("-").reverse().join(".")}`, next);
    if (f?.exDiv && f.exDiv >= today && daysBetween(today, f.exDiv) <= 2) add(sym, "utbytte", "nøytral", `${navn}: siste dag med rett til utbytte før ${f.exDiv.split("-").reverse().join(".")}`, f.exDiv);
  }
  for (const [sym, o] of activeOrders(P)) {
    const q = Q.q?.[sym]; if (!q || !b.pos[sym]?.qty) continue;
    if (o.stop && q.last <= o.stop * 1.03 && q.last > o.stop) add(sym, "nærstop", "ned", `${q.navn}: under 3 % fra stop-loss (${o.stop})`, q.d);
    if (o.target && q.last >= o.target * 0.97 && q.last < o.target) add(sym, "nærmål", "opp", `${q.navn}: under 3 % fra kursmålet (${o.target})`, q.d);
  }
  for (const t of P.trades || []) if (t.auto && t.d >= daysAgo(today, 2)) add(t.sym, "auto-" + t.id, "nøytral", `${t.navn || t.sym}: ${t.why}`, t.d);
  return out.sort((a, b) => (a.d < b.d ? 1 : -1));
}
const daysAgo = (d, n) => new Date(new Date(d + "T12:00:00Z") - n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
