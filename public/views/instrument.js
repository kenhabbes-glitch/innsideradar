import { $, D, S, esc, nf0, nf2, nf4, kr, pct, pctPlain, big, cls, label, tick, dmy, today, uid, toneIcon, spark, hist, news, book, fee, totalValue, isWatched, toggleWatch, commit, toast } from "../core.js";
import { signals } from "../lib/indicators.js";
import { createChart } from "../lib/chart.js";
import { weekly, correlation } from "../lib/stats.js";
import { MACRO, MACRO_FOR, macroSeries } from "./market.js";

export let chartRef = null;
export function destroyChart() { if (chartRef) { chartRef.destroy(); chartRef = null; } }

const REASONS = ["Stigende trend", "Oversolgt (RSI)", "Brudd over motstand", "Innsidekjøp", "Gode resultater", "Billig mot bransjen", "Utbytte", "Langsiktig tro", "Spredning", "Ta gevinst", "Stop-loss", "Trenden har snudd", "Teste en teori"];

// Median P/E m.m. per sektor
function sectorStats(sektor) {
  const vals = k => Object.entries(D.FUND.f || {}).filter(([s]) => D.Q.q[s]?.sektor === sektor).map(([, f]) => f[k]).filter(v => v != null && isFinite(v) && v > 0 && v < 200).sort((a, b) => a - b);
  const med = a => (a.length ? a[Math.floor(a.length / 2)] : null);
  return { pe: med(vals("pe")), pb: med(vals("pb")), dy: med(vals("dy")), n: vals("pe").length };
}

