// Liste over papirer du har lagt til i appen. Leses av GitHub Actions, som da henter kurser for dem.
// Inneholder bare symbol, navn og type (ingen porteføljedata).
import { getStore } from "@netlify/blobs";

export default async () => {
  const P = await getStore("portefolje").get("hoved", { type: "json" });
  const list = Object.entries(P?.extra || {}).filter(([, e]) => e?.on).map(([s, e]) => [s, e.navn || s, e.type || "aksje"]);
  return Response.json({ list }, { headers: { "cache-control": "no-store" } });
};
export const config = { path: "/api/ekstra" };
