// Henter makrodata: Brent-olje, USD/NOK, EUR/NOK, styringsrenten, laksepris og strømpris.
// Skriver public/data/macro.json. Hver kilde er valgfri: feiler én, beholdes forrige verdi.
import { readJson, writeJson, getJson, sleep, osloDate } from "./lib.mjs";

const old = await readJson("macro.json", {});
const out = { ...old, updated: new Date().toISOString() };

async function yahoo(sym) {
  const j = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=2y&interval=1d`);
  const r = j.chart.result[0], c = r.indicators.quote[0].close;
  return r.timestamp.map((t, k) => [new Date(t * 1000).toISOString().slice(0, 10), c[k] == null ? null : Math.round(c[k] * 10000) / 10000]).filter(x => x[1] != null);
}
async function step(name, fn) {
  try { out[name] = await fn(); console.log(`Makro ${name}: ${Array.isArray(out[name]) ? out[name].length : "ok"}`); }
  catch (e) { console.warn(`Makro ${name}: ${e.message}`); }
}

await step("brent", () => yahoo("BZ=F"));
await step("usdnok", () => yahoo("NOK=X"));
await step("eurnok", () => yahoo("EURNOK=X"));

// Styringsrenten fra Norges Bank (CSV)
await step("rente", async () => {
  const t = await fetch("https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=csv&startPeriod=2023-01-01&locale=en").then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
  const rows = t.trim().split("\n").slice(1).map(l => l.split(";")).map(c => [c[11], +c[12]]).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r[0]) && isFinite(r[1]));
  // komprimer: bare dager der renten endres + siste dag
  return rows.filter((r, i) => i === 0 || i === rows.length - 1 || r[1] !== rows[i - 1][1]);
});

// Eksportpris fersk laks (kr/kg, ukentlig) fra SSB tabell 03024
await step("laks", async () => {
  const j = await getJson("https://data.ssb.no/api/v0/no/table/03024/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: [
      { code: "VareGrupper2", selection: { filter: "item", values: ["01"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Kilopris"] } },
      { code: "Tid", selection: { filter: "top", values: ["156"] } },
    ], response: { format: "json-stat2" } }),
  });
  const idx = j.dimension.Tid.category.index;
  return Object.entries(idx).sort((a, b) => a[1] - b[1]).map(([uke, i]) => [weekToDate(uke), j.value[i]]).filter(x => x[1] != null);
});

// Strømpris: dagssnitt per prisområde. Bygges opp over tid (henter dager som mangler, maks 120 tilbake).
await step("strom", async () => {
  const prev = old.strom || {};
  const res = {};
  const today = new Date(osloDate() + "T12:00:00Z");
  for (const z of ["NO1", "NO2", "NO3", "NO4", "NO5"]) {
    const have = new Map((prev[z] || []).map(r => [r[0], r[1]]));
    for (let d = 120; d >= -1; d--) {
      const day = new Date(today - d * 864e5).toISOString().slice(0, 10);
      if (have.has(day) && d > 1) continue;
      const [y, m, dd] = day.split("-");
      try {
        const r = await fetch(`https://www.hvakosterstrommen.no/api/v1/prices/${y}/${m}-${dd}_${z}.json`);
        if (!r.ok) continue;
        const a = await r.json();
        if (a.length) have.set(day, Math.round(a.reduce((s, x) => s + x.NOK_per_kWh, 0) / a.length * 10000) / 10000);
      } catch { /* hopp over */ }
      await sleep(60);
    }
    res[z] = [...have.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-400);
  }
  return res;
});

await writeJson("macro.json", out);

function weekToDate(code) { // "2026U40" → mandag i uke 40
  const [y, w] = code.split("U").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const mon = new Date(jan4 - ((jan4.getUTCDay() + 6) % 7) * 864e5 + (w - 1) * 7 * 864e5);
  return mon.toISOString().slice(0, 10);
}
