// Push-varsler: lagrer abonnement fra hver enhet og sender testvarsel.
// VAPID-nøkler lages automatisk første gang og lagres i Netlify Blobs.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { createHash } from "node:crypto";

const env = k => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k]);

export async function vapid(store) {
  let k = await store.get("_vapid", { type: "json" });
  if (!k) { k = webpush.generateVAPIDKeys(); await store.setJSON("_vapid", k); }
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:varsler@innsideradar.app", k.publicKey, k.privateKey);
  return k;
}
export async function sendAll(store, payload) {
  const { blobs } = await store.list({ prefix: "sub-" });
  let sent = 0;
  for (const b of blobs) {
    const sub = await store.get(b.key, { type: "json" });
    try { await webpush.sendNotification(sub, JSON.stringify(payload)); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await store.delete(b.key); }
  }
  return sent;
}

export default async (req) => {
  const pin = env("APP_PIN");
  if (!pin || req.headers.get("x-pin") !== pin) return new Response("Feil PIN", { status: 401 });
  const store = getStore("push");
  const k = await vapid(store);
  if (req.method === "GET") return Response.json({ publicKey: k.publicKey });
  if (req.method === "POST") {
    if (new URL(req.url).searchParams.get("test")) {
      const n = await sendAll(store, { title: "Innsideradar", body: "Testvarsel: varslene virker.", url: "/#portefolje" });
      return Response.json({ sent: n });
    }
    const sub = await req.json();
    if (!sub?.endpoint) return new Response("Mangler abonnement", { status: 400 });
    const id = createHash("sha256").update(sub.endpoint).digest("hex").slice(0, 24);
    await store.setJSON("sub-" + id, sub);
    return Response.json({ ok: true });
  }
  return new Response("Ikke støttet", { status: 405 });
};

export const config = { path: "/api/push" };
