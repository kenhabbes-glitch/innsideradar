import { $, D, esc, nf2, pct, pctPlain, cls, label, spark, isWatched, toggleWatch, hist } from "../core.js";
import { annualized, volatility, maxDrawdown, weekly, correlation } from "../lib/stats.js";

// ---------- makro ----------
export const MACRO = {
  brent: { navn: "Brent olje", enhet: "USD/fat", tekst: "Oljeprisen styrer inntektene til oljeselskaper og aktiviteten hos oljeservice." },
  usdnok: { navn: "USD/NOK", enhet: "kr", tekst: "Svak krone (høy kurs) gir mer kroner for eksportselskaper som selger i dollar: olje, sjømat, shipping." },
  eurnok: { navn: "EUR/NOK", enhet: "kr", tekst: "Viktig for selskaper som selger til Europa, og for importvarer i handel." },
  rente: { navn: "Styringsrenten", enhet: "", tekst: "Høy rente gir bankene bedre marginer, men gjør lån dyrere for eiendom, bygg og forbrukere." },
  laks: { navn: "Laks", enhet: "kr/kg", tekst: "Eksportprisen på fersk laks (SSB, ukentlig). Driver inntektene til oppdretterne direkte." },
  strom: { navn: "Strøm", enhet: "kr/kWh", tekst: "Snitt for Norge (NO1–NO5). Høy pris er bra for kraftprodusenter, dårlig for kraftkrevende industri." },
};
export const MACRO_FOR = {
  Energi: ["brent", "usdnok"], Oljeservice: ["brent"], Sjømat: ["laks", "usdnok"], Shipping: ["usdnok", "brent"],
  Industri: ["usdnok", "strom"], Fornybar: ["strom", "rente"], Finans: ["rente"], "Bygg og eiendom": ["rente"],
  Teknologi: ["usdnok"], Telekom: ["rente"], Forbruk: ["rente", "eurnok"],
};
export function macroSeries(key) {
  const M = D.MACRO;
  if (key === "strom") {
    const zones = Object.values(M.strom || {});
    const by = new Map();
    for (const z of zones) for (const [d, v] of z) { const a = by.get(d) || []; a.push(v); by.set(d, a); }
    return [...by.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, a]) => [d, a.reduce((s, x) => s + x, 0) / a.length]);
  }
  return M[key] || [];
}
const back = (s, days) => { if (!s.length) return null; const t = new Date(new Date(s[s.length - 1][0]) - days * 864e5).toISOString().slice(0, 10); let v = null; for (const [d, x] of s) { if (d > t) break; v = x; } return v; };
export function macroTile(key) {
  const s = macroSeries(key);
  if (!s.length) return "";
  const last = s[s.length - 1][1], w = back(s, 7), m = back(s, 30);
  const fmt = key === "rente" ? nf2.format(last) + " %" : key === "strom" ? nf2.format(last) : nf2.format(last);
  const tail = s.slice(-(key === "laks" ? 52 : key === "rente" ? 40 : 90)).map(x => x[1]);
  return `<div class="kpi mac" title="${esc(MACRO[key].tekst)}"><span class="l">${MACRO[key].navn}</span>
    <span class="v">${fmt}<small> ${MACRO[key].enhet}</small></span>
    ${key === "rente" ? `<span class="s">${m != null && m !== last ? `${last > m ? "opp" : "ned"} ${nf2.format(Math.abs(last - m))} poeng siste mnd` : "uendret siste mnd"}</span>` : `<span class="s"><span class="${cls(w ? last / w - 1 : null)}">${w ? pct(last / w - 1) : "–"}</span> uke · <span class="${cls(m ? last / m - 1 : null)}">${m ? pct(last / m - 1) : "–"}</span> mnd</span>`}
    ${spark(tail, 120, 24, "var(--neutral)")}</div>`;
}

