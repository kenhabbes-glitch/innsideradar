// Henter dagskurser (OHLC + volum) fra Yahoo Finance for alle instrumenter i universe.json.
// Skriver public/data/quotes.json (oversikt + dagens lys) og public/data/hist/<SYMBOL>.json (historikk).
// Historikken skrives bare når en ny handelsdag er avsluttet, så git-historikken holder seg liten.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { summary } from "../public/lib/indicators.js";

const ROOT = new URL("../public/data/", import.meta.url);
const HIST = new URL("hist/", ROOT);
const U = JSON.parse(await readFile(new URL("./universe.json", import.meta.url), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const safe = s => s.replace(/[^A-Za-z0-9._-]/g, "_");

// Er Oslo Børs stengt for dagen? (etter 16:40 norsk tid eller helg)
const osloNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
const osloDate = osloNow.toISOString().slice(0, 10);
const closed = osloNow.getDay() === 0 || osloNow.getDay() === 6 || osloNow.getHours() * 60 + osloNow.getMinutes() >= 16 * 60 + 40;

async function chart(sym, range = "2y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d&includePrePost=false`;
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Innsideradar)" } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const res = j.chart?.result?.[0];
      if (!res?.timestamp) throw new Error("tom");
      return res;
    } catch (e) {
      if (i === 3) throw new Error(`${sym}: ${e.message}`);
      await sleep(800 * i);
    }
  }
}

function toBars(res) {
  const q = res.indicators.quote[0];
  const tz = res.meta.exchangeTimezoneName || "Europe/Oslo";
  const bars = [];
  res.timestamp.forEach((ts, k) => {
    const c = q.close[k];
    if (c == null) return;
    const t = new Date(ts * 1000).toLocaleDateString("sv-SE", { timeZone: tz }); // YYYY-MM-DD
    const r4 = x => (x == null ? c : Math.round(x * 10000) / 10000);
    const bar = { t, o: r4(q.open[k]), h: r4(q.high[k]), l: r4(q.low[k]), c: r4(c), v: q.volume?.[k] || 0 };
    if (bars.length && bars[bars.length - 1].t === t) bars[bars.length - 1] = bar; else bars.push(bar);
  });
  // fond har ofte bare sluttkurs: lag «flate» lys
  return bars;
}

async function readJson(url, fb) { try { return JSON.parse(await readFile(url, "utf8")); } catch { return fb; } }

await mkdir(HIST, { recursive: true });
const quotes = {};
let ok = 0, failed = [];
for (const [sym, navn, type, sektor] of U.instruments) {
  try {
    const res = await chart(sym, type === "fond" ? "5y" : "2y");
    const bars = toBars(res);
    const last = bars[bars.length - 1];
    const today = last.t === osloDate && !closed ? last : null; // dagens lys er ikke ferdig
    const done = today ? bars.slice(0, -1) : bars;
    const file = new URL(`${safe(sym)}.json`, HIST);
    const old = await readJson(file, null);
    const packed = { s: sym, cur: res.meta.currency || "NOK", t: done.map(b => b.t), o: done.map(b => b.o), h: done.map(b => b.h), l: done.map(b => b.l), c: done.map(b => b.c), v: done.map(b => b.v) };
    if (!old || old.t?.[old.t.length - 1] !== packed.t[packed.t.length - 1] || old.t.length !== packed.t.length) {
      await writeFile(file, JSON.stringify(packed));
    }
    const sum = summary(bars);
    quotes[sym] = {
      navn, type, sektor, cur: packed.cur, last: res.meta.regularMarketPrice ?? last.c,
      time: res.meta.regularMarketTime ? new Date(res.meta.regularMarketTime * 1000).toISOString() : null,
      today, ...sum,
    };
    ok++;
  } catch (e) {
    failed.push(sym);
    console.warn(String(e.message || e));
  }
  await sleep(250);
}

// behold forrige kurs for instrumenter som feilet denne gangen
const prev = await readJson(new URL("quotes.json", ROOT), { q: {} });
for (const s of failed) if (prev.q?.[s]) quotes[s] = { ...prev.q[s], stale: true };

await writeFile(new URL("quotes.json", ROOT), JSON.stringify({ updated: new Date().toISOString(), benchmark: U.benchmark, q: quotes }));
console.log(`Kurser: ${ok} ok, ${failed.length} feilet${failed.length ? " (" + failed.join(", ") + ")" : ""}`);
