// Henter børsmeldinger per selskap fra Newsweb (siste 2 år), brukt i «Hva skjedde her?».
// Kjøres én gang per døgn. Skriver public/data/news/<SYMBOL>.json = [[dato, tittel, kategori, id], ...]
import { universe, writeJson, fresh, getJson, sleep, safe } from "./lib.mjs";

if (await fresh("news/_meta.json", 20) && !process.env.FORCE) { console.log("Børsmeldinger: ferske, hopper over"); process.exit(0); }

const U = await universe();
const iso = d => d.toISOString().slice(0, 10);
const now = new Date();
const ranges = [[new Date(now - 365 * 864e5), now], [new Date(now - 730 * 864e5), new Date(now - 365 * 864e5)]];
let ok = 0;
for (const [sym, , type] of U.instruments) {
  if (type !== "aksje") continue;
  const sign = sym.replace(/\.OL$/, "");
  try {
    const rows = [];
    for (const [a, b] of ranges) {
      const j = await getJson(`https://api3.oslo.oslobors.no/v1/newsreader/list?issuer=${encodeURIComponent(sign)}&fromDate=${iso(a)}&toDate=${iso(b)}`, { method: "POST" });
      for (const m of j.data?.messages || []) {
        if (m.issuerSign !== sign || m.test) continue;
        rows.push([m.publishedTime.slice(0, 16), m.title, m.category?.[0]?.category_no || "", m.messageId]);
      }
      await sleep(200);
    }
    rows.sort((x, y) => (x[0] < y[0] ? 1 : -1));
    await writeJson(`news/${safe(sym)}.json`, rows);
    ok++;
  } catch (e) { console.warn(`${sym}: ${e.message}`); }
}
await writeJson("news/_meta.json", { updated: new Date().toISOString(), ok });
console.log(`Børsmeldinger: ${ok} selskaper`);
