import { $, D, S, esc, nf0, nf2, kr, pct, cls, dmy, uid, toneIcon, hist, commit } from "../core.js";
import { createChart, lineChart } from "../lib/chart.js";
import { signals } from "../lib/indicators.js";
import { LESSONS, QUIZ } from "../lib/lessons.js";

let bt = null, btChart = null;
export function destroyTraining() { if (btChart) { btChart.destroy(); btChart = null; } }

export function renderTraining() {
  destroyTraining();
  const box = $("v-trening");
  const log = S.P.practice?.log || [];
  const ok = log.filter(r => r.guess === r.actual).length;
  const sigLog = log.filter(r => r.sigTone && r.sigTone !== "nøytral");
  const sigOk = sigLog.filter(r => r.sigTone === r.actual).length;
  const quizDone = Object.values(S.P.quiz || {}).length;
  box.innerHTML = `
    <section class="panel"><div class="ph"><h2><em>◎</em>Blindtest</h2><span class="src">Gjett retningen de neste 21 handelsdagene (ca. én måned)</span></div>
      <div class="pad">
        <div class="kpis small">
          <div class="kpi"><span class="l">Forsøk</span><span class="v">${log.length}</span></div>
          <div class="kpi"><span class="l">Riktig</span><span class="v">${log.length ? Math.round(ok / log.length * 100) + " %" : "–"}</span><span class="s">50 % er myntkast</span></div>
          <div class="kpi"><span class="l">Signalene hadde rett</span><span class="v">${sigLog.length ? Math.round(sigOk / sigLog.length * 100) + " %" : "–"}</span><span class="s">${sigLog.length} tester med tydelig signal</span></div>
          <div class="kpi"><span class="l">Siste 20</span><span class="v">${log.length ? Math.round(log.slice(-20).filter(r => r.guess === r.actual).length / Math.min(20, log.length) * 100) + " %" : "–"}</span></div>
        </div>
        <p class="note" style="margin:0" id="btq">Du ser 6 måneder av en ukjent aksje, uten navn og datoer. Vil kursen være høyere eller lavere om en måned? Bruk trend, snitt, RSI, volum og mønstre.</p>
        <div class="chartbox" id="btchart"></div>
        <div class="row" id="btbtns"><button class="go up" type="button" data-g="opp">▲ Høyere</button><button class="go down" type="button" data-g="ned">▼ Lavere</button></div>
        <div id="btres"></div>
      </div></section>

    <section class="panel"><div class="ph"><h2><em>✓</em>Quiz</h2><a class="src" href="#skole">Ta quizene i Skole →</a></div>
      <div class="quizgrid">${LESSONS.map((l, i) => { const r = S.P.quiz?.[i]; return `<a href="#skole" class="qz ${r ? (r.score === r.n ? "full" : "part") : ""}"><span class="no">${String(i + 1).padStart(2, "0")}</span><span>${esc(l.t)}</span><b class="num">${r ? `${r.score}/${r.n}` : "–"}</b></a>`; }).join("")}</div>
      <div class="pad"><span class="note">${quizDone}/${LESSONS.length} quizer tatt.</span></div></section>

    <div class="grid2">
      <section class="panel"><div class="ph"><h2><em>∑</em>Sparekalkulator</h2><span class="src">Hva kostnader betyr over tid</span></div>
        <div class="pad">
          <div class="two"><div class="field"><label for="sm">Månedlig sparing (kr)</label><input id="sm" type="number" value="2000" step="500"></div><div class="field"><label for="ss">Startbeløp (kr)</label><input id="ss" type="number" value="0" step="1000"></div></div>
          <div class="two"><div class="field"><label for="sy">Antall år</label><input id="sy" type="number" value="20" step="1"></div><div class="field"><label for="sr">Forventet avkastning før kostnad (% i året)</label><input id="sr" type="number" value="7" step="0.5"></div></div>
          <div class="two"><div class="field"><label for="ca">Kostnad A (indeksfond, %)</label><input id="ca" type="number" value="0.2" step="0.05"></div><div class="field"><label for="cb">Kostnad B (aktivt fond, %)</label><input id="cb" type="number" value="1.5" step="0.1"></div></div>
          <div id="sav"></div><div id="savchart"></div>
        </div></section>
      <section class="panel"><div class="ph"><h2><em>∑</em>Aksjesparekonto (ASK)</h2><span class="src">Forenklet modell</span></div>
        <div class="pad">
          <div class="two"><div class="field"><label for="ab">Beløp (kr)</label><input id="ab" type="number" value="100000" step="10000"></div><div class="field"><label for="ay">Antall år</label><input id="ay" type="number" value="20"></div></div>
          <div class="two"><div class="field"><label for="ar">Avkastning (% i året)</label><input id="ar" type="number" value="7" step="0.5"></div><div class="field"><label for="as">Antall bytter underveis</label><input id="as" type="number" value="4" min="0" max="40"></div></div>
          <div class="field"><label for="at">Effektiv skattesats på gevinst (%)</label><input id="at" type="number" value="37.84" step="0.01"></div>
          <div id="ask"></div>
          <p class="note" style="margin:0">Uten ASK skattes gevinsten hver gang du selger for å kjøpe noe annet, så mindre penger jobber videre. På ASK betaler du først skatt ved uttak. Modellen ser bort fra skjermingsfradrag og utbytte. Sjekk gjeldende skattesats hos Skatteetaten. Ikke skatterådgivning.</p>
        </div></section>
    </div>`;

  box.querySelectorAll("[data-g]").forEach(b => b.onclick = () => guess(b.dataset.g));
  ["sm", "ss", "sy", "sr", "ca", "cb"].forEach(id => $(id).oninput = savings);
  ["ab", "ay", "ar", "as", "at"].forEach(id => $(id).oninput = ask);
  savings(); ask();
  nextTest();
}

