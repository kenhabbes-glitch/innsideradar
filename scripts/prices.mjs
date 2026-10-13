// Henter kurser (OHLC + volum) fra Yahoo Finance for alle instrumenter (kjerne + hele Oslo Børs + egne).
// Hver time: siste 5 dager per papir (raskt). Full historikk (aksjer 2 år, fond 5 år) bare når den mangler.
// Skriver public/data/quotes.json (oversikt + dagens lys) og public/data/hist/<SYMBOL>.json.
import { mkdir } from "node:fs/promises";
import { summary } from "../public/lib/indicators.js";
import { universe, allInstruments, readJson, writeJson, sleep, safe } from "./lib.mjs";

const U = await universe();
const LIST = await allInstruments();

const osloDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
const hm = new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" });
const wd = new Date(osloDate + "T12:00:00Z").getUTCDay();
const closed = wd === 0 || wd === 6 || hm >= "16:40";

async function chart(sym, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includePrePost=false`;
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Innsideradar)" } });
      if (r.status === 404) throw Object.assign(new Error("finnes ikke"), { fatal: true });
      if (!r.ok) throw new Error(r.status);
      const res = (await r.json()).chart?.result?.[0];
      if (!res?.timestamp) throw Object.assign(new Error("ingen kurser"), { fatal: true });
      return res;
    } catch (e) {
      if (i === 3 || e.fatal) throw new Error(`${sym}: ${e.message}`);
      await sleep(800 * i);
    }
  }
}
function toBars(res) {
  const q = res.indicators.quote[0], tz = res.meta.exchangeTimezoneName || "Europe/Oslo", bars = [];
  res.timestamp.forEach((ts, k) => {
    const c = q.close[k];
    if (c == null) return;
    const t = new Date(ts * 1000).toLocaleDateString("sv-SE", { timeZone: tz });
    const r4 = x => (x == null ? c : Math.round(x * 10000) / 10000);
    const bar = { t, o: r4(q.open[k]), h: r4(q.high[k]), l: r4(q.low[k]), c: r4(c), v: q.volume?.[k] || 0 };
    if (bars.length && bars[bars.length - 1].t === t) bars[bars.length - 1] = bar; else bars.push(bar);
  });
  return bars;
}
const unpack = h => (h?.t || []).map((t, k) => ({ t, o: h.o[k], h: h.h[k], l: h.l[k], c: h.c[k], v: h.v[k] }));
const pack = (sym, cur, b) => ({ s: sym, cur, t: b.map(x => x.t), o: b.map(x => x.o), h: b.map(x => x.h), l: b.map(x => x.l), c: b.map(x => x.c), v: b.map(x => x.v) });

// Valutakurser til NOK (for papirer som ikke handles i kroner)
const fxCache = { NOK: 1 };
async function fx(cur) {
  if (!cur) return 1;
  const pence = cur === "GBp" || cur === "GBX";
  const c = pence ? "GBP" : cur.toUpperCase();
  if (fxCache[c] == null) {
    try { const r = await chart(`${c}NOK=X`, "5d"); fxCache[c] = r.meta.regularMarketPrice; } catch { fxCache[c] = null; }
  }
  return fxCache[c] == null ? null : fxCache[c] / (pence ? 100 : 1);
}

await mkdir(new URL("hist/", new URL("../public/data/", import.meta.url)), { recursive: true });
const prev = await readJson("quotes.json", { q: {} });
const quotes = {};
let ok = 0, full = 0;
const failed = [];
for (const [sym, navn, type, sektor, kilde] of LIST) {
  try {
    const file = `hist/${safe(sym)}.json`;
    const old = unpack(await readJson(file, null));
    const lastOld = old[old.length - 1]?.t;
    const stale = !lastOld || (new Date(osloDate) - new Date(lastOld)) / 864e5 > 20;
    const res = await chart(sym, stale ? (type === "fond" ? "5y" : "2y") : "1mo");
    if (stale) full++;
    const fresh = toBars(res);
    // slå sammen: gamle dager + nye dager (nye vinner)
    const byDay = new Map(old.map(b => [b.t, b]));
    for (const b of fresh) byDay.set(b.t, b);
    const keepFrom = new Date(new Date(osloDate) - (type === "fond" ? 5.1 : 2.1) * 365 * 864e5).toISOString().slice(0, 10);
    const bars = [...byDay.values()].filter(b => b.t >= keepFrom).sort((a, b) => (a.t < b.t ? -1 : 1));
    const last = bars[bars.length - 1];
    const today = last.t === osloDate && !closed ? last : null;
    const done = today ? bars.slice(0, -1) : bars;
    const cur = res.meta.currency || "NOK";
    if (done[done.length - 1]?.t !== lastOld || done.length !== old.length) await writeJson(file, pack(sym, cur, done));
    quotes[sym] = {
      navn, type, sektor, kilde, cur, fx: cur === "NOK" ? 1 : await fx(cur),
      last: res.meta.regularMarketPrice ?? last.c,
      time: res.meta.regularMarketTime ? new Date(res.meta.regularMarketTime * 1000).toISOString() : null,
      today, ...summary(bars),
    };
    ok++;
  } catch (e) {
    failed.push(sym);
    if (prev.q?.[sym]) quotes[sym] = { ...prev.q[sym], navn, sektor, stale: true };
  }
  await sleep(120);
}
await writeJson("quotes.json", { updated: new Date().toISOString(), benchmark: U.benchmark, q: quotes });
console.log(`Kurser: ${ok} ok (${full} med full historikk), ${failed.length} feilet${failed.length ? ": " + failed.slice(0, 30).join(", ") : ""}`);
