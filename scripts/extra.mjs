// Henter papirene du har lagt til i appen (via Netlify-funksjonen /api/ekstra).
// Krever at GitHub-variabelen SITE_URL er satt, f.eks. https://innsideradar-kenneth.netlify.app
import { readJson, writeJson, getJson } from "./lib.mjs";

const site = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!site) { console.log("Ekstra papirer: SITE_URL ikke satt, hopper over"); process.exit(0); }
try {
  const j = await getJson(`${site}/api/ekstra`);
  const list = (j.list || []).filter(x => Array.isArray(x) && /^[\w.^=-]{1,20}$/.test(x[0])).slice(0, 200);
  await writeJson("extra.json", { updated: new Date().toISOString(), list });
  console.log(`Ekstra papirer: ${list.length}`);
} catch (e) {
  const old = await readJson("extra.json", null);
  console.warn(`Ekstra papirer feilet (${e.message})${old ? ", beholder forrige liste" : ""}`);
}