// ---------- blindtest ----------
async function nextTest() {
  const stocks = Object.entries(D.Q.q).filter(([, q]) => q.type === "aksje").map(([s]) => s);
  if (!stocks.length) { $("btq").textContent = "Blindtesten trenger kursdata. Kjør «Oppdater data» i GitHub Actions først."; $("btbtns").hidden = true; return; }
  for (let tries = 0; tries < 8; tries++) {
    const sym = stocks[Math.floor(Math.random() * stocks.length)];
    const bars = await hist(sym);
    if (bars.length < 200) continue;
    const k = 130 + Math.floor(Math.random() * (bars.length - 130 - 22));
    bt = { sym, bars, k };
    break;
  }
  if (!bt) return;
  $("btres").innerHTML = ""; $("btbtns").hidden = false;
  destroyTraining();
  $("btchart").innerHTML = "";
  btChart = createChart($("btchart"), { height: 300 });
  btChart.setData(bt.bars.slice(0, bt.k + 1), { hideDates: true, range: 126 });
}
function guess(g) {
  if (!bt) return;
  const { sym, bars, k } = bt;
  const p0 = bars[k].c, p1 = bars[k + 21].c, ch = p1 / p0 - 1;
  const actual = ch >= 0 ? "opp" : "ned";
  const sg = signals(bars.slice(0, k + 1));
  const score = sg.reduce((s, x) => s + (x.tone === "opp" ? 1 : x.tone === "ned" ? -1 : 0), 0);
  const sigTone = score > 0 ? "opp" : score < 0 ? "ned" : "nøytral";
  S.P.practice ||= { log: [] };
  S.P.practice.log.push({ id: uid(), t: new Date().toISOString(), sym, d: bars[k].t, guess: g, actual, ch, sigTone });
  commit();
  btChart.setData(bars.slice(0, k + 22), { split: k, range: 147 });
  const q = D.Q.q[sym];
  $("btbtns").hidden = true;
  $("btres").innerHTML = `<div class="msg ${g === actual ? "ok" : "err"}">${g === actual ? "Riktig!" : "Feil."} ${esc(q?.navn || sym)} ${dmy(bars[k].t)}: kursen gikk <b>${pct(ch)}</b> den neste måneden.</div>
    <div class="sigs">${sg.length ? sg.map(s => `<div class="sigrow"><span class="ic ${s.tone}">${toneIcon(s.tone)}</span><b>${esc(s.tittel)}</b><p>${esc(s.tekst)}</p></div>`).join("") : `<div class="empty">Ingen tydelige signaler på dette tidspunktet.</div>`}</div>
    <p class="note" style="margin:0">Signalene samlet pekte ${sigTone === "nøytral" ? "ingen tydelig vei" : sigTone === "opp" ? "opp" : "ned"}${sigTone !== "nøytral" ? ` og hadde ${sigTone === actual ? "rett" : "feil"} denne gangen` : ""}. Det gule feltet i grafen er måneden du gjettet på.</p>
    <button class="go" id="btnext" type="button">Neste aksje</button>`;
  $("btnext").onclick = () => renderTraining();
}

// ---------- kalkulatorer ----------
function savings() {
  const m = +$("sm").value || 0, s0 = +$("ss").value || 0, y = Math.max(1, Math.min(60, +$("sy").value || 1)), r = (+$("sr").value || 0) / 100;
  const run = c => { let v = s0; const pts = [[0, v]]; const mr = Math.pow(1 + r - c, 1 / 12) - 1; for (let i = 1; i <= y * 12; i++) { v = v * (1 + mr) + m; if (i % 12 === 0) pts.push([i / 12, v]); } return pts; };
  const A = run((+$("ca").value || 0) / 100), B = run((+$("cb").value || 0) / 100);
  const paid = s0 + m * 12 * y, a = A[A.length - 1][1], b = B[B.length - 1][1];
  $("sav").innerHTML = `<div class="calc"><span>Du sparer totalt</span><span>${kr(paid)}</span><span>Sluttverdi A</span><span class="pos">${kr(a)}</span><span>Sluttverdi B</span><span>${kr(b)}</span><span class="tot">Kostnadene i B koster deg</span><span class="tot neg">${kr(a - b)} (${(100 * (1 - b / a)).toFixed(0)} %)</span></div>`;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n);
  lineChart($("savchart"), [{ data: B.map(([x, v]) => [`år ${x}`, v]), color: css("--down") }, { data: A.map(([x, v]) => [`år ${x}`, v]), color: css("--up"), width: 2 }], { height: 180, fmt: v => nf0.format(v / 1000) + "k", labels: false });
}
function ask() {
  const b = +$("ab").value || 0, y = Math.max(1, +$("ay").value || 1), r = (+$("ar").value || 0) / 100, n = Math.max(0, Math.min(40, Math.round(+$("as").value || 0))), tax = (+$("at").value || 0) / 100;
  const askEnd = b * Math.pow(1 + r, y), askNet = askEnd - (askEnd - b) * tax;
  let v = b, basis = b; const seg = y / (n + 1);
  for (let i = 0; i <= n; i++) {
    v *= Math.pow(1 + r, seg);
    if (i < n) { const t = Math.max(0, v - basis) * tax; v -= t; basis = v; }
  }
  const ordNet = v - Math.max(0, v - basis) * tax;
  $("ask").innerHTML = `<div class="calc"><span>Etter skatt med ASK</span><span class="pos">${kr(askNet)}</span><span>Etter skatt uten ASK (${n} bytter)</span><span>${kr(ordNet)}</span><span class="tot">Fordel med ASK</span><span class="tot ${cls(askNet - ordNet)}">${kr(askNet - ordNet)}</span></div>`;
}
