// Henter nøkkeltall (P/E, utbytte, vekst, gjeld, analytikere, resultatdatoer) og fondskostnader fra Yahoo Finance.
// Kjøres én gang per døgn (hopper over hvis data er ferskere enn 20 timer). Skriver public/data/fund.json.
import { universe, readJson, writeJson, fresh, sleep } from "./lib.mjs";

if (await fresh("fund.json", 20) && !process.env.FORCE) { console.log("Nøkkeltall: ferske, hopper over"); process.exit(0); }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// Yahoo krever en cookie + «crumb» for quoteSummary.
async function session() {
  const r = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual" }).catch(() => null);
  const cookies = (r?.headers?.getSetCookie?.() || []).map(c => c.split(";")[0]).join("; ");
  const c = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookies } });
  const crumb = (await c.text()).trim();
  if (!c.ok || !crumb || crumb.length > 40) throw new Error("Fikk ikke crumb fra Yahoo");
  return { cookies, crumb };
}

const raw = x => (x && typeof x === "object" ? x.raw ?? null : x ?? null);
const date = x => (raw(x) ? new Date(raw(x) * 1000).toISOString().slice(0, 10) : null);

const U = await universe();
const old = await readJson("fund.json", { f: {} });
let s;
try { s = await session(); } catch (e) { console.warn(e.message); process.exit(0); }

const out = {};
let ok = 0;
for (const [sym, , type] of U.instruments) {
  const mods = type === "fond" ? "fundProfile,defaultKeyStatistics,summaryDetail" : "summaryDetail,defaultKeyStatistics,financialData,calendarEvents,incomeStatementHistory,price";
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${mods}&crumb=${encodeURIComponent(s.crumb)}`, { headers: { "User-Agent": UA, Cookie: s.cookies } });
    if (!r.ok) throw new Error(r.status);
    const x = (await r.json()).quoteSummary?.result?.[0];
    if (!x) throw new Error("tomt");
    if (type === "fond") {
      out[sym] = {
        ter: raw(x.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio),
        kategori: x.fundProfile?.categoryName || null,
        forvalter: x.fundProfile?.family || null,
        storrelse: raw(x.defaultKeyStatistics?.totalAssets) ?? raw(x.summaryDetail?.totalAssets),
      };
    } else {
      const sd = x.summaryDetail || {}, fd = x.financialData || {}, ks = x.defaultKeyStatistics || {}, ce = x.calendarEvents || {};
      out[sym] = {
        pe: raw(sd.trailingPE), fpe: raw(sd.forwardPE), dy: raw(sd.dividendYield) ?? raw(sd.trailingAnnualDividendYield),
        mcap: raw(sd.marketCap), beta: raw(sd.beta), pb: raw(ks.priceToBook), eps: raw(ks.trailingEps), evEbitda: raw(ks.enterpriseToEbitda),
        rev: raw(fd.totalRevenue), revG: raw(fd.revenueGrowth), earnG: raw(fd.earningsGrowth), margin: raw(fd.profitMargins),
        de: raw(fd.debtToEquity), roe: raw(fd.returnOnEquity), target: raw(fd.targetMeanPrice), rec: fd.recommendationKey || null,
        nAnalyst: raw(fd.numberOfAnalystOpinions), fcur: fd.financialCurrency || null,
        earnings: (ce.earnings?.earningsDate || []).map(date).filter(Boolean),
        exDiv: date(ce.exDividendDate) || date(sd.exDividendDate), divDate: date(ce.dividendDate),
        inc: (x.incomeStatementHistory?.incomeStatementHistory || []).map(y => [date(y.endDate)?.slice(0, 4), raw(y.totalRevenue), raw(y.netIncome)]).reverse(),
      };
    }
    ok++;
  } catch (e) {
    if (old.f?.[sym]) out[sym] = old.f[sym];
    console.warn(`${sym}: ${e.message}`);
  }
  await sleep(350);
}
await writeJson("fund.json", { updated: new Date().toISOString(), f: out });
console.log(`Nøkkeltall: ${ok} av ${U.instruments.length}`);