// ---------- marked ----------
let mFilter = "alle", mQuery = "", mSort = { k: null, dir: -1 };
export function renderMarket() {
  const tiles = ["brent", "usdnok", "eurnok", "rente", "laks", "strom"].map(macroTile).join("");
  $("macro").innerHTML = tiles;
  $("macro").hidden = !tiles;
  const rows = Object.entries(D.Q.q);
  if (!rows.length) { $("mkt").innerHTML = `<tr><td colspan="8" class="empty">Ingen kurser ennå. Kjør «Oppdater data» i GitHub Actions én gang, så fylles listen.</td></tr>`; return; }
  let list = rows.filter(([s, q]) =>
    (mFilter === "alle" || (mFilter === "følger" ? isWatched(s) : q.type === mFilter)) &&
    (!mQuery || `${s} ${q.navn} ${q.sektor}`.toLowerCase().includes(mQuery)));
  if (mSort.k) list.sort((a, b) => ((a[1][mSort.k] ?? -1e9) - (b[1][mSort.k] ?? -1e9)) * mSort.dir);
  $("mkt").innerHTML = list.length ? list.map(([s, q]) => {
    const dots = (q.sig || []).slice(0, 5).map(([tone, t]) => `<i class="${tone}" title="${esc(t)}"></i>`).join("");
    const r = q.rsi;
    return `<tr class="click" data-s="${esc(s)}" tabindex="0">
      <td><button class="star" data-w="${esc(s)}" aria-pressed="${isWatched(s)}" aria-label="Følg ${esc(q.navn)}">★</button></td>
      <td class="nm"><div class="who"><span>${label(s) ? `<span class="tk">${esc(label(s))}</span> ` : ""}${esc(q.navn)}</span><small>${esc(q.sektor)}${q.type === "fond" ? " · fond" : ""}${q.stale ? " · gammel kurs" : ""}</small></div></td>
      <td class="r num">${q.last != null ? nf2.format(q.last) : "–"}</td>
      <td class="r num ${cls(q.chg1)}">${pct(q.chg1)}</td>
      <td class="r num ${cls(q.chg21)}">${pct(q.chg21)}</td>
      <td class="r num ${cls(q.chg252)}">${pct(q.chg252, 0)}</td>
      <td>${r != null ? `<span class="rsi"><span class="track"><b style="left:calc(${r.toFixed(0)}% - 1px)"></b></span><span class="num note">${r.toFixed(0)}</span></span>` : "–"}</td>
      <td><span class="dots">${dots}</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="8" class="empty">Ingen treff.</td></tr>`;
  document.querySelectorAll("#mkt tr.click").forEach(tr => {
    const go = e => { if (e.target.closest(".star")) return; location.hash = "aksje/" + encodeURIComponent(tr.dataset.s); };
    tr.addEventListener("click", go);
    tr.addEventListener("keydown", e => { if (e.key === "Enter") go(e); });
  });
  document.querySelectorAll("#mkt .star").forEach(b => b.addEventListener("click", () => { toggleWatch(b.dataset.w); renderMarket(); }));
  if (D.Q.updated) $("mfoot").textContent = `Kurser fra Yahoo Finance, forsinket ca. 15 minutter. Sist hentet ${new Date(D.Q.updated).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Fond har én kurs per dag (NAV). Fargeprikkene er signaler: grønn = positiv, rød = negativ, blå = nøytral. Hold musen over makrotallene for forklaring.`;
  $("fundcmp").hidden = mFilter !== "fond";
  if (mFilter === "fond") renderFundCompare();
}
export function initMarket() {
  document.querySelectorAll(".chip[data-m]").forEach(b => b.addEventListener("click", () => {
    mFilter = b.dataset.m;
    document.querySelectorAll(".chip[data-m]").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderMarket();
  }));
  $("mq").addEventListener("input", e => { mQuery = e.target.value.trim().toLowerCase(); renderMarket(); });
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer"; th.title = "Sorter";
    th.addEventListener("click", () => { mSort = { k: th.dataset.sort, dir: mSort.k === th.dataset.sort ? -mSort.dir : -1 }; renderMarket(); });
  });
}

