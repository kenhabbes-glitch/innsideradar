import { $, D, S, esc, nf2, nf4, kr, pct, pctPlain, cls, label, dmy, today, daysBetween, toneIcon, hist, closeAt, price, book, totalValue, commit, toast } from "../core.js";
import { lineChart } from "../lib/chart.js";
import { alerts } from "../lib/alerts.js";
import { activeOrders } from "../lib/portfolio.js";

const go = sym => { location.hash = "aksje/" + encodeURIComponent(sym); };

export async function renderPortfolio() {
  const P = S.P;
  const box = $("v-portefolje");
  const b = book();
  const holdings = Object.values(b.pos).filter(p => p.qty > 0);
  const tv = totalValue();
  const ret = tv / P.startCash - 1;
  const orders = Object.fromEntries(activeOrders(P));
  const al = alerts(P, D.Q, D.RADAR, D.FUND, today()).slice(0, 12);
  const due = dueReviews();
  const events = upcoming();

  box.innerHTML = `
    <section class="kpis">
      <div class="kpi"><span class="l">Totalverdi</span><span class="v">${kr(tv)}</span><span class="s">startet med ${kr(P.startCash)} ${dmy(P.resetAt)}</span></div>
      <div class="kpi"><span class="l">Avkastning</span><span class="v ${cls(ret)}">${pct(ret)}</span><span class="s ${cls(tv - P.startCash)}">${kr(tv - P.startCash)}</span></div>
      <div class="kpi"><span class="l">Indeks samme periode</span><span class="v" id="bmk">…</span><span class="s">KLP AksjeNorge Indeks</span></div>
      <div class="kpi"><span class="l">Kontanter</span><span class="v">${kr(b.cash)}</span><span class="s">${P.trades.length} handler · kurtasje ${kr(b.fees)}</span></div>
    </section>

    ${due.length ? `<section class="panel attn"><div class="ph"><h2><em>✎</em>Til vurdering</h2><span class="src">${due.length} handel${due.length > 1 ? "er" : ""} venter på din vurdering</span></div><div id="reviews"></div></section>` : ""}

    <div class="grid2">
      <section class="panel"><div class="ph"><h2><em>!</em>Varsler</h2><a class="src" href="#innstillinger">Push-varsler →</a></div>
        ${al.length ? al.map(a => `<div class="sigrow click" data-s="${esc(a.sym)}"><span class="ic ${a.tone}">${toneIcon(a.tone)}</span><b>${esc(a.text)}</b><p>${dmy(a.d)}</p></div>`).join("")
          : `<div class="empty">Ingen varsler. Varsler gjelder aksjer du eier eller følger (★).</div>`}</section>
      <section class="panel"><div class="ph"><h2><em>◷</em>Kommende hendelser</h2><span class="src">Neste 45 dager · eier og følger</span></div>
        ${events.length ? events.map(e => `<div class="sigrow click" data-s="${esc(e.sym)}"><span class="ic nøytral">◷</span><b>${dmy(e.d)} · ${esc(e.navn)}</b><p>${e.what}${e.days <= 7 ? ` · <span style="color:var(--amber)">om ${e.days} dager</span>` : ""}</p></div>`).join("")
          : `<div class="empty">Ingen kjente rapporter eller utbyttedatoer. Følg aksjer med ★ for å se dem her.</div>`}</section>
    </div>

    <section class="panel"><div class="ph"><h2><em>∿</em>Utvikling mot indeks</h2><span class="legend"><span><i style="background:var(--amber)"></i> Din portefølje</span><span><i style="background:var(--dim)"></i> Indeksfond</span></span></div><div class="pad"><div id="eq"></div><div class="note" id="eqnote"></div></div></section>

    <div class="grid2">
      <section class="panel"><div class="ph"><h2><em>■</em>Beholdning</h2><a class="src" href="#marked">Finn noe å kjøpe →</a></div>
        <div class="tbl"><table><thead><tr><th>Navn</th><th class="r">Verdi</th><th class="r">Avkastning</th><th class="r">Andel</th><th class="r">Stop / mål</th></tr></thead><tbody>
        ${holdings.length ? holdings.map(p => {
          const px = price(p.sym), v = p.qty * (px ?? 0), r = v - p.cost, share = v / tv, q = D.Q.q[p.sym] || {}, o = orders[p.sym];
          return `<tr class="click" data-s="${esc(p.sym)}" tabindex="0"><td><div class="who"><span>${label(p.sym) ? `<span class="tk">${esc(label(p.sym))}</span> ` : ""}${esc(q.navn || p.sym)}</span><small>${nf4.format(p.qty)} stk · snitt ${nf2.format(p.cost / p.qty)} · nå ${px != null ? nf2.format(px) : "–"}</small></div></td>
            <td class="r num">${kr(v)}</td><td class="r num ${cls(r)}">${kr(r)}<br><small>${pct(v / p.cost - 1)}</small></td>
            <td class="r num" ${share > 0.1 ? `style="color:var(--amber)" title="Over 10 % i én posisjon"` : ""}>${(share * 100).toFixed(0)} %</td>
            <td class="r num note">${o ? `${o.stop ? nf2.format(o.stop) : "–"} / ${o.target ? nf2.format(o.target) : "–"}` : `<span style="color:var(--amber)" title="Ingen stop-loss">ingen</span>`}</td></tr>`;
        }).join("") : `<tr><td colspan="5" class="empty">Du eier ingenting ennå. Gå til Marked, åpne en aksje eller et fond og gjør din første fiktive handel.</td></tr>`}
        </tbody></table></div></section>
      <section class="panel"><div class="ph"><h2><em>◔</em>Fordeling</h2><span class="src">Spredning på bransjer</span></div><div class="pad" id="alloc"></div></section>
    </div>

    <section class="panel"><div class="ph"><h2><em>✦</em>Hva lærer du av handlene dine?</h2><span class="src">Avkastning siden kjøp, sortert etter begrunnelse</span></div><div id="learn"><div class="empty">Regner ut …</div></div></section>

    <section class="panel journal"><div class="ph"><h2><em>✎</em>Handelsjournal</h2><span class="src">Hvordan gikk det etter handelen?</span></div>
      <div class="tbl"><table><thead><tr><th>Dato</th><th>Handel</th><th>Begrunnelse og vurdering</th><th class="r">Kurs da / nå</th><th class="r">Siden</th></tr></thead><tbody>
      ${P.trades.length ? P.trades.slice().reverse().map(t => {
        const px = price(t.sym), ch = px != null ? px / t.price - 1 : null;
        const good = ch == null ? null : t.side === "K" ? ch >= 0 : ch <= 0;
        const rv = [t.r30 && `30 d: ${t.r30.svar}${t.r30.tekst ? " – " + t.r30.tekst : ""}`, t.r90 && `90 d: ${t.r90.svar}${t.r90.tekst ? " – " + t.r90.tekst : ""}`].filter(Boolean);
        return `<tr><td class="num">${dmy(t.d)}</td>
          <td><span class="badge b-${t.side}">${t.side === "K" ? "KJØP" : "SALG"}</span>${t.auto ? ' <span class="badge b-O">AUTO</span>' : ""} ${label(t.sym) ? `<span class="tk">${esc(label(t.sym))}</span>` : ""}<br><small>${nf4.format(t.qty)} × ${nf2.format(t.price)} · ${esc(t.navn || "")}</small></td>
          <td><div class="why">${esc([...(t.tags || []), t.why].filter(Boolean).join(" · "))}</div>${t.sig?.length ? `<small>Signaler da: ${esc(t.sig.join(", "))}</small>` : ""}${rv.length ? `<div class="why rv">${esc(rv.join(" · "))}</div>` : ""}</td>
          <td class="r num">${nf2.format(t.price)}<br><small>${px != null ? nf2.format(px) : "–"}</small></td>
          <td class="r num" style="color:${good == null ? "var(--dim)" : good ? "var(--up)" : "var(--down)"}">${pct(ch)}<br><small>${good == null ? "" : t.side === "K" ? (good ? "godt kjøp så langt" : "under kjøpskurs") : (good ? "godt salg så langt" : "steget etter salg")}</small></td></tr>`;
      }).join("") : `<tr><td colspan="5" class="empty">Journalen fylles når du handler. Hver handel lagres med begrunnelsen din og signalene som var der.</td></tr>`}
      </tbody></table></div></section>`;

  box.querySelectorAll(".click[data-s]").forEach(el => el.onclick = () => go(el.dataset.s));
  renderAlloc(holdings, tv, b.cash);
  if (due.length) renderReviews(due);
  const bm = await hist(D.Q.benchmark);
  drawEquity(bm);
  renderLearn(bm);
}

