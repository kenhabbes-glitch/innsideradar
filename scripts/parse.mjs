// Tolker en børsmelding om meldepliktig handel (norsk eller engelsk) til strukturerte felt.
// Regelbasert. Meldinger der detaljene kun står i vedlegg får type "?".

export function htmlToText(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RE_PROGRAM = /(share (purchase|saving|savings) (program|programme|plan)|employee share|ansattaksje|aksjespareprogram|aksjeprogram|incentive|LTI\b|RSU|restricted share|performance share|share option|opsjon|exercis|innløs|award|granted|tildelt|allocated|consideration shares|vederlagsaksjer|private placement|rettet emisjon|retail offering|subscribed for|tegnet)/i;
const RE_SELL = /(\bsold\b|\bsells?\b|\bsale of\b|\bdisposed\b|\bsolgt\b|\bsolgte\b|\bselger\b|\bsalg av\b)/i;
const RE_BUY = /(purchased|\bbought\b|\bbuys?\b|acquired|has acquired|kjøpt|kjøper|\bkjøpte\b|ervervet)/i;
const RE_TRANSFER = /(transferred|overført|overførte|\bgift\b|\bgave\b|forskudd på arv|lending agreement|share lending|aksjelån|pledge|pantsatt)/i;

const ROLES = [
  ["chief executive officer", "CEO"], ["ceo", "CEO"], ["administrerende direktør", "CEO"], ["konsernsjef", "CEO"], ["adm. banksjef", "Adm. banksjef"],
  ["chief financial officer", "CFO"], ["cfo", "CFO"], ["finansdirektør", "CFO"],
  ["chief operating officer", "COO"], ["chief operations officer", "COO"], ["coo", "COO"], ["chief investment officer", "CIO"], ["cio", "CIO"],
  ["chief legal officer", "Juridisk direktør"], ["evp", "EVP"], ["executive vice president", "EVP"],
  ["chairman of the board", "Styreleder"], ["chair of the board", "Styreleder"], ["chairman", "Styreleder"], ["chairperson", "Styreleder"], ["chair", "Styreleder"], ["styreleder", "Styreleder"], ["styrets leder", "Styreleder"],
  ["deputy chair", "Nestleder styret"], ["nestleder", "Nestleder styret"],
  ["board member", "Styremedlem"], ["member of the board", "Styremedlem"], ["board director", "Styremedlem"], ["director of the company", "Styremedlem"], ["styremedlem", "Styremedlem"],
  ["close associate", "Nærstående"], ["closely associated", "Nærstående"], ["nærstående", "Nærstående"],
  ["primary insider", "Primærinnsider"], ["primærinnsider", "Primærinnsider"], ["pdmr", "Primærinnsider"],
];

// Tall som "1,500,000", "1 500 000", "10.000", "45 000" → heltall
function toInt(s) {
  const n = parseInt(String(s).replace(/[\s .,]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
// Kurs som "4.2428", "128,70", "1,30", "21.423" → desimaltall
function toPrice(s) {
  let t = String(s).trim();
  if (/^\d{1,3}([ ,]\d{3})+([.,]\d+)?$/.test(t) && /[.,]\d{1,4}$/.test(t)) t = t.replace(/[ ](?=\d{3})/g, "");
  if (t.includes(",") && !t.includes(".")) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

const NUM = "(\\d{1,3}(?:[ \\u00a0.,]\\d{3})+|\\d+)";
const UNIT = "(?:new |ordinary |class [AB] |nye |stk\\.? )?(?:shares|aksjer|aksje|egenkapitalbevis|equity certificates|consideration shares)";

export function parseMessage(text) {
  const t = text;
  // finn setningen der transaksjonen står
  const verbIdx = t.search(new RegExp(`${RE_BUY.source}|${RE_SELL.source}|${RE_TRANSFER.source}|${RE_PROGRAM.source}`, "i"));
  const start = verbIdx < 0 ? 0 : Math.max(0, verbIdx - 220);
  const focus = t.slice(start, start + 520);

  let type = "?";
  if (RE_PROGRAM.test(focus)) type = "P";
  else if (RE_TRANSFER.test(focus) && !RE_BUY.test(focus.slice(0, 260))) type = "O";
  else if (RE_SELL.test(focus)) type = "S";
  else if (RE_BUY.test(focus)) type = "K";
  // salg til eget selskap regnes som overføring
  if (type === "S" && /(own|eget|wholly owned|heleide|controlled by|under his control|closely associated with .{0,40}(holding|AS))/i.test(focus) && /(to|til) .{0,60}(holding|AS\b|company)/i.test(focus)) type = "O";

  // antall aksjer
  let shares = null;
  const mShares = new RegExp(`${NUM}\\s*${UNIT}`, "i").exec(focus.slice(Math.max(0, (verbIdx - start) - 20)));
  if (mShares) shares = toInt(mShares[1]);

  // kurs og valuta
  let price = null, cur = null;
  const mPrice =
    /(?:price|kurs|pris|price of|til)\s*(?:of\s*)?(?:NOK|USD|EUR|SEK|DKK|kr\.?)?\s*(\d+(?:[.,]\d+)?)\s*(NOK|USD|EUR|SEK|DKK|kroner)?\s*(?:per|pr\.?|each|\/)/i.exec(focus) ||
    /(NOK|USD|EUR|SEK|DKK)\s*(\d+(?:[.,]\d+)?)\s*(?:per|pr\.?)\s*(?:share|aksje|bevis|certificate)/i.exec(focus) ||
    /at (?:an )?(?:average )?(?:price|kurs)?\s*(?:of\s*)?(?:NOK|USD|EUR)?\s*(\d+(?:[.,]\d+)?)/i.exec(focus);
  if (mPrice) {
    const g = mPrice.slice(1).filter(Boolean);
    const curTok = g.find(x => /^(NOK|USD|EUR|SEK|DKK|kroner)$/i.test(x));
    const numTok = g.find(x => /^\d/.test(x));
    price = numTok ? toPrice(numTok) : null;
    cur = curTok ? curTok.toUpperCase().replace("KRONER", "NOK") : null;
  }
  if (!cur) {
    const near = /(NOK|USD|EUR|SEK|DKK)/.exec(focus);
    cur = near ? near[1] : "NOK";
  }
  if (price != null && (price <= 0 || price > 100000)) price = null;

  // rolle
  let role = "";
  const low = focus.toLowerCase();
  const GENERIC = new Set(["Primærinnsider", "Nærstående"]);
  for (const pass of [false, true]) {
    let best = Infinity;
    for (const [k, v] of ROLES) {
      if (GENERIC.has(v) !== pass) continue;
      const re = new RegExp(`(^|[^a-zæøå])${k.replace(/[.]/g, "\\.")}([^a-zæøå]|$)`, "i");
      const m = re.exec(low);
      if (m && m.index < best) { best = m.index; role = v; }
    }
    if (role) break;
  }

  // navn: første personnavn (2–4 ord med stor forbokstav) i fokusområdet
  let person = "";
  const STOP = /^(The|Company|Reference|Following|Please|After|For|This|Oslo|Bergen|Trondheim|Hamilton|Luxembourg|Copenhagen|Helsinki|Stavanger|Sandnes|Today|I|Det|Etter|Selskapet|Primærinnsider|Primary|Board|Chief|Head|Leder|Styreleder|Styremedlem|Adm|Managers|Notification|Mandatory|Meldepliktig|ASA|AS|Ltd|Limited|Holding|Group|Bank|Sparebank|September|October|November|December|January|February|March|April|May|June|July|August|Mr|Ms|Mrs)$/;
  const nameRe = /(?<![A-Za-zÆØÅæøåéüö])([A-ZÆØÅ][a-zæøåéüö\-]+(?:\s+(?:[A-ZÆØÅ]\.|[A-ZÆØÅ][a-zæøåéüö\-]+|van|von|de)){1,3})(?![A-Za-zæøåéüö])/g;
  const scope = t.slice(Math.max(0, verbIdx - 300), verbIdx + 80);
  let m;
  while ((m = nameRe.exec(scope))) {
    const words = m[1].split(/\s+/);
    if (words.some(w => STOP.test(w.replace(/[.,]/g, "")))) continue;
    if (/(ASA|Invest|Capital|Holding|Partners|Fund|Management|Group|Shipping|Energy|Drilling|Sparebank|Bank)\b/.test(m[1])) continue;
    person = m[1];
    break;
  }
  // via selskap
  const via = /(?:through|via|gjennom)\s+(?:his|her|their|sitt|sin|hans|hennes)?\s*(?:wholly[- ]owned |fully owned |heleide |related party |closely associated )?(?:company |selskap )?([A-ZÆØÅ][\wÆØÅæøå&\- ]{1,40}?(?:AS|ASA|Ltd\.?|Limited|LLC|Holding|Invest|Capital))\b/.exec(focus) ||
              /([A-ZÆØÅ][\wÆØÅæøå&\- ]{1,40}?(?:AS|Ltd\.?|Limited|Holdings?|Invest|Capital)),? (?:a|an|et)?\s*(?:company|close associate|closely associated|related party|nærstående|selskap)/.exec(focus);
  if (via && person && !via[1].includes(person)) person = `${person} (via ${via[1].trim()})`;
  else if (via && !person) person = via[1].trim();

  const snippet = t.slice(Math.max(0, verbIdx - 60), verbIdx + 220).trim();
  return { type, shares, price, cur, role, person, snippet };
}
