// Henter shortposisjoner (Finanstilsynet) og meldepliktig handel (Newsweb, Oslo Børs)
// og skriver public/data/*.json. Kjøres av GitHub Actions. Krever Node 20+, ingen pakker.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { htmlToText, parseMessage } from "./parse.mjs";

const OUT = new URL("../public/data/", import.meta.url);
const DAYS = Number(process.env.DAYS || 30);
const NEWSWEB = "https://api3.oslo.oslobors.no/v1/newsreader";
const SSR = "https://ssr.finanstilsynet.no/api/v2/instruments";
const UA = { "User-Agent": "Innsideradar (privat analyseverktøy)", Accept: "application/json" };

const iso = d => d.toISOString().slice(0, 10);
const today = new Date();
const from = new Date(today.getTime() - DAYS * 864e5);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) } });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(1000 * i);
    }
  }
}
async function readJson(name, fallback) {
  try { return JSON.parse(await readFile(new URL(name, OUT), "utf8")); } catch { return fallback; }
}
const norm = s => s.toLowerCase()
  .replace(/\b(asa|as|ltd\.?|limited|plc|n\.v\.|s\.a\.|a\/s|p\/f|se|inc\.?|holdings?|group|the)\b/g, "")
  .replace(/[^a-z0-9æøå]/g, "");

// ---------- Shortposisjoner ----------
async function shorts(issuers) {
  const data = await getJson(SSR);
  const byName = new Map(issuers.map(i => [norm(i.name), i.sign]));
  const findTicker = name => {
    const n = norm(name);
    if (byName.has(n)) return byName.get(n);
    for (const [k, v] of byName) if (k && n && (k.startsWith(n) || n.startsWith(k)) && Math.min(k.length, n.length) >= 4) return v;
    return "";
  };
  const out = [];
  for (const i of data) {
    const ev = (i.events || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const last = ev[0];
    if (!last || !(last.shortPercent > 0)) continue;
    const lastT = new Date(last.date).getTime();
    const prev30 = ev.find(e => lastT - new Date(e.date).getTime() >= 30 * 864e5);
    const hist = ev.filter(e => today - new Date(e.date) <= 120 * 864e5).map(e => e.shortPercent).reverse();
    const step = Math.max(1, Math.ceil(hist.length / 14));
    out.push({
      name: i.issuerName, tk: findTicker(i.issuerName), isin: i.isin, d: last.date.slice(0, 10),
      p: last.shortPercent, p30: prev30 ? prev30.shortPercent : null,
      h: (last.activePositions || []).map(a => [a.positionHolder, a.shortPercent, a.date.slice(0, 10)]).sort((a, b) => b[1] - a[1]),
      hist: hist.filter((_, k) => k % step === 0 || k === hist.length - 1),
    });
  }
  return out.sort((a, b) => b.p - a.p);
}

// ---------- Innsidehandel ----------
async function insiders() {
  const cache = await readJson("insider-cache.json", {});
  const list = await getJson(`${NEWSWEB}/list?category=1102&fromDate=${iso(from)}&toDate=${iso(today)}`, { method: "POST" });
  const msgs = (list.data?.messages || []).filter(m => !m.correctedByMessageId && !m.test);
  let fetched = 0;
  for (const m of msgs) {
    if (cache[m.messageId]) continue;
    const j = await getJson(`${NEWSWEB}/message?messageId=${m.messageId}`, { method: "POST" }).catch(() => null);
    const body = htmlToText(j?.data?.message?.body || "");
    cache[m.messageId] = { ...parseMessage(body), title: m.title };
    fetched++;
    await sleep(150); // vær snill mot Newsweb
  }
  // rydd cache for meldinger eldre enn perioden
  const keep = new Set(msgs.map(m => String(m.messageId)));
  for (const k of Object.keys(cache)) if (!keep.has(k)) delete cache[k];

  const rows = msgs.map(m => {
    const p = cache[m.messageId];
    return {
      id: m.messageId, t: m.publishedTime, d: m.publishedTime.slice(0, 10), tk: m.issuerSign, co: m.issuerName,
      person: p.person, role: p.role, type: p.type, shares: p.shares, price: p.price, cur: p.cur,
      title: m.title, snippet: p.snippet,
    };
  });
  // fjern norsk/engelsk duplikat (samme selskap, samme minutt, samme antall)
  const seen = new Set();
  const dedup = rows.filter(r => {
    const key = `${r.tk}|${r.t.slice(0, 16)}|${r.shares}|${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  dedup.sort((a, b) => (a.t < b.t ? 1 : -1));
  return { rows: dedup, cache, fetched };
}

await mkdir(OUT, { recursive: true });
const issuers = (await getJson(`${NEWSWEB}/issuers`, { method: "POST" }).catch(() => null))?.data?.issuers
  ?.filter(i => i.isActive)
  ?.map(i => ({ name: i.name || "", sign: i.issuerSign || i.symbol || "" })) || [];

const [s, ins] = await Promise.all([shorts(issuers), insiders()]);
await writeFile(new URL("ssr.json", OUT), JSON.stringify(s));
await writeFile(new URL("insider.json", OUT), JSON.stringify(ins.rows));
await writeFile(new URL("insider-cache.json", OUT), JSON.stringify(ins.cache));
await writeFile(new URL("meta.json", OUT), JSON.stringify({ updated: new Date().toISOString(), days: DAYS, shorts: s.length, insider: ins.rows.length }));
console.log(`Short: ${s.length} selskaper · Innsidehandel: ${ins.rows.length} meldinger (${ins.fetched} nye hentet)`);
