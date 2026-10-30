// Trendtvillinger: finner papirer som pleier å bevege seg sammen med aksjer/fond som nettopp har steget
// (eller falt) kraftig, men som selv ikke har fulgt etter ennå.
// Leser public/data/quotes.json og public/data/hist/*.json, skriver public/data/trend.json.
//
// Metoden, kort:
//  1. «Ledere» er papirer som har steget (eller falt) minst 10 % siste 20 handelsdager, uten at
//     hele bevegelsen kom på én dag (ett hopp skyldes som regel en melding som bare gjelder selskapet).
//  2. For hvert annet papir måles samvariasjonen med lederen på ukentlige endringer det siste
//     halvannet året, men FØR den siste måneden, så selve bevegelsen ikke teller med.
//  3. Ut fra samvariasjonen og svingningene regnes det ut hvor mye papiret «burde» ha beveget seg
//     (beta × lederens endring). Har det beveget seg klart mindre, havner det på listen.
//  4. Den samme metoden er kjørt bakover i tid, og treffraten lagres, så appen kan vise hvor ofte
//     signalet faktisk har slått til.
import { readFile } from "node:fs/promises";
import { readJson, writeJson, safe } from "./lib.mjs";

const DATA = new URL("../public/data/", import.meta.url);
export const CFG = {
  window: 20,        // handelsdager som teller som «nylig»
  move: 0.10,        // minst så stor endring for å være leder (10 % testet best bakover i tid)
  oneDay: 0.6,       // lederen utelates hvis én dag står for mer enn så stor del av bevegelsen
  minCorr: 0.5,      // minste samvariasjon (korrelasjon på ukeendringer)
  minGap: 0.06,      // papiret må ligge minst så langt etter det samvariasjonen tilsier
  weeks: 78,         // uker med historikk til samvariasjonen
  minWeeks: 40,
  minTurnover: 1e6,  // median daglig omsetning i kroner (gjelder ikke fond)
  horizon: 20,       // handelsdager fram i tid i tilbaketesten
};

// ---------- data ----------
async function load() {
  const Q = JSON.parse(await readFile(new URL("quotes.json", DATA), "utf8"));
  const series = {};
  for (const [sym, q] of Object.entries(Q.q)) {
    let h;
    try { h = JSON.parse(await readFile(new URL(`hist/${safe(sym)}.json`, DATA), "utf8")); } catch { continue; }
    if (!h?.t?.length) continue;
    const m = new Map();
    h.t.forEach((t, i) => { if (h.c[i] > 0) m.set(t, { c: h.c[i], v: h.v?.[i] || 0 }); });
    if (q.today?.t && q.today.c > 0) m.set(q.today.t, { c: q.today.c, v: q.today.v || 0 });
    series[sym] = { q, m };
  }
  // felles kalender: dager der minst en tredel av papirene handlet (fjerner helligdager i utlandet o.l.)
  const count = new Map();
  for (const { m } of Object.values(series)) for (const t of m.keys()) count.set(t, (count.get(t) || 0) + 1);
  const n = Object.keys(series).length;
  const days = [...count].filter(([, k]) => k >= n / 3).map(([t]) => t).sort();
  // sluttkurser på felles kalender, siste kjente kurs fylles fram (null før første handelsdag)
  const S = {};
  for (const [sym, { q, m }] of Object.entries(series)) {
    const c = new Array(days.length).fill(null), val = new Array(days.length).fill(0);
    let last = null;
    days.forEach((t, i) => { const x = m.get(t); if (x) { last = x.c; val[i] = x.c * x.v * (q.fx || 1); } c[i] = last; });
    S[sym] = { sym, q, c, val, fond: q.type === "fond" };
  }
  return { Q, days, S };
}

