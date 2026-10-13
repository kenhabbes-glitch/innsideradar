// Felles tilstand, data og hjelpere for alle visningene.
import { merge } from "./lib/merge.js";
import { book as bookOf, runOrders } from "./lib/portfolio.js";

// ---------- formatering ----------
export const $ = id => document.getElementById(id);
export const nf0 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nf4 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 4 });
export const kr = v => (v == null || !isFinite(v) ? "–" : nf0.format(Math.round(v)) + " kr");
export const pct = (v, d = 1) => (v == null || !isFinite(v) ? "–" : (v >= 0 ? "+" : "") + (v * 100).toFixed(d).replace(".", ",") + " %");
export const pctPlain = (v, d = 1) => (v == null || !isFinite(v) ? "–" : (v * 100).toFixed(d).replace(".", ",") + " %");
export const big = v => (v == null ? "–" : Math.abs(v) >= 1e9 ? nf1.format(v / 1e9) + " mrd" : Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " mill" : nf0.format(v));
export const cls = v => (v == null ? "" : v >= 0 ? "pos" : "neg");
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const tick = sym => sym.replace(/\.OL$/, "").replace(/\.IR$/, "");
export const label = sym => (sym.endsWith(".IR") ? "" : tick(sym));
export const safe = s => s.replace(/[^A-Za-z0-9._-]/g, "_");
export const dmy = d => (d ? d.slice(0, 10).split("-").reverse().join(".") : "–");
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
export const daysBetween = (a, b) => Math.round((new Date(b.slice(0, 10)) - new Date(a.slice(0, 10))) / 864e5);
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const LS = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat modus */ } },
};
export const toneIcon = t => (t === "opp" ? "▲" : t === "ned" ? "▼" : "◆");
export function spark(vals, w = 90, h = 26, color) {
  const v = vals.filter(x => x != null);
  if (v.length < 2) return "";
  const mx = Math.max(...v), mn = Math.min(...v), r = mx - mn || 1;
  const pts = v.map((x, i) => [(i * (w - 4)) / (v.length - 1) + 2, h - 3 - ((x - mn) / r) * (h - 6)]);
  const c = color || (v[v.length - 1] >= v[0] ? "var(--up)" : "var(--down)");
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const L = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d} L${L[0].toFixed(1)} ${h} L2 ${h} Z" fill="${c}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${L[0]}" cy="${L[1]}" r="2.2" fill="${c}"/></svg>`;
}
export function toast(msg) {
  let t = $("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 4500);
}

// ---------- data ----------
export const D = { Q: { q: {}, updated: null }, RADAR: { short: {}, ins: [] }, FUND: { f: {} }, MACRO: {} };
const histCache = {}, newsCache = {};
const v = () => (D.Q.updated || "").slice(0, 13);

export async function loadAll() {
  const get = (u, fb) => window.irFetch(`${u}?v=${Date.now()}`).then(r => (r.ok ? r.json() : fb)).catch(() => fb);
  const [q, s, i, f, m] = await Promise.all([get("quotes.json", null), get("ssr.json", []), get("insider.json", []), get("fund.json", { f: {} }), get("macro.json", {})]);
  if (q) D.Q = q;
  D.RADAR = { short: Object.fromEntries(s.filter(x => x.tk).map(x => [x.tk, x])), ins: i };
  D.FUND = f; D.MACRO = m;
}
export async function hist(sym) {
  histCache[sym] ||= window.irFetch(`hist/${safe(sym)}.json?v=${v()}`).then(r => (r.ok ? r.json() : null)).then(h =>
    h ? h.t.map((t, k) => ({ t, o: h.o[k], h: h.h[k], l: h.l[k], c: h.c[k], v: h.v[k] })) : []).catch(() => []);
  const bars = (await histCache[sym]).slice();
  const td = D.Q.q[sym]?.today;
  if (td && (!bars.length || td.t > bars[bars.length - 1].t)) bars.push(td);
  return bars;
}
export async function news(sym) {
  newsCache[sym] ||= window.irFetch(`news/${safe(sym)}.json?v=${v().slice(0, 10)}`).then(r => (r.ok ? r.json() : [])).catch(() => []);
  return newsCache[sym];
}
export const price = sym => D.Q.q[sym]?.last ?? null;
// Valutakurs til NOK (1 for papirer i kroner) og kurs omregnet til kroner
export const fxOf = sym => D.Q.q[sym]?.fx ?? 1;
export const priceNok = sym => (price(sym) == null ? null : price(sym) * fxOf(sym));
export function closeAt(bars, d) { let c = null; for (const b of bars) { if (b.t > d) break; c = b.c; } return c ?? bars[0]?.c ?? null; }

// ---------- portefølje ----------
export const DEF = () => ({ startCash: 100000, trades: [], watch: {}, orders: {}, extra: {}, practice: { log: [] }, quiz: {}, resetAt: new Date().toISOString(), fee: { pct: 0.0005, min: 29 }, updated: new Date().toISOString() });
export const S = { P: DEF(), sync: { state: "lokal", msg: "Logger inn …" } };

export const book = upTo => bookOf(S.P, upTo);
export const fee = (val, type) => (type === "fond" ? 0 : Math.max(S.P.fee.min, val * S.P.fee.pct));
export const isWatched = sym => !!S.P.watch?.[sym]?.on;
export function toggleWatch(sym) { S.P.watch ||= {}; S.P.watch[sym] = { on: !isWatched(sym), t: new Date().toISOString() }; commit(); }
export function totalValue() {
  const b = book();
  return b.cash + Object.values(b.pos).reduce((a, p) => a + p.qty * (priceNok(p.sym) ?? (p.qty ? p.cost / p.qty : 0)), 0);
}

function setSync(state, msg) {
  S.sync = { state, msg };
  const b = $("sync");
  if (b) { b.className = "sync " + (state === "ok" ? "ok" : state === "err" ? "err" : ""); b.innerHTML = `<b>●</b> ${esc(msg)}`; }
}

// ---------- innlogging (Netlify Identity, som i SofaPilot) ----------
const ID = "/.netlify/identity";
export const AUTH = { user: null, admin: false, profile: null };
export function saveSession(t) { LS.set("ir.auth", { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in || 3600) * 1000 }); }
export function clearSession() { LS.set("ir.auth", null); AUTH.user = null; AUTH.admin = false; }
export async function accessToken() {
  const a = LS.get("ir.auth", null); if (!a) return null;
  if (Date.now() < a.expires_at - 60000) return a.access_token;
  try {
    const r = await fetch(ID + "/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: a.refresh_token }) });
    if (r.ok) { const t = await r.json(); saveSession(t); return t.access_token; }
  } catch { /* offline */ }
  LS.set("ir.auth", null); return null;
}
export async function api(path, opts = {}) {
  const t = await accessToken();
  const headers = { ...(opts.headers || {}) };
  if (t) headers.Authorization = "Bearer " + t;
  if (opts.json !== undefined) { headers["content-type"] = "application/json"; opts = { ...opts, body: JSON.stringify(opts.json) }; }
  const r = await fetch("/api/" + path, { ...opts, headers });
  if (r.status === 401) { clearSession(); window.dispatchEvent(new Event("ir-logout")); throw new Error("Du må logge inn"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Noe gikk galt (" + r.status + ")");
  return j;
}
// Hver bruker har sin egen lokale kopi på enheten
const pkey = () => "ir.p." + (AUTH.user || "lokal");
export function loadLocal() { S.P = LS.get(pkey(), null) || LS.get("ir.p", null) || DEF(); S.P.orders ||= {}; S.P.extra ||= {}; S.P.practice ||= { log: [] }; S.P.quiz ||= {}; }

// Kort oppsummering til topplisten
export async function summary() {
  const P = S.P, start = P.resetAt.slice(0, 10), tv = totalValue(), ret = tv / P.startCash - 1;
  let bmRet = null;
  try { const bm = await hist(D.Q.benchmark); const b0 = bm.find(x => x.t >= start)?.c; const b1 = price(D.Q.benchmark) ?? bm[bm.length - 1]?.c; if (b0 && b1) bmRet = b1 / b0 - 1; } catch { /* mangler */ }
  const b = book(), log = P.practice?.log || [];
  return { start, tv, ret, bmRet, alpha: bmRet == null ? null : ret - bmRet, handler: P.trades.length, posisjoner: Object.values(b.pos).filter(p => p.qty > 0).length,
    blindtest: log.length ? log.filter(r => r.guess === r.actual).length / log.length : null, blindN: log.length, quiz: Object.keys(P.quiz || {}).length };
}
export async function pull() {
  if (!AUTH.user) return;
  try {
    const { data } = await api("me/portfolio");
    if (data) { S.P = merge(S.P, data); LS.set(pkey(), S.P); }
    setSync("ok", "Synkronisert");
  } catch (e) { setSync("err", e.message === "Du må logge inn" ? "Logget ut" : "Ikke synket"); }
}
export async function push() {
  if (!AUTH.user) return;
  try {
    const { data } = await api("me/portfolio", { method: "PUT", json: { ...S.P, summary: await summary() } });
    if (data) { S.P = data; LS.set(pkey(), S.P); }
    setSync("ok", "Synkronisert");
  } catch { setSync("err", "Ikke synket – prøver igjen"); }
}
let pushT;
export function commit() {
  S.P.updated = new Date().toISOString(); LS.set(pkey(), S.P); setSync("lokal", "Lagrer …");
  clearTimeout(pushT); pushT = setTimeout(push, 400);
}

// Utfører stop-loss og kursmål som er nådd siden sist
export async function applyOrders() {
  const syms = Object.keys(S.P.orders || {});
  if (!syms.length) return 0;
  const bars = Object.fromEntries(await Promise.all(syms.map(async s => [s, await hist(s)])));
  const fresh = runOrders(S.P, s => bars[s], fee);
  if (fresh.length) {
    S.P.trades.push(...fresh);
    S.P.trades.sort((a, b) => (a.t < b.t ? -1 : 1));
    for (const t of fresh) if (S.P.orders[t.sym]) S.P.orders[t.sym] = { ...S.P.orders[t.sym], del: true, t: new Date().toISOString() };
    commit();
    toast(fresh.map(t => `${t.navn || t.sym}: ${t.why}`).join(" · "));
  }
  return fresh.length;
}
