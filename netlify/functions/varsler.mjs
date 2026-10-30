// Kjører hver time: finner nye varsler for hver brukers portefølje og følgeliste og sender push.
import { getStore } from "@netlify/blobs";
import { alerts } from "../../public/lib/alerts.js";
import { pushTo } from "./api.mjs";

export default async () => {
  const base = (process.env.DATA_URL || "https://raw.githubusercontent.com/kenhabbes-glitch/innsideradar/data/public").replace(/\/$/, "");
  const get = p => fetch(`${base}/data/${p}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [Q, ssr, ins, fund, trend] = await Promise.all([get("quotes.json"), get("ssr.json"), get("insider.json"), get("fund.json"), get("trend.json")]);
  if (!Q) return;
  const radar = { short: Object.fromEntries((ssr || []).filter(x => x.tk).map(x => [x.tk, x])), ins: ins || [] };
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const db = getStore("innsideradar");
  const { blobs } = await db.list({ prefix: "p/" });
  const cutoff = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
  for (const b of blobs) {
    const key = b.key.slice(2);
    const subs = await db.get("push/" + key, { type: "json" });
    if (!subs?.length) continue;
    const P = await db.get(b.key, { type: "json" });
    if (!P) continue;
    const list = alerts(P, Q, radar, fund || { f: {} }, today, trend);
    const sent = (await db.get("sent/" + key, { type: "json" })) || {};
    const fresh = list.filter(a => !sent[a.key]);
    if (!fresh.length) continue;
    const body = fresh.slice(0, 3).map(a => a.text).join("\n") + (fresh.length > 3 ? `\n+ ${fresh.length - 3} til` : "");
    await pushTo(key, { title: fresh.length === 1 ? "Innsideradar" : `Innsideradar: ${fresh.length} nye varsler`, body, url: fresh.length === 1 ? `/#aksje/${encodeURIComponent(fresh[0].sym)}` : "/#portefolje" });
    for (const a of fresh) sent[a.key] = today;
    for (const [k, d] of Object.entries(sent)) if (d < cutoff) delete sent[k];
    await db.setJSON("sent/" + key, sent);
  }
};

export const config = { schedule: "17 * * * *" };
