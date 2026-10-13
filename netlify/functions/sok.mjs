// Søk etter aksjer, ETF-er og fond hos Yahoo Finance (nettleseren kan ikke spørre Yahoo direkte).
const env = k => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k]);
const TYPES = { EQUITY: "aksje", ETF: "aksje", MUTUALFUND: "fond" };

export default async (req) => {
  if (req.headers.get("x-pin") !== env("APP_PIN")) return new Response("Feil PIN", { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ list: [] });
  const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0`, { headers: { "User-Agent": "Mozilla/5.0 (Innsideradar)" } });
  if (!r.ok) return new Response("Søket feilet", { status: 502 });
  const j = await r.json();
  const list = (j.quotes || []).filter(x => TYPES[x.quoteType]).map(x => ({
    sym: x.symbol, navn: x.longname || x.shortname || x.symbol, type: TYPES[x.quoteType], kind: x.quoteType, bors: x.exchDisp || x.exchange || "",
  }));
  return Response.json({ list });
};
export const config = { path: "/api/sok" };
