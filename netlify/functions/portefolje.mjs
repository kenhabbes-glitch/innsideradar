// Lagrer den fiktive porteføljen i Netlify Blobs, slik at PC og mobil ser det samme.
// Beskyttet med en PIN som settes som miljøvariabel APP_PIN i Netlify.
// Handler slås sammen på id, så samtidige endringer fra to enheter ikke overskriver hverandre.
import { getStore } from "@netlify/blobs";
import { merge } from "../../public/lib/merge.js";

const KEY = "hoved";
const env = k => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k]);


export default async (req) => {
  const pin = env("APP_PIN");
  if (!pin) return new Response("APP_PIN er ikke satt i Netlify", { status: 500 });
  if (req.headers.get("x-pin") !== pin) return new Response("Feil PIN", { status: 401 });

  const store = getStore("portefolje");
  if (req.method === "GET") {
    const data = await store.get(KEY, { type: "json" });
    return Response.json(data || null);
  }
  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > 1_000_000) return new Response("For stor", { status: 413 });
    let incoming;
    try { incoming = JSON.parse(text); } catch { return new Response("Ugyldig JSON", { status: 400 }); }
    const current = await store.get(KEY, { type: "json" });
    const merged = merge(current, incoming);
    await store.setJSON(KEY, merged);
    return Response.json(merged);
  }
  return new Response("Ikke støttet", { status: 405 });
};

export const config = { path: "/api/portefolje" };
