// Kjører hver time: finner nye varsler for porteføljen og følgelisten og sender push.
import { getStore } from "@netlify/blobs";
import { alerts } from "../../public/lib/alerts.js";
import { vapid, sendAll } from "./push.mjs";

export default async () => {
  // Data leses fra GitHub-repoet (samme kilde som appen). Kan overstyres med DATA_URL i Netlify.
  const base = (process.env.DATA_URL || "https://raw.githubusercontent.com/kenhabbes-glitch/innsideradar/main/public").replace(/\/$/, "");
  const P = await getStore("portefolje").get("hoved", { type: "json" });
  if (!P || !base) return;
  const get = p => fetch(`${base}/data/${p}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [Q, ssr, ins, fund] = await Promise.all([get("quotes.json"), get("ssr.json"), get("insider.json"), get("fund.json")]);
  if (!Q) return;
  const radar = { short: Object.fromEntries((ssr || []).filter(x => x.tk).map(x => [x.tk, x])), ins: ins || [] };
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const list = alerts(P, Q, radar, fund || { f: {} }, today);

  const store = getStore("push");
  const sent = (await store.get("_sent", { type: "json" })) || {};
  const fresh = list.filter(a => !sent[a.key]);
  if (!fresh.length) return;
  await vapid(store);
  const body = fresh.slice(0, 3).map(a => a.text).join("\n") + (fresh.length > 3 ? `\n+ ${fresh.length - 3} til` : "");
  await sendAll(store, { title: fresh.length === 1 ? "Innsideradar" : `Innsideradar: ${fresh.length} nye varsler`, body, url: fresh.length === 1 ? `/#aksje/${encodeURIComponent(fresh[0].sym)}` : "/#portefolje" });
  const cutoff = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10);
  for (const a of fresh) sent[a.key] = today;
  for (const [k, d] of Object.entries(sent)) if (d < cutoff) delete sent[k];
  await store.setJSON("_sent", sent);
};

export const config = { schedule: "17 * * * *" };