export async function renderInstrument(sym) {
  destroyChart();
  const box = $("v-instr");
  const q = D.Q.q[sym];
  if (!q) { box.innerHTML = `<a class="back" href="#marked">← Marked</a><div class="panel"><div class="empty">Fant ikke ${esc(sym || "")} i kurslisten.</div></div>`; return; }
  const tk = tick(sym);
  const isFund = q.type === "fond";
  const held = book().pos[sym];
  const f = D.FUND.f?.[sym] || {};
  const order = S.P.orders?.[sym];
  const activeOrder = order && !order.del && held?.qty ? order : null;
  box.innerHTML = `
    <a class="back" href="#marked">← Marked</a>
    <div class="ihead">
      <div><h2>${label(sym) ? `<span class="tk">${esc(label(sym))}</span>` : ""}${esc(q.navn)}</h2>
        <div class="meta">${esc(q.sektor)} · ${isFund ? "Fond" : "Aksje"} · ${esc(q.cur)}${q.time ? " · kurs fra " + new Date(q.time).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</div></div>
      <div style="display:flex;gap:18px;align-items:flex-end">
        <div><div class="px">${nf2.format(q.last)}</div><div class="num ${cls(q.chg1)}">${pct(q.chg1, 2)} i dag</div></div>
        <button class="chip" id="watch" aria-pressed="${isWatched(sym)}">★ Følg</button>
      </div>
    </div>
    <div class="cols">
      <div class="stack">
        <section class="panel">
          <div class="ph">
            <div class="ctl" role="group" aria-label="Periode">${[["1M", 21], ["3M", 63], ["6M", 126], ["1Å", 252], ["2Å", 520], ...(isFund ? [["5Å", 1300]] : [])].map(([l, d]) => `<button class="chip" data-r="${d}" aria-pressed="${d === 126}">${l}</button>`).join("")}</div>
            <div class="ctl" role="group" aria-label="Visning" id="modes"><button class="chip" data-mode="candle" aria-pressed="true">Lys</button><button class="chip" data-mode="line" aria-pressed="false">Linje</button></div>
          </div>
          <div class="pad">
            <div class="chartbox" id="chart"></div>
            <div class="legend">
              <label><input type="checkbox" data-t="s20" checked> <i style="background:var(--neutral)"></i>Snitt 20</label>
              <label><input type="checkbox" data-t="s50" checked> <i style="background:var(--amber)"></i>Snitt 50</label>
              <label><input type="checkbox" data-t="s200" checked> <i style="background:#b07cff"></i>Snitt 200</label>
              <label><input type="checkbox" data-t="vol" checked> Volum</label>
              <label><input type="checkbox" data-t="rsi" checked> RSI</label>
              <label><input type="checkbox" data-t="pat" checked> Mønstre ▲▼◆</label>
            </div>
          </div>
        </section>
        <section class="panel"><div class="ph"><h2><em>◆</em>Signaler akkurat nå</h2><a class="src" href="#skole">Lær mer i Skole →</a></div><div class="sigs" id="sigs"><div class="empty">Beregner …</div></div></section>
        ${isFund ? "" : `<section class="panel" id="fundamentals"></section>`}
        <section class="panel" id="macrop"></section>
        ${isFund ? "" : `<section class="panel" id="moves"><div class="ph"><h2><em>?</em>Hva skjedde her?</h2></div><div class="empty">Laster …</div></section>`}
      </div>
      <div class="stack">
        <section class="panel" aria-labelledby="th"><div class="ph"><h2 id="th"><em>⇄</em>Fiktiv handel</h2><span class="src" id="cashinfo"></span></div><div class="pad" id="trade"></div></section>
        ${held && held.qty ? `<section class="panel"><div class="ph"><h2><em>■</em>Din posisjon</h2></div><div class="pad">
          <div class="calc">
            <span>Antall</span><span>${nf4.format(held.qty)}</span>
            <span>Snittkost</span><span>${nf2.format(held.cost / held.qty)}</span>
            <span>Verdi nå</span><span>${kr(held.qty * q.last)}</span>
            <span>Avkastning</span><span class="${cls(held.qty * q.last - held.cost)}">${kr(held.qty * q.last - held.cost)} (${pct(held.qty * q.last / held.cost - 1)})</span>
          </div>
          <div class="field"><span class="lbl">Automatisk salg</span>
            <div class="two"><div class="field"><label for="ps">Stop-loss</label><input id="ps" type="number" step="0.01" value="${activeOrder?.stop ?? ""}" placeholder="kurs"></div>
            <div class="field"><label for="pt">Kursmål</label><input id="pt" type="number" step="0.01" value="${activeOrder?.target ?? ""}" placeholder="kurs"></div></div>
            <button class="go ghost" id="saveorder" type="button">Lagre</button>
            <span class="note">Selger hele posisjonen hvis dagens laveste kurs går under stop-loss, eller høyeste over kursmålet.</span></div>
        </div></section>` : ""}
      </div>
    </div>`;

  $("watch").onclick = () => { toggleWatch(sym); $("watch").setAttribute("aria-pressed", isWatched(sym)); };
  if ($("saveorder")) $("saveorder").onclick = () => {
    const stop = +$("ps").value || null, target = +$("pt").value || null;
    S.P.orders[sym] = stop || target ? { stop, target, t: new Date().toISOString(), d: today(), navn: q.navn, type: q.type } : { del: true, t: new Date().toISOString() };
    commit(); toast(stop || target ? "Automatisk salg lagret" : "Automatisk salg fjernet");
  };

  const bars = await hist(sym);
  chartRef = createChart($("chart"));
  chartRef.setData(bars);
  chartRef.setMarks(S.P.trades.filter(t => t.sym === sym).map(t => ({ t: t.d, price: t.price, side: t.side })));
  if (chartRef.flat) $("modes").innerHTML = `<span class="src">Fond: én kurs per dag</span>`;
  box.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { chartRef.setRange(+b.dataset.r); box.querySelectorAll("[data-r]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  box.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { chartRef.setMode(b.dataset.mode); box.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  box.querySelectorAll("[data-t]").forEach(c => c.onchange = () => chartRef.toggle(c.dataset.t, c.checked));

  // signaler + radar
  const sg = signals(bars);
  const sh = D.RADAR.short[tk];
  const ins = D.RADAR.ins.filter(r => r.tk === tk);
  if (sh) sg.push({ tone: sh.p >= 3 ? "ned" : "nøytral", tittel: `Short ${nf2.format(sh.p)} % av aksjene`, tekst: `${sh.h.length} fond har offentlige shortposisjoner (${sh.h.slice(0, 3).map(h => h[0]).join(", ")}). Høy short betyr at profesjonelle tror på fall, men kan gi kraftig oppgang hvis de må kjøpe tilbake.` });
  const ib = ins.filter(r => r.type === "K"), is = ins.filter(r => r.type === "S");
  if (ib.length) sg.push({ tone: "opp", tittel: `${ib.length} innsidekjøp siste 30 dager`, tekst: `${[...new Set(ib.map(r => (r.person || "").replace(/ \(.*\)/, "")))].filter(Boolean).join(", ")} har kjøpt aksjer. Ledere og styremedlemmer kjenner selskapet best.` });
  if (is.length) sg.push({ tone: "ned", tittel: `${is.length} innsidesalg siste 30 dager`, tekst: "Innsidesalg kan ha mange grunner (skatt, bolig, spredning), men er verdt å merke seg." });
  $("sigs").innerHTML = sg.length ? sg.map(s => `<div class="sigrow"><span class="ic ${s.tone}">${toneIcon(s.tone)}</span><b>${esc(s.tittel)}</b><p>${esc(s.tekst)}</p></div>`).join("")
    : `<div class="empty">Ingen tydelige signaler nå. Det er også informasjon: kursen beveger seg uten klare mønstre.</div>`;

  if (!isFund) renderFundamentals(sym, q, f);
  renderMacro(sym, q, bars);
  if (!isFund) renderMoves(sym, bars);
  renderTrade(sym, q, sg, f, bars);
}

// ---------- nøkkeltall ----------
function renderFundamentals(sym, q, f) {
  const box = $("fundamentals");
  if (!f || !Object.keys(f).length) { box.innerHTML = `<div class="ph"><h2><em>₿</em>Nøkkeltall</h2></div><div class="empty">Ingen nøkkeltall ennå. De hentes én gang i døgnet.</div>`; return; }
  const ss = sectorStats(q.sektor);
  const cmp = (v, m, lowGood) => (v == null || m == null ? "" : `<small class="${(lowGood ? v < m : v > m) ? "pos" : "neg"}">bransje ${nf2.format(m)}</small>`);
  const up = f.target ? f.target / q.last - 1 : null;
  const recNo = { strong_buy: "Sterkt kjøp", buy: "Kjøp", hold: "Hold", underperform: "Svakere enn markedet", sell: "Selg", none: "–" }[f.rec] || f.rec || "–";
  const next = (f.earnings || []).find(d => d >= today());
  const rows = [
    ["P/E", f.pe != null ? nf2.format(f.pe) : "–", cmp(f.pe, ss.pe, true), "Hvor mange kroner du betaler per krone selskapet tjener i året. Lavere enn bransjen kan bety billig, eller at markedet venter dårligere tider."],
    ["P/E neste år", f.fpe != null ? nf2.format(f.fpe) : "–", f.pe && f.fpe ? `<small class="${f.fpe < f.pe ? "pos" : "neg"}">${f.fpe < f.pe ? "ventet vekst" : "ventet nedgang"}</small>` : "", "Basert på analytikernes forventede resultat. Lavere enn dagens P/E betyr at resultatet ventes å øke."],
    ["Pris/bok", f.pb != null ? nf2.format(f.pb) : "–", cmp(f.pb, ss.pb, true), "Kurs delt på bokført egenkapital per aksje. Viktig for banker og eiendom."],
    ["Utbytte", f.dy != null ? pctPlain(f.dy) : "–", f.dy != null && ss.dy != null ? `<small>bransje ${pctPlain(ss.dy)}</small>` : "", "Utbytte siste år delt på kursen."],
    ["Inntektsvekst", pct(f.revG), "", "Endring i inntekter siste kvartal mot samme kvartal i fjor."],
    ["Resultatvekst", pct(f.earnG), "", "Endring i resultat. Svinger mye for sykliske selskaper."],
    ["Resultatmargin", f.margin != null ? pctPlain(f.margin) : "–", f.margin != null ? `<small class="${f.margin > 0 ? "pos" : "neg"}">${f.margin > 0 ? "tjener penger" : "taper penger"}</small>` : "", "Hvor mye av inntektene som blir overskudd."],
    ["Egenkapitalavkastning", f.roe != null ? pctPlain(f.roe) : "–", "", "Overskudd delt på egenkapital. Over 10–15 % regnes som godt."],
    ["Gjeld/egenkapital", f.de != null ? nf0.format(f.de) + " %" : "–", f.de != null ? `<small class="${f.de < 100 ? "pos" : "neg"}">${f.de < 100 ? "moderat" : "høy"}</small>` : "", "Høy gjeld gjør selskapet sårbart når rentene stiger eller markedet snur."],
    ["Markedsverdi", f.mcap ? big(f.mcap) + " " + esc(q.cur) : "–", "", ""],
    ["Analytikere", f.nAnalyst ? `${recNo} (${f.nAnalyst})` : "–", up != null ? `<small class="${cls(up)}">kursmål ${nf2.format(f.target)} (${pct(up, 0)})</small>` : "", "Snittet av analytikernes anbefalinger og kursmål. Ofte for optimistiske, men endringer i kursmål flytter kursen."],
    ["Neste kvartalsrapport", next ? dmy(next) : "–", next ? `<small>om ${Math.round((new Date(next) - new Date(today())) / 864e5)} dager</small>` : "", "Kursen kan bevege seg mye rundt rapporten."],
    ["Siste dag med utbytte", f.exDiv ? dmy(f.exDiv) : "–", "", "Du må eie aksjen før denne dagen for å få neste utbytte."],
  ];
  const inc = (f.inc || []).filter(r => r[0]);
  const maxR = Math.max(...inc.map(r => Math.abs(r[1] || 0)), 1);
  box.innerHTML = `<div class="ph"><h2><em>₿</em>Nøkkeltall</h2><span class="src">${ss.n ? `sammenlignet med ${ss.n} selskaper i ${esc(q.sektor.toLowerCase())}` : ""}</span></div>
    <div class="ftable">${rows.map(r => `<div class="frow" title="${esc(r[3])}"><span>${r[0]}</span><b class="num">${r[1]}</b>${r[2] || "<small></small>"}</div>`).join("")}</div>
    ${inc.length ? `<div class="pad"><span class="lbl">Inntekter og resultat per år${f.fcur ? " (" + esc(f.fcur) + ")" : ""}</span>
      <div class="incbars">${inc.map(r => `<div><span class="yr">${r[0]}</span><span class="bar2"><i style="width:${(Math.abs(r[1] || 0) / maxR * 100).toFixed(0)}%"></i></span><span class="num note">${big(r[1])}</span>
        <span></span><span class="bar2 net"><i class="${(r[2] || 0) < 0 ? "neg" : ""}" style="width:${(Math.abs(r[2] || 0) / maxR * 100).toFixed(1)}%"></i></span><span class="num note ${cls(r[2])}">${big(r[2])}</span></div>`).join("")}</div>
      <span class="note">Øverst inntekter, under resultat. Hold musen over et nøkkeltall for forklaring.</span></div>` : ""}`;
}

// ---------- makro ----------
function renderMacro(sym, q, bars) {
  const box = $("macrop");
  const keys = MACRO_FOR[q.sektor] || (q.type === "fond" ? (/Norge|Norden/.test(q.sektor) ? ["brent", "rente"] : ["usdnok"]) : []);
  const avail = keys.filter(k => macroSeries(k).length);
  if (!avail.length) { box.hidden = true; return; }
  const sw = weekly(bars.slice(-520).map(b => [b.t, b.c]));
  box.innerHTML = `<div class="ph"><h2><em>⊕</em>Makro som påvirker ${esc(q.sektor.toLowerCase())}</h2></div>
    ${avail.map(k => {
      const s = macroSeries(k), c = correlation(sw, weekly(s.slice(-520)));
      const last = s[s.length - 1][1];
      const desc = c == null ? "for lite data" : Math.abs(c) < 0.15 ? "nesten ingen sammenheng" : `${Math.abs(c) < 0.35 ? "svak" : Math.abs(c) < 0.6 ? "tydelig" : "sterk"} ${c > 0 ? "positiv" : "negativ"} sammenheng`;
      return `<div class="sigrow"><span class="ic nøytral">⊕</span><b>${MACRO[k].navn}: ${nf2.format(last)} ${MACRO[k].enhet} <span class="note">· ${desc}${c != null ? ` (${c.toFixed(2).replace(".", ",")})` : ""}</span></b>
        <p>${esc(MACRO[k].tekst)} ${c != null && Math.abs(c) >= 0.15 ? `Siste to år har ukene der ${MACRO[k].navn.toLowerCase()} ${c > 0 ? "steg" : "falt"}, oftere vært gode uker for ${esc(q.navn)}.` : ""}</p>
        <p>${spark(s.slice(-260).map(x => x[1]), 220, 30, "var(--neutral)")}</p></div>`;
    }).join("")}
    <div class="pad"><span class="note">Tallet i parentes er korrelasjonen mellom ukentlige endringer (−1 til 1). Sammenheng betyr ikke at det ene styrer det andre.</span></div>`;
}

// ---------- hva skjedde her ----------
async function renderMoves(sym, bars) {
  const box = $("moves");
  const N = await news(sym);
  const cut = new Date(new Date() - 365 * 864e5).toISOString().slice(0, 10);
  const moves = [];
  for (let i = 21; i < bars.length; i++) {
    if (bars[i].t < cut) continue;
    const ch = bars[i].c / bars[i - 1].c - 1;
    const avgV = bars.slice(i - 20, i).reduce((s, b) => s + (b.v || 0), 0) / 20;
    const vx = avgV ? (bars[i].v || 0) / avgV : 0;
    if (Math.abs(ch) >= 0.04 || vx >= 3) moves.push({ t: bars[i].t, ch, vx });
  }
  moves.sort((a, b) => Math.abs(b.ch) - Math.abs(a.ch));
  const top = moves.slice(0, 8).sort((a, b) => (a.t < b.t ? 1 : -1));
  const prevDay = d => new Date(new Date(d) - 864e5 * (new Date(d).getUTCDay() === 1 ? 3 : 1)).toISOString().slice(0, 10);
  box.innerHTML = `<div class="ph"><h2><em>?</em>Hva skjedde her?</h2><span class="src">Største bevegelser siste år og børsmeldinger samme dag</span></div>
    ${top.length ? top.map(m => {
      const pd = prevDay(m.t);
      const hits = N.filter(n => n[0].slice(0, 10) === m.t || (n[0].slice(0, 10) === pd && n[0].slice(11, 16) >= "14:00")).slice(0, 4);
      return `<div class="sigrow"><span class="ic ${m.ch >= 0 ? "opp" : "ned"}">${m.ch >= 0 ? "▲" : "▼"}</span>
        <b>${dmy(m.t)}: <span class="${cls(m.ch)}">${pct(m.ch)}</span>${m.vx >= 2 ? ` <span class="note">· volum ${nf2.format(m.vx)}× normalt</span>` : ""}</b>
        <p>${hits.length ? hits.map(n => `<a href="https://newsweb.oslobors.no/message/${n[3]}" target="_blank" rel="noopener">${esc(n[1])}</a> <span class="note">${esc(n[2].toLowerCase())}</span>`).join("<br>") : "Ingen børsmelding fra selskapet. Bevegelsen skyldes trolig markedet, sektoren, makro eller en analytiker."}</p></div>`;
    }).join("") : `<div class="empty">Ingen store enkeltdager siste år.</div>`}
    <div class="pad"><span class="note">Øvelse: Se på grafen før du leser meldingen. Kunne du gjettet årsaken? Store fall på resultatdager viser hvor mye forventningene betyr.</span></div>`;
}

// ---------- handel ----------
function renderTrade(sym, q, sg, f, bars) {
  const el = $("trade");
  const isFund = q.type === "fond";
  const b = book();
  const held = b.pos[sym]?.qty || 0;
  $("cashinfo").textContent = `Kontanter ${kr(b.cash)}`;
  let side = "K";
  const tags = new Set(), checks = {};
  const ss = sectorStats(q.sektor);
  const trendTone = sg.find(s => ["trendOpp", "trendNed", "over20", "under20"].includes(s.key))?.tone;
  const next = (f.earnings || []).find(d => d >= today());
  const CHECK = isFund ? [] : [
    ["profit", "Tjener selskapet penger?", f.margin != null ? (f.margin > 0 ? `Ja, margin ${pctPlain(f.margin)}` : `Nei, margin ${pctPlain(f.margin)}`) : "Ukjent"],
    ["price", "Er prisen rimelig mot bransjen?", f.pe != null && ss.pe != null ? `P/E ${nf2.format(f.pe)} mot ${nf2.format(ss.pe)} i bransjen` : "Mangler P/E"],
    ["trend", "Peker trenden opp?", trendTone === "opp" ? "Ja, se signaler" : trendTone === "ned" ? "Nei, fallende trend" : "Uklart"],
    ["report", "Vet du når neste rapport kommer?", next ? dmy(next) : "Ukjent dato"],
    ["why", "Vet du hvorfor ikke alle allerede eier aksjen?", "Hva overser markedet?"],
  ];
  const draw = msg => {
    const a = $("amt")?.value, why = $("why")?.value, st = $("stop")?.value, tg = $("target")?.value;
    el.innerHTML = `
      <div class="side" role="group" aria-label="Kjøp eller salg"><button data-s="K" aria-pressed="${side === "K"}">Kjøp</button><button data-s="S" aria-pressed="${side === "S"}" ${held ? "" : "disabled title='Du eier ingen'"}>Selg</button></div>
      <div class="field"><label for="amt">${isFund ? "Beløp (kr)" : "Antall aksjer"}</label>
        <input id="amt" type="number" inputmode="decimal" min="0" step="${isFund ? "100" : "1"}" placeholder="${isFund ? "f.eks. 10000" : "f.eks. 50"}">
        <div class="reasons">${(isFund ? [1000, 5000, 10000, 25000] : [10, 50, 100]).map(v => `<button class="chip" data-q="${v}" type="button">${isFund ? nf0.format(v) + " kr" : v}</button>`).join("")}
          <button class="chip" data-q="max" type="button">${side === "K" ? "Maks" : "Alle"}</button></div></div>
      ${side === "K" ? `<details class="risk"><summary class="lbl">Risiko: stop-loss, kursmål og posisjonsstørrelse</summary>
        <div class="two"><div class="field"><label for="stop">Stop-loss (kurs)</label><input id="stop" type="number" step="0.01" placeholder="${nf2.format(q.last * 0.9)}"></div>
          <div class="field"><label for="target">Kursmål (kurs)</label><input id="target" type="number" step="0.01" placeholder="${nf2.format(q.last * 1.2)}"></div></div>
        <div class="two"><div class="field"><label for="riskp">Maks tap (% av porteføljen)</label><input id="riskp" type="number" step="0.5" value="1"></div>
          <button class="go ghost" id="suggest" type="button">Foreslå antall</button></div>
        <span class="note" id="riskinfo">Regel: risiker 1–2 % av porteføljen per handel. Antall = maks tap ÷ (kurs − stop-loss).</span>
      </details>` : ""}
      ${side === "K" && CHECK.length ? `<div class="field"><span class="lbl">Sjekkliste før kjøp</span><div class="checks">${CHECK.map(([k, qq, hint]) => `<div class="chk"><span>${qq}<small>${esc(hint)}</small></span><span class="yn">${["Ja", "Nei", "?"].map(v => `<button type="button" class="chip" data-ck="${k}" data-v="${v}" aria-pressed="${checks[k] === v}">${v}</button>`).join("")}</span></div>`).join("")}</div></div>` : ""}
      <div class="field"><span class="lbl">Hvorfor? (velg minst én eller skriv)</span>
        <div class="reasons">${REASONS.map(r => `<button class="chip" type="button" data-tag="${esc(r)}" aria-pressed="${tags.has(r)}">${esc(r)}</button>`).join("")}</div>
        <textarea id="why" placeholder="Hva tror du skjer, og når vil du selge?"></textarea></div>
      <div class="calc" id="calc"></div>
      ${msg ? `<div class="msg ${msg[0]}">${esc(msg[1])}</div>` : ""}
      <button class="go" id="next" type="button">Se over ordren</button>
      <div id="conf"></div>`;
    if (a) $("amt").value = a; if (why) $("why").value = why; if (st && $("stop")) $("stop").value = st; if (tg && $("target")) $("target").value = tg;
    el.querySelectorAll("[data-s]").forEach(x => x.onclick = () => { side = x.dataset.s; draw(); });
    el.querySelectorAll("[data-tag]").forEach(x => x.onclick = () => { tags.has(x.dataset.tag) ? tags.delete(x.dataset.tag) : tags.add(x.dataset.tag); x.setAttribute("aria-pressed", tags.has(x.dataset.tag)); });
    el.querySelectorAll("[data-ck]").forEach(x => x.onclick = () => { checks[x.dataset.ck] = x.dataset.v; el.querySelectorAll(`[data-ck="${x.dataset.ck}"]`).forEach(y => y.setAttribute("aria-pressed", y === x)); });
    el.querySelectorAll("[data-q]").forEach(x => x.onclick = () => {
      const p = q.last, cash = book().cash;
      let v = x.dataset.q;
      if (v === "max") {
        if (side === "S") v = isFund ? held * p : held;
        else if (isFund) v = Math.floor(cash);
        else { let n = Math.floor(cash / p); while (n > 0 && n * p + fee(n * p, q.type) > cash) n--; v = n; }
      }
      $("amt").value = isFund ? Math.floor(+v) : +v; calc();
    });
    if ($("suggest")) $("suggest").onclick = () => {
      const stop = +$("stop").value, rp = +$("riskp").value / 100;
      if (!stop || stop >= q.last) { $("riskinfo").textContent = "Sett en stop-loss under dagens kurs først."; return; }
      const n = (rp * totalValue()) / (q.last - stop);
      $("amt").value = isFund ? Math.floor(n * q.last) : Math.max(0, Math.floor(n));
      calc();
    };
    ["amt", "stop", "target", "riskp"].forEach(id => { if ($(id)) $(id).oninput = calc; });
    $("next").onclick = review;
    calc();
  };
  const order = () => {
    const a = +$("amt").value || 0, p = q.last;
    const qty = isFund ? +(a / p).toFixed(4) : Math.floor(a);
    const val = qty * p;
    return { qty, val, fee: qty ? fee(val, q.type) : 0, p, stop: +($("stop")?.value) || null, target: +($("target")?.value) || null };
  };
  function calc() {
    const o = order(), tv = totalValue();
    const tot = side === "K" ? o.val + o.fee : o.val - o.fee;
    const loss = o.stop && o.stop < o.p ? o.qty * (o.p - o.stop) + o.fee : null;
    const gain = o.target && o.target > o.p ? o.qty * (o.target - o.p) - 2 * o.fee : null;
    $("calc").innerHTML = `<span>Kurs</span><span>${nf2.format(o.p)}</span>
      ${isFund ? `<span>Andeler</span><span>${nf4.format(o.qty)}</span>` : ""}
      <span>Verdi</span><span>${kr(o.val)}</span><span>Kurtasje</span><span>${isFund ? "0 kr (fond)" : kr(o.fee)}</span>
      <span class="tot">${side === "K" ? "Du betaler" : "Du får"}</span><span class="tot">${kr(tot)}</span>
      ${o.val && side === "K" ? `<span>Andel av porteføljen</span><span ${o.val / tv > 0.1 ? 'style="color:var(--amber)"' : ""}>${pctPlain(o.val / tv, 0)}</span>` : ""}
      ${loss != null && o.qty ? `<span>Tap hvis stop-loss</span><span class="neg">${kr(-loss)} (${pctPlain(loss / tv)} av porteføljen)</span>` : ""}
      ${gain != null && o.qty ? `<span>Gevinst ved kursmål</span><span class="pos">${kr(gain)}</span>` : ""}
      ${loss && gain ? `<span>Forhold gevinst/risiko</span><span ${gain / loss < 2 ? 'style="color:var(--amber)"' : ""}>${nf2.format(gain / loss)} : 1</span>` : ""}`;
  }
  function review() {
    const o = order(), b2 = book(), why = $("why").value.trim();
    const err = !o.qty ? "Skriv inn antall eller beløp."
      : side === "K" && o.val + o.fee > b2.cash + 0.01 ? `Ikke nok kontanter. Du har ${kr(b2.cash)}.`
      : side === "S" && o.qty > (b2.pos[sym]?.qty || 0) + 1e-6 ? "Du kan ikke selge mer enn du eier."
      : !tags.size && why.length < 4 ? "Skriv kort hvorfor, eller velg en grunn. Det er slik du lærer."
      : o.stop && o.stop >= o.p ? "Stop-loss må være under dagens kurs."
      : o.target && o.target <= o.p ? "Kursmålet må være over dagens kurs." : null;
    if (err) return draw(["err", err]);
    const share = o.val / totalValue();
    const nos = Object.values(checks).filter(v => v === "Nei").length;
    $("conf").innerHTML = `<div class="confirm">
      <b>${side === "K" ? "Kjøp" : "Selg"} ${nf4.format(o.qty)} ${isFund ? "andeler" : "aksjer"} i ${esc(q.navn)} til ${nf2.format(o.p)}?</b>
      ${side === "K" && share > 0.1 ? `<span class="note">Dette blir over 10 % av porteføljen. Er du sikker på at du vil ha så mye i én posisjon?</span>` : ""}
      ${side === "K" && nos >= 2 ? `<span class="note">Du svarte «Nei» på ${nos} punkter i sjekklisten. Skriv gjerne i begrunnelsen hvorfor du kjøper likevel.</span>` : ""}
      ${side === "K" && !o.stop && q.type !== "fond" ? `<span class="note">Du har ikke satt stop-loss. Bestem gjerne nå hvor mye du er villig til å tape.</span>` : ""}
      <div class="row"><button class="go" id="ok" type="button">Bekreft ${side === "K" ? "kjøp" : "salg"}</button><button class="go ghost" id="cancel" type="button">Avbryt</button></div></div>`;
    $("cancel").onclick = () => { $("conf").innerHTML = ""; };
    $("ok").onclick = () => {
      const now = new Date();
      S.P.trades.push({ id: uid(), t: now.toISOString(), d: today(), sym, navn: q.navn, type: q.type, side, qty: o.qty, price: o.p, fee: o.fee, tags: [...tags], why, sig: sg.map(s => s.tittel).slice(0, 6), check: side === "K" ? { ...checks } : undefined, stop: o.stop, target: o.target });
      if (side === "K" && (o.stop || o.target)) S.P.orders[sym] = { stop: o.stop, target: o.target, t: now.toISOString(), d: today(), navn: q.navn, type: q.type };
      commit();
      renderInstrument(sym).then(() => toast(`${side === "K" ? "Kjøpt" : "Solgt"} ${nf4.format(o.qty)} ${isFund ? "andeler" : "aksjer"} i ${q.navn}`));
    };
  }
  draw();
}
