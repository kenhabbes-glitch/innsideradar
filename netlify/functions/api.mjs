// Server for Innsideradar: innlogging (Netlify Identity, kun inviterte), brukere, porteføljer, gruppe og varsler.
// Samme oppsett som SofaPilot. Miljøvariabler i Netlify:
//   ADMIN_EMAILS  e-postadresser (kommaseparert) som alltid er admin
//   VAPID_SUBJECT valgfri avsender for push, f.eks. mailto:deg@eksempel.no
import { getStore, connectLambda } from "@netlify/blobs";
import webpush from "web-push";
import { merge } from "../../public/lib/merge.js";

const env = k => process.env[k] || "";
const db = () => globalThis.__IR_STORE__ || getStore("innsideradar");
const userKey = e => String(e || "").toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
const adminEmails = () => env("ADMIN_EMAILS").toLowerCase().replace(/["'<>]/g, "").split(/[,;\s]+/).filter(Boolean);
const json = (obj, status = 200) => ({ statusCode: status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(obj) });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function currentUser(event, context) {
  const u = context.clientContext?.user;
  if (u?.email) return u;
  const auth = event.headers?.authorization || event.headers?.Authorization;
  const idUrl = context.clientContext?.identity?.url;
  if (auth && idUrl) {
    try { const r = await fetch(idUrl + "/user", { headers: { Authorization: auth } }); if (r.ok) return await r.json(); } catch { /* ugyldig */ }
  }
  return null;
}
const isAdmin = u => !!u && ((u.app_metadata?.roles || []).includes("admin") || adminEmails().includes(String(u.email || "").toLowerCase()));

async function idAdmin(context, method, path, body) {
  const id = context.clientContext?.identity;
  if (!id?.url || !id?.token) throw new Error("Netlify Identity er ikke slått på for prosjektet");
  const r = await fetch(id.url + path, { method, headers: { Authorization: "Bearer " + id.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
  if (!r.ok) throw new Error((data && (data.msg || data.error_description || data.error)) || "Identity svarte " + r.status);
  return data;
}

export async function vapid() {
  let k = await db().get("vapid", { type: "json" });
  if (!k) { k = webpush.generateVAPIDKeys(); await db().setJSON("vapid", k); }
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:" + (adminEmails()[0] || "varsler@innsideradar.app"), k.publicKey, k.privateKey);
  return k;
}
export async function pushTo(key, payload) {
  const subs = (await db().get("push/" + key, { type: "json" })) || [];
  if (!subs.length) return 0;
  await vapid();
  let sent = 0; const keep = [];
  for (const s of subs) {
    try { await webpush.sendNotification(s, JSON.stringify(payload)); sent++; keep.push(s); }
    catch (e) { if (e.statusCode !== 404 && e.statusCode !== 410) keep.push(s); }
  }
  if (keep.length !== subs.length) await db().setJSON("push/" + key, keep);
  return sent;
}
async function allPortfolioKeys() {
  const { blobs } = await db().list({ prefix: "p/" });
  return blobs.map(b => b.key.slice(2));
}
const defaultProfile = email => ({ navn: String(email).split("@")[0], toppliste: true, feed: true });

export const handler = async (event, context) => {
  try { if (!globalThis.__IR_STORE__ && event.blobs) connectLambda(event); } catch { /* lokalt */ }
  const path = String(event.path || "").replace(/^\/(\.netlify\/functions\/api|api)\/?/, "");
  const method = event.httpMethod;
  const body = () => { try { return JSON.parse(event.body || "{}"); } catch { return {}; } };

  // Offentlig: liste over papirer brukerne har lagt til (leses av GitHub Actions). Bare symboler, ingen persondata.
  if (path === "ekstra") {
    const out = new Map();
    for (const k of await allPortfolioKeys()) {
      const P = await db().get("p/" + k, { type: "json" });
      for (const [s, e] of Object.entries(P?.extra || {})) if (e?.on && !out.has(s)) out.set(s, [s, e.navn || s, e.type || "aksje"]);
    }
    return json({ list: [...out.values()] });
  }

  const user = await currentUser(event, context);
  const me = user ? userKey(user.email) : null;
  if (path === "health") return json({ login: true, user: user?.email || null, admin: isAdmin(user), adminConfigured: adminEmails().length > 0 });
  if (!user) return json({ error: "Du må logge inn" }, 401);

  // ---------- Admin: brukere ----------
  if (path.startsWith("admin/")) {
    if (!isAdmin(user)) return json({ error: "Bare admin har tilgang" }, 403);
    try {
      const users = async () => (await idAdmin(context, "GET", "/admin/users?per_page=500"))?.users || [];
      if (path === "admin/users" && method === "GET") {
        return json({ users: (await users()).map(u => ({
          id: u.id, email: u.email, invited_at: u.invited_at || null, confirmed_at: u.confirmed_at || null, last_sign_in_at: u.last_sign_in_at || null,
          admin: isAdmin(u), fixedAdmin: adminEmails().includes(String(u.email || "").toLowerCase()), me: userKey(u.email) === me,
        })) });
      }
      if (method !== "POST") return json({ error: "Ugyldig metode" }, 405);
      const b = body();
      if (path === "admin/invite") {
        const email = String(b.email || "").trim().toLowerCase();
        if (!EMAIL.test(email)) return json({ error: "Ugyldig e-postadresse" }, 400);
        await idAdmin(context, "POST", "/invite", { email });
        return json({ ok: true });
      }
      const target = (await users()).find(u => u.id === b.id);
      if (!target) return json({ error: "Fant ikke brukeren" }, 404);
      const isMe = userKey(target.email) === me;
      if (path === "admin/delete") {
        if (isMe) return json({ error: "Du kan ikke fjerne deg selv" }, 400);
        await idAdmin(context, "DELETE", "/admin/users/" + encodeURIComponent(target.id));
        const k = userKey(target.email);
        for (const pre of ["p/", "prof/", "lb/", "push/"]) { try { await db().delete(pre + k); } catch { /* finnes ikke */ } }
        return json({ ok: true });
      }
      if (path === "admin/reinvite") {
        if (target.confirmed_at) return json({ error: "Brukeren har allerede akseptert invitasjonen" }, 400);
        await idAdmin(context, "DELETE", "/admin/users/" + encodeURIComponent(target.id));
        await idAdmin(context, "POST", "/invite", { email: target.email });
        return json({ ok: true });
      }
      if (path === "admin/role") {
        if (!b.admin && isMe) return json({ error: "Du kan ikke fjerne din egen admintilgang" }, 400);
        const roles = new Set(target.app_metadata?.roles || []);
        b.admin ? roles.add("admin") : roles.delete("admin");
        await idAdmin(context, "PUT", "/admin/users/" + encodeURIComponent(target.id), { app_metadata: { ...(target.app_metadata || {}), roles: [...roles] } });
        return json({ ok: true });
      }
      return json({ error: "Ukjent adminhandling" }, 404);
    } catch (err) { return json({ error: err.message }, 502); }
  }

  // ---------- Egen portefølje (synk mellom enheter) ----------
  if (path === "me/portfolio") {
    const key = "p/" + me;
    let cur = await db().get(key, { type: "json" });
    // Engangsflytting: porteføljen fra PIN-versjonen går til første admin som logger inn
    if (!cur && isAdmin(user)) {
      let old = null;
      try { old = await getStore("portefolje").get("hoved", { type: "json" }); } catch { /* fantes ikke */ }
      if (old && !(await db().get("migrated", { type: "json" }))) { cur = old; await db().setJSON(key, cur); await db().setJSON("migrated", { to: me, t: Date.now() }); }
    }
    if (method === "GET") return json({ data: cur || null });
    if (method === "PUT" || method === "POST") {
      const b = body();
      if (JSON.stringify(b).length > 1_000_000) return json({ error: "For mye data" }, 413);
      const { summary, ...incoming } = b;
      const merged = merge(cur, incoming);
      await db().setJSON(key, merged);
      if (summary && typeof summary === "object") await db().setJSON("lb/" + me, { ...pick(summary), t: Date.now() });
      return json({ data: merged });
    }
    return json({ error: "Ugyldig metode" }, 405);
  }

  // ---------- Profil og deling ----------
  if (path === "me/profile") {
    const key = "prof/" + me;
    let p = (await db().get(key, { type: "json" })) || defaultProfile(user.email);
    if (method === "POST" || method === "PUT") {
      const b = body();
      p = { navn: String(b.navn ?? p.navn).trim().slice(0, 30) || defaultProfile(user.email).navn, toppliste: b.toppliste ?? p.toppliste, feed: b.feed ?? p.feed };
      await db().setJSON(key, p);
    }
    return json({ profile: p, email: user.email, admin: isAdmin(user) });
  }

  // ---------- Toppliste ----------
  if (path === "group/leaderboard") {
    const rows = [];
    for (const k of await allPortfolioKeys()) {
      const prof = (await db().get("prof/" + k, { type: "json" })) || defaultProfile(k);
      if (!prof.toppliste && k !== me) continue;
      const s = await db().get("lb/" + k, { type: "json" });
      if (!s) continue;
      rows.push({ navn: prof.navn, me: k === me, skjult: !prof.toppliste, ...s });
    }
    rows.sort((a, b) => (b.alpha ?? -9) - (a.alpha ?? -9));
    return json({ rows });
  }

  // ---------- Felles feed med handler og begrunnelser ----------
  if (path === "group/feed") {
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const items = [];
    for (const k of await allPortfolioKeys()) {
      const prof = (await db().get("prof/" + k, { type: "json" })) || defaultProfile(k);
      if (!prof.feed && k !== me) continue;
      const P = await db().get("p/" + k, { type: "json" });
      for (const t of P?.trades || []) {
        if (t.d < since) continue;
        items.push({ id: t.id, navn: prof.navn, me: k === me, d: t.d, t: t.t, sym: t.sym, papir: t.navn || t.sym, side: t.side, price: t.price, cur: t.cur || "NOK", tags: t.tags || [], why: t.auto ? t.why : (t.why || ""), auto: !!t.auto, r30: t.r30?.svar || null });
      }
    }
    items.sort((a, b) => (a.t < b.t ? 1 : -1));
    return json({ items: items.slice(0, 200) });
  }

  // ---------- Søk etter papirer (Yahoo) ----------
  if (path === "sok") {
    const q = (event.queryStringParameters?.q || "").trim().slice(0, 60);
    if (q.length < 2) return json({ list: [] });
    const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0`, { headers: { "User-Agent": "Mozilla/5.0 (Innsideradar)" } });
    if (!r.ok) return json({ error: "Søket feilet" }, 502);
    const TYPES = { EQUITY: "aksje", ETF: "aksje", MUTUALFUND: "fond" };
    const j = await r.json();
    return json({ list: (j.quotes || []).filter(x => TYPES[x.quoteType]).map(x => ({ sym: x.symbol, navn: x.longname || x.shortname || x.symbol, type: TYPES[x.quoteType], kind: x.quoteType, bors: x.exchDisp || x.exchange || "" })) });
  }

  // ---------- Push-varsler ----------
  if (path === "push/key") return json({ publicKey: (await vapid()).publicKey });
  if (path === "push/subscribe" && method === "POST") {
    const b = body();
    if (!b.subscription?.endpoint) return json({ error: "Mangler abonnement" }, 400);
    let subs = (await db().get("push/" + me, { type: "json" })) || [];
    subs = subs.filter(x => x.endpoint !== b.subscription.endpoint).concat([b.subscription]).slice(-10);
    await db().setJSON("push/" + me, subs);
    return json({ ok: true, count: subs.length });
  }
  if (path === "push/test" && method === "POST") return json({ sent: await pushTo(me, { title: "Innsideradar", body: "Testvarsel: varslene virker.", url: "/#portefolje" }) });

  return json({ error: "Ukjent adresse" }, 404);
};

// Bare tall og korte tekster i topplisten
function pick(s) {
  const num = v => (typeof v === "number" && isFinite(v) ? v : null);
  return { start: String(s.start || "").slice(0, 10), tv: num(s.tv), ret: num(s.ret), bmRet: num(s.bmRet), alpha: num(s.alpha), handler: num(s.handler), posisjoner: num(s.posisjoner), blindtest: num(s.blindtest), blindN: num(s.blindN), quiz: num(s.quiz) };
}