// ---------- fondssammenligning ----------
async function renderFundCompare() {
  const box = $("fundcmp");
  const funds = Object.entries(D.Q.q).filter(([, q]) => q.type === "fond");
  box.innerHTML = `<div class="ph"><h2><em>⚖</em>Sammenlign fond</h2><span class="src">Avkastning per år etter kostnader</span></div><div class="empty">Regner ut …</div>`;
  const H = Object.fromEntries(await Promise.all(funds.map(async ([s]) => [s, await hist(s)])));
  const ref = { norge: "0P0000HNUP.IR", global: "0P00018V9L.IR" };
  const wk = s => weekly((H[s] || []).map(b => [b.t, b.c]));
  const refW = { norge: H[ref.norge] ? wk(ref.norge) : null, global: H[ref.global] ? wk(ref.global) : null };
  const rows = funds.map(([s, q]) => {
    const b = H[s] || [];
    const f = D.FUND.f?.[s] || {};
    const region = /Norge|Norden/.test(q.sektor) ? "norge" : "global";
    const corr = refW[region] && s !== ref[region] ? correlation(wk(s), refW[region]) : s === ref[region] ? 1 : null;
    const aktiv = /Aktivt/.test(q.sektor);
    return { s, q, f, r1: annualized(b, 1), r3: annualized(b, 3), r5: annualized(b, 5), vol: volatility(b), dd: maxDrawdown(b), corr, aktiv, region };
  }).sort((a, b) => (b.r5 ?? b.r3 ?? -9) - (a.r5 ?? a.r3 ?? -9));
  box.innerHTML = `<div class="ph"><h2><em>⚖</em>Sammenlign fond</h2><span class="src">Avkastning per år, allerede fratrukket fondets kostnader</span></div>
    <div class="tbl"><table><thead><tr><th>Fond</th><th class="r">Kostnad</th><th class="r">1 år</th><th class="r">3 år/år</th><th class="r">5 år/år</th><th class="r">Svingninger</th><th class="r">Største fall</th><th class="r">Likhet med indeks</th></tr></thead><tbody>
    ${rows.map(r => {
      const flag = r.aktiv && r.corr != null && r.corr > 0.95 && (r.f.ter ?? 0) > 0.008;
      return `<tr class="click" data-s="${esc(r.s)}"><td><div class="who"><span>${esc(r.q.navn)}</span><small>${esc(r.q.sektor)}${r.f.forvalter ? " · " + esc(r.f.forvalter) : ""}</small></div></td>
        <td class="r num" ${(r.f.ter ?? 0) > 0.01 ? 'style="color:var(--amber)"' : ""}>${r.f.ter != null ? pctPlain(r.f.ter, 2) : "–"}</td>
        <td class="r num ${cls(r.r1)}">${pct(r.r1)}</td><td class="r num ${cls(r.r3)}">${pct(r.r3)}</td><td class="r num ${cls(r.r5)}">${pct(r.r5)}</td>
        <td class="r num">${r.vol != null ? pctPlain(r.vol, 0) : "–"}</td><td class="r num neg">${r.dd != null ? pct(r.dd, 0) : "–"}</td>
        <td class="r num">${r.corr != null ? (r.corr * 100).toFixed(0) + " %" : "–"}${flag ? `<br><small style="color:var(--amber)">dyr indekskopi?</small>` : ""}</td></tr>`;
    }).join("")}</tbody></table></div>
    <div class="pad"><p class="note" style="margin:0">«Svingninger» er årlig volatilitet: hvor mye kursen typisk svinger. «Likhet med indeks» er korrelasjonen med KLP-indeksfondet for samme region. Et aktivt fond som er over 95 % likt indeksen, men koster over 0,8 % i året, gir deg omtrent indeksen til høy pris. Historisk avkastning er ingen garanti for fremtiden.</p></div>`;
  box.querySelectorAll("tr.click").forEach(tr => tr.onclick = () => { location.hash = "aksje/" + encodeURIComponent(tr.dataset.s); });
}