// ---------- hjelpere ----------
const ret = (s, a, b) => (s.c[a] && s.c[b] ? s.c[b] / s.c[a] - 1 : null);
function weeklyReturns(s, end, weeks) {
  const out = [];
  for (let k = 0; k < weeks; k++) {
    const b = end - 5 * k, a = b - 5;
    if (a < 0) break;
    out.push(s.c[a] && s.c[b] ? Math.log(s.c[b] / s.c[a]) : null);
  }
  return out;
}
function stats(x, y) {
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < x.length; i++) if (x[i] != null && y[i] != null) { n++; sx += x[i]; sy += y[i]; }
  if (n < CFG.minWeeks) return null;
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) if (x[i] != null && y[i] != null) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  if (!sxx || !syy) return null;
  return { corr: sxy / Math.sqrt(sxx * syy), beta: sxy / sxx, n }; // beta: papirets følsomhet for lederen
}
function median(a) { const v = a.filter(x => x != null).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : null; }
function liquid(s, end) {
  if (s.fond) return true;
  const m = median(s.val.slice(Math.max(0, end - 60), end + 1));
  return m != null && m >= CFG.minTurnover;
}
// Hvor stor del av bevegelsen kom på den største enkeltdagen (i samme retning)?
function oneDayShare(s, a, b) {
  const total = Math.log(s.c[b] / s.c[a]);
  let mx = 0;
  for (let i = a + 1; i <= b; i++) if (s.c[i] && s.c[i - 1]) { const r = Math.log(s.c[i] / s.c[i - 1]); if (Math.sign(r) === Math.sign(total)) mx = Math.max(mx, Math.abs(r)); }
  return total ? mx / Math.abs(total) : 1;
}

// ---------- selve søket på et gitt tidspunkt (indeks i kalenderen) ----------
export function scan(days, S, end) {
  const W = CFG.window, start = end - W;
  const syms = Object.keys(S).filter(s => S[s].c[start] && S[s].c[end] && liquid(S[s], end));
  const r = Object.fromEntries(syms.map(s => [s, ret(S[s], start, end)]));
  // samvariasjon måles på uker som slutter før perioden vi ser på
  const wk = Object.fromEntries(syms.map(s => [s, weeklyReturns(S[s], start, CFG.weeks)]));
  const leaders = { opp: [], ned: [] };
  for (const s of syms) {
    const dir = r[s] >= CFG.move ? "opp" : r[s] <= -CFG.move ? "ned" : null;
    if (!dir) continue;
    const share = oneDayShare(S[s], start, end);
    if (share > CFG.oneDay) continue;
    leaders[dir].push(s);
  }
  const out = { opp: new Map(), ned: new Map() };
  // papirer som selv har beveget seg kraftig (i en av retningene) hører ikke hjemme blant etternølerne
  const moved = new Set(syms.filter(s => Math.abs(r[s]) >= CFG.move));
  for (const dir of ["opp", "ned"]) {
    for (const f of syms) {
      if (moved.has(f)) continue;
      for (const l of leaders[dir]) {
        const st = stats(wk[f], wk[l]);
        if (!st || st.corr < CFG.minCorr) continue;
        // forventet endring for f gitt lederens endring: beta(f mot l) = corr × vol_f / vol_l
        const betaFL = st.corr * Math.sqrt(varOf(wk[f]) / varOf(wk[l]));
        const expected = betaFL * r[l];
        const gap = dir === "opp" ? expected - r[f] : r[f] - expected;
        if (gap < CFG.minGap) continue;
        const cur = out[dir].get(f) || { sym: f, ret: r[f], score: 0, gap: 0, links: [] };
        cur.links.push({ sym: l, ret: r[l], corr: st.corr, expected });
        cur.score += st.corr * gap;
        cur.gap = Math.max(cur.gap, gap);
        out[dir].set(f, cur);
      }
    }
  }
  return { leaders, r, opp: [...out.opp.values()], ned: [...out.ned.values()], universe: syms };
}
function varOf(x) {
  const v = x.filter(y => y != null); const m = v.reduce((a, b) => a + b, 0) / v.length;
  return v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
}