// ---------- vurdering etter 30 og 90 dager ----------
function dueReviews() {
  const out = [];
  for (const t of S.P.trades) {
    if (t.auto) continue;
    const age = daysBetween(t.d, today());
    if (age >= 90 && !t.r90) out.push([t, "r90", 90]);
    else if (age >= 30 && !t.r30) out.push([t, "r30", 30]);
  }
  return out;
}
async function renderReviews(due) {
  const bm = await hist(D.Q.benchmark);
  const el = $("reviews");
  el.innerHTML = due.slice(0, 4).map(([t, key, days], i) => {
    const px = price(t.sym), ch = px != null ? px / t.price - 1 : null;
    const bmCh = bm.length ? closeAt(bm, today()) / closeAt(bm, t.d) - 1 : null;
    const said = [...(t.tags || []), t.why].filter(Boolean).join(" · ") || "ingen begrunnelse";
    return `<div class="review" data-i="${i}">
      <b>${dmy(t.d)}: ${t.side === "K" ? "kjøpte" : "solgte"} ${esc(t.navn || t.sym)} til ${nf2.format(t.price)} · ${daysBetween(t.d, today())} dager siden (${days}-dagers vurdering)</b>
      <p>Du skrev: «${esc(said)}»</p>
      <p>Kursen siden: <span class="${cls(ch)}">${pct(ch)}</span>${bmCh != null ? ` · indeksen: <span class="${cls(bmCh)}">${pct(bmCh)}</span>` : ""}</p>
      <div class="reasons">${["Stemte", "Delvis", "Stemte ikke"].map(v => `<button class="chip" type="button" data-svar="${v}">${v}</button>`).join("")}</div>
      <textarea placeholder="Hva lærte du? Hva ville du gjort annerledes?"></textarea>
      <button class="go ghost" type="button" data-save>Lagre vurdering</button></div>`;
  }).join("");
  el.querySelectorAll(".review").forEach(r => {
    const [t, key] = due[+r.dataset.i];
    let svar = null;
    r.querySelectorAll("[data-svar]").forEach(b => b.onclick = () => { svar = b.dataset.svar; r.querySelectorAll("[data-svar]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    r.querySelector("[data-save]").onclick = () => {
      if (!svar) { toast("Velg om tesen stemte først"); return; }
      t[key] = { svar, tekst: r.querySelector("textarea").value.trim(), t: new Date().toISOString() };
      commit(); toast("Vurdering lagret"); renderPortfolio();
    };
  });
}

// ---------- kommende hendelser ----------
function upcoming() {
  const b = book();
  const syms = new Set([...Object.values(b.pos).filter(p => p.qty).map(p => p.sym), ...Object.entries(S.P.watch || {}).filter(([, w]) => w?.on).map(([s]) => s)]);
  const out = [], td = today();
  for (const s of syms) {
    const f = D.FUND.f?.[s]; if (!f) continue;
    const navn = D.Q.q[s]?.navn || s;
    for (const d of f.earnings || []) if (d >= td && daysBetween(td, d) <= 45) out.push({ sym: s, navn, d, days: daysBetween(td, d), what: "Kvartalsrapport. Kursen kan bevege seg mye." });
    if (f.exDiv && f.exDiv >= td && daysBetween(td, f.exDiv) <= 45) out.push({ sym: s, navn, d: f.exDiv, days: daysBetween(td, f.exDiv), what: `Siste dag med rett til utbytte${f.dy ? ` (ca. ${pctPlain(f.dy)} i året)` : ""}.` });
  }
  return out.sort((a, b) => (a.d < b.d ? -1 : 1));
}

// ---------- fordeling ----------
function renderAlloc(holdings, tv, cash) {
  const by = {};
  for (const p of holdings) { const s = D.Q.q[p.sym]?.sektor || "Annet"; by[s] = (by[s] || 0) + p.qty * (price(p.sym) ?? 0); }
  by["Kontanter"] = cash;
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const warn = rows.filter(([s, v]) => s !== "Kontanter" && v / tv > 0.3);
  $("alloc").innerHTML = rows.map(([s, v]) => `<div class="allocrow"><span>${esc(s)}</span><span class="bar2"><i style="width:${(v / tv * 100).toFixed(1)}%;${s === "Kontanter" ? "background:var(--dim)" : v / tv > 0.3 ? "background:var(--amber)" : ""}"></i></span><span class="num">${pctPlain(v / tv, 0)}</span></div>`).join("") +
    `<p class="note" style="margin:0">${holdings.length < 5 && holdings.length ? "Med færre enn 5 posisjoner er porteføljen sårbar for enkeltaksjer. " : ""}${warn.length ? `Over 30 % i ${warn.map(w => w[0].toLowerCase()).join(" og ")}. Selskaper i samme bransje svinger ofte sammen.` : holdings.length ? "Fordelingen ser balansert ut." : "Fordelingen vises når du har kjøpt noe."}</p>`;
}

// ---------- læring fra egne handler ----------
function renderLearn(bm) {
  const buys = S.P.trades.filter(t => t.side === "K" && !t.auto);
  const el = $("learn");
  if (!buys.length) { el.innerHTML = `<div class="empty">Når du har gjort noen kjøp, ser du her hvilke begrunnelser og signaler som faktisk har fungert for deg.</div>`; return; }
  const sells = S.P.trades.filter(t => t.side === "S");
  const res = buys.map(t => {
    const exit = sells.find(s => s.sym === t.sym && s.t > t.t);
    const end = exit ? exit.price : price(t.sym);
    const endD = exit ? exit.d : today();
    const r = end != null ? end / t.price - 1 : null;
    const bmR = bm.length ? closeAt(bm, endD) / closeAt(bm, t.d) - 1 : null;
    return { t, r, alpha: r != null && bmR != null ? r - bmR : null };
  }).filter(x => x.r != null);
  const group = keyFn => {
    const g = {};
    for (const x of res) for (const k of keyFn(x.t)) (g[k] ||= []).push(x);
    return Object.entries(g).map(([k, a]) => ({ k, n: a.length, avg: a.reduce((s, x) => s + x.r, 0) / a.length, hit: a.filter(x => x.r > 0).length / a.length, alpha: a.filter(x => x.alpha != null).reduce((s, x, _, arr) => s + x.alpha / arr.length, 0) }))
      .sort((a, b) => b.avg - a.avg);
  };
  const byTag = group(t => (t.tags?.length ? t.tags : ["Kun fritekst"]));
  const norm = s => s.replace(/\(.*?\)/g, "").replace(/RSI \d+: /, "RSI ").replace(/\d+[,.]?\d*/g, "").replace(/\s+/g, " ").trim();
  const bySig = group(t => (t.sig?.length ? [...new Set(t.sig.map(norm))] : ["Ingen signaler"]));
  const byCheck = group(t => { const c = t.check || {}; const nos = Object.values(c).filter(v => v === "Nei").length; return Object.keys(c).length ? [nos ? `Sjekkliste: ${nos} × nei` : "Sjekkliste: ingen nei"] : []; });
  const table = (title, rows) => rows.length ? `<div class="tbl"><table><thead><tr><th>${title}</th><th class="r">Kjøp</th><th class="r">Snitt</th><th class="r">Treff</th><th class="r">Mot indeks</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.k)}</td><td class="r num">${r.n}</td><td class="r num ${cls(r.avg)}">${pct(r.avg)}</td><td class="r num">${(r.hit * 100).toFixed(0)} %</td><td class="r num ${cls(r.alpha)}">${pct(r.alpha)}</td></tr>`).join("")}</tbody></table></div>` : "";
  const tot = res.reduce((s, x) => s + x.r, 0) / res.length, totA = res.filter(x => x.alpha != null).reduce((s, x, _, a) => s + x.alpha / a.length, 0);
  const best = byTag.filter(r => r.n >= 2)[0], worst = byTag.filter(r => r.n >= 2).slice(-1)[0];
  el.innerHTML = `<div class="pad"><p style="margin:0">Snitt per kjøp: <b class="${cls(tot)}">${pct(tot)}</b>, <b class="${cls(totA)}">${pct(totA)}</b> mot indeksen i samme periode. ${res.length < 10 ? `<span class="note">Med ${res.length} kjøp er dette mest støy. Mønstrene blir tydeligere etter 15–20 handler.</span>` : ""}
    ${best && worst && best !== worst ? `<br>Best: <b>${esc(best.k)}</b> (${pct(best.avg)}). Svakest: <b>${esc(worst.k)}</b> (${pct(worst.avg)}).` : ""}</p></div>
    ${table("Begrunnelse", byTag)}${table("Signal ved kjøp", bySig)}${table("Sjekkliste", byCheck)}
    <div class="pad"><span class="note">Treff = andel kjøp som har steget. «Mot indeks» = avkastning minus KLP AksjeNorge i samme periode. Solgte posisjoner regnes til salgskurs.</span></div>`;
}

// ---------- utvikling ----------
async function drawEquity(bmBars) {
  const P = S.P, start = P.resetAt.slice(0, 10), bm = D.Q.benchmark;
  const syms = [...new Set(P.trades.map(t => t.sym))];
  const H = Object.fromEntries(await Promise.all(syms.map(async s => [s, await hist(s)])));
  H[bm] = bmBars;
  const td = today();
  const dates = [...new Set(Object.values(H).flatMap(b => b.map(x => x.t)))].filter(d => d >= start).sort();
  if (!dates.includes(td)) dates.push(td);
  const mine = [], idx = [];
  const bm0 = bmBars.find(x => x.t >= start)?.c ?? (bmBars.length ? bmBars[bmBars.length - 1].c : null);
  for (const d of dates) {
    const bk = book(d);
    let v = bk.cash;
    for (const p of Object.values(bk.pos)) if (p.qty) v += p.qty * ((d === td ? price(p.sym) : closeAt(H[p.sym] || [], d)) ?? p.cost / p.qty);
    mine.push([d, v]);
    const bc = d === td ? price(bm) ?? closeAt(bmBars, d) : closeAt(bmBars, d);
    if (bm0 && bc) idx.push([d, P.startCash * bc / bm0]);
  }
  const bmRet = idx.length ? idx[idx.length - 1][1] / P.startCash - 1 : null;
  $("bmk").innerHTML = `<span class="${cls(bmRet)}">${pct(bmRet)}</span>`;
  if (mine.length < 2) { $("eq").innerHTML = ""; $("eqnote").textContent = "Grafen fylles ut etter hvert som handelsdagene går. Kom tilbake i morgen."; return; }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n);
  lineChart($("eq"), [{ data: idx, color: css("--dim"), dash: [4, 3] }, { data: mine, color: css("--amber"), width: 2 }], { base: P.startCash, fmt: v => Math.round(v / 1000) + "k" });
  const diff = mine[mine.length - 1][1] / P.startCash - 1 - (bmRet || 0);
  $("eqnote").textContent = bmRet == null ? "" : diff >= 0 ? `Du slår indeksfondet med ${(diff * 100).toFixed(1).replace(".", ",")} prosentpoeng.` : `Indeksfondet ligger ${(-diff * 100).toFixed(1).replace(".", ",")} prosentpoeng foran deg.`;
}
