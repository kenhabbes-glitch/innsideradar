// Henter listen over alle aksjer på Oslo Børs, Euronext Expand og Euronext Growth fra Euronext.
// Kjøres én gang i uken. Skriver public/data/universe-auto.json = { list: [[symbol, navn, marked, omsetning], ...] }
import { readJson, writeJson, fresh } from "./lib.mjs";

if (await fresh("universe-auto.json", 6 * 24) && !process.env.FORCE) { console.log("Aksjeliste: fersk, hopper over"); process.exit(0); }

const unq = s => s.trim().replace(/^"|"$/g, "");
const KEEP_UPPER = /^(ASA|AS|AB|A\/S|SE|NV|N\.V\.|PLC|LTD|BV|ADR|II|III|SPV|DVD|HAV|IDEX|NEL|DNB|DNO|TGS|PGS|BW|LPG|MPC|AKVA|KID|ABG|SATS|XXL|REC|NRC|EAM|BEWI|AF|GC|IWS|NTI|BP|ASA)$/;
const nice = s => s.split(/\s+/).map(w => (KEEP_UPPER.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(" ");

try {
  const r = await fetch("https://live.euronext.com/en/pd_es/data/stocks/download?mics=XOSL%2CMERK%2CXOAS", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": "Mozilla/5.0 (Innsideradar)" },
    body: "args%5BinitialLetter%5D=&args%5Bfe_type%5D=csv&args%5Bfe_decimal_separator%5D=.&args%5Bfe_date_format%5D=d%2Fm%2FY",
  });
  if (!r.ok) throw new Error(r.status);
  const rows = (await r.text()).split("\n").map(l => l.split(";")).filter(c => c.length > 12 && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(c[1]));
  const list = rows.map(c => [unq(c[2]) + ".OL", nice(unq(c[0])), unq(c[3]), Math.round(+c[12] || 0)]).filter(x => /^[A-Z0-9-]+\.OL$/.test(x[0]));
  if (list.length < 100) throw new Error(`bare ${list.length} rader`);
  await writeJson("universe-auto.json", { updated: new Date().toISOString(), list });
  console.log(`Aksjeliste: ${list.length} aksjer`);
} catch (e) {
  const old = await readJson("universe-auto.json", null);
  console.warn(`Aksjeliste feilet (${e.message}). ${old ? "Beholder forrige liste." : "Bruker kun kjernelisten."}`);
}