// ---------- tilbaketest: hvor ofte gikk det slik signalet antydet? ----------
export function backtest(days, S, step = 5) {
  const H = CFG.horizon, first = CFG.window + CFG.weeks * 5 / 2 | 0;
  const res = { opp: [], ned: [] };
  for (let end = first; end + H < days.length; end += step) {
    const sc = scan(days, S, end);
    const fwd = Object.fromEntries(sc.universe.map(s => [s, ret(S[s], end, end + H)]));
    const med = median(Object.values(fwd));
    if (med == null) continue;
    for (const dir of ["opp", "ned"]) for (const f of sc[dir]) {
      if (fwd[f.sym] == null) continue;
      res[dir].push({ d: days[end], sym: f.sym, ex: fwd[f.sym] - med, abs: fwd[f.sym] });
    }
  }
  const sum = dir => {
    const a = res[dir], n = a.length;
    if (!n) return { n: 0 };
    const good = a.filter(x => (dir === "opp" ? x.ex > 0 : x.ex < 0)).length;
    return { n, hit: good / n, ex: a.reduce((s, x) => s + x.ex, 0) / n, abs: median(a.map(x => x.abs)), dates: new Set(a.map(x => x.d)).size };
  };
  return { opp: sum("opp"), ned: sum("ned"), from: days[first], to: days[days.length - 1 - H], horizon: H, raw: res };
}

// ---------- kjøring ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const { Q, days, S } = await load();
  const end = days.length - 1;
  const sc = scan(days, S, end);
  const prev = await readJson("trend.json", null);
  // tilbaketesten er tung; kjøres én gang per døgn
  const todayStr = new Date().toISOString().slice(0, 10);
  let bt = prev?.backtest;
  if (!bt || bt.t?.slice(0, 10) !== todayStr || process.argv.includes("--bt")) {
    const b = backtest(days, S);
    bt = { t: new Date().toISOString(), from: b.from, to: b.to, horizon: b.horizon, opp: b.opp, ned: b.ned };
  }
  const nm = s => S[s].q.navn || s;
  const row = (f, dir) => ({
    sym: f.sym, navn: nm(f.sym), type: S[f.sym].q.type, sektor: S[f.sym].q.sektor || null,
    ret: round(f.ret), gap: round(f.gap), score: round(f.score),
    links: f.links.sort((a, b) => b.corr - a.corr).slice(0, 4).map(l => ({ sym: l.sym, navn: nm(l.sym), ret: round(l.ret), corr: round(l.corr), exp: round(l.expected) })),
  });
  const lead = dir => sc.leaders[dir].map(s => ({ sym: s, navn: nm(s), ret: round(sc.r[s]) })).sort((a, b) => (dir === "opp" ? b.ret - a.ret : a.ret - b.ret));
  const pick = dir => sc[dir].sort((a, b) => b.score - a.score).map(f => row(f, dir));
  const out = {
    updated: new Date().toISOString(), d: days[end], from: days[end - CFG.window], cfg: CFG,
    leaders: { opp: lead("opp"), ned: lead("ned") },
    opp: pick("opp"), ned: pick("ned"), backtest: bt,
  };
  await writeJson("trend.json", out);
  const p = x => (x * 100).toFixed(1) + " %";
  console.log(`Trend ${out.from} → ${out.d}: ${out.leaders.opp.length} har steget, ${out.leaders.ned.length} har falt. ` +
    `${out.opp.length} kan følge etter opp, ${out.ned.length} kan følge etter ned.`);
  console.log(`Tilbaketest ${bt.from}–${bt.to}: opp ${bt.opp.n} signaler, treff ${bt.opp.hit != null ? p(bt.opp.hit) : "–"}, meravkastning ${bt.opp.ex != null ? p(bt.opp.ex) : "–"} · ` +
    `ned ${bt.ned.n} signaler, treff ${bt.ned.hit != null ? p(bt.ned.hit) : "–"}, mindreavkastning ${bt.ned.ex != null ? p(bt.ned.ex) : "–"}`);
}
function round(x) { return x == null ? null : Math.round(x * 1e4) / 1e4; }
