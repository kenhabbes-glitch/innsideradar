// Trendtvillinger: papirer som pleier å følge aksjer/fond som nettopp har steget eller falt kraftig,
// men som ikke har fulgt etter ennå. Tallene regnes ut av scripts/trend.mjs i GitHub Actions (trend.json).
import { $, D, S, esc, nf2, pct, pctPlain, label, dmy, isWatched, toggleWatch, book } from "../core.js";

const go = sym => { location.hash = "aksje/" + encodeURIComponent(sym); };
let dir = "opp", only = "alle";

const owned = () => new Set(Object.values(book().pos).filter(p => p.qty > 0).map(p => p.sym));
const corr = c => nf2.format(c).replace(/0+$/, "").replace(/,$/, "");
const leadTxt = l => `${esc(l.navn)} <b class="${l.ret >= 0 ? "pos" : "neg"}">${pct(l.ret, 0)}</b> <span class="note">· samvariasjon ${corr(l.corr)}</span>`;

// Hvor ofte har signalet slått til tidligere? Vises alltid, så ingen tror dette er en garanti.
export function btText(d, short) {
  const bt = D.TREND?.backtest?.[d];
  if (!bt?.n) return "";
  const mnd = s => new Date(s + "T12:00:00Z").toLocaleDateString("nb-NO", { month: "short", year: "numeric" });
  const verb = d === "opp" ? "gjorde det bedre enn" : "gjorde det dårligere enn";
  const head = short ? "Slik har det gått før: " : `Tilbaketest ${mnd(D.TREND.backtest.from)}–${mnd(D.TREND.backtest.to)}: `;
  const weak = bt.hit < 0.53;
  return `${head}papirer på en slik liste ${verb} markedet de neste ${D.TREND.backtest.horizon} handelsdagene i <b>${pctPlain(bt.hit, 0)}</b> av ${bt.n} tilfeller` +
    (d === "opp" ? `, i snitt <b class="${bt.ex >= 0 ? "pos" : "neg"}">${pct(bt.ex)}</b> mer enn snittaksjen.` : ".") +
    (weak ? ` <span style="color:var(--amber)">Det er omtrent som å kaste mynt, så bruk dette som en grunn til å se nærmere etter, ikke som et salgssignal.</span>` : "");
}

function rows(list, mine, d) {
  const own = owned();
  return list.map(r => {
    const tag = own.has(r.sym) ? `<span class="badge b-own">EIER</span>` : isWatched(r.sym) ? `<span class="badge b-watch">★</span>` : "";
    const exp = d === "opp" ? Math.max(...r.links.map(l => l.exp)) : Math.min(...r.links.map(l => l.exp));
    return `<tr class="click" tabindex="0" data-s="${esc(r.sym)}">
      <td><div class="who"><span>${label(r.sym) ? `<span class="tk">${esc(label(r.sym))}</span> ` : ""}${esc(r.navn)} ${tag}</span>
        <small>Følger ofte: ${r.links.slice(0, mine ? 4 : 2).map(leadTxt).join(" · ")}</small></div></td>
      <td class="r num ${r.ret >= 0 ? "pos" : "neg"}">${pct(r.ret)}</td>
      <td class="r num note kv" title="Hva samvariasjonen tilsier at papiret kunne ha beveget seg">${pct(exp, 0)}</td>
      ${mine ? "" : `<td><button class="star" data-w="${esc(r.sym)}" aria-pressed="${isWatched(r.sym)}" aria-label="Følg ${esc(r.navn)}">★</button></td>`}
    </tr>`;
  }).join("");
}
function wire(el, rerender) {
  el.querySelectorAll("tr.click").forEach(tr => {
    const g = e => { if (e.target.closest(".star")) return; go(tr.dataset.s); };
    tr.addEventListener("click", g);
    tr.addEventListener("keydown", e => { if (e.key === "Enter") g(e); });
  });
  el.querySelectorAll(".star").forEach(b => b.addEventListener("click", () => { toggleWatch(b.dataset.w); rerender(); }));
}

// ---------- Radar: «Verdt å se på» ----------
export function renderTrendRadar() {
  const el = $("trendpanel");
  if (!el) return;
  const T = D.TREND;
  if (!T?.opp) { el.hidden = true; return; }
  el.hidden = false;
  const own = owned();
  let list = T[dir] || [];
  if (only === "mine") list = list.filter(r => own.has(r.sym) || isWatched(r.sym));
  const leaders = T.leaders?.[dir] || [];
  const shown = list.slice(0, 15);
  el.innerHTML = `
    <div class="ph">
      <h2><em>${dir === "opp" ? "⇡" : "⇣"}</em>Trendtvillinger · verdt å se på</h2>
      <div class="ctl" role="group" aria-label="Retning">
        <button class="chip" data-d="opp" aria-pressed="${dir === "opp"}">Henger etter opp</button>
        <button class="chip" data-d="ned" aria-pressed="${dir === "ned"}">Henger etter ned</button>
        <button class="chip" data-o="mine" aria-pressed="${only === "mine"}">Bare mine</button>
      </div>
    </div>
    <div class="pad trendintro">
      <p>${dir === "opp"
        ? `Papirer som pleier å bevege seg sammen med aksjer som har <b class="pos">steget over 10 %</b> siste måned, men som selv ikke har fulgt etter ennå.`
        : `Papirer som pleier å bevege seg sammen med aksjer som har <b class="neg">falt over 10 %</b> siste måned, men som selv ikke har falt ennå.`}
        <span class="note">${dmy(T.from)}–${dmy(T.d)}</span></p>
      ${leaders.length ? `<p class="note">${dir === "opp" ? "Har steget" : "Har falt"}: ${leaders.slice(0, 10).map(l => `<a href="#aksje/${encodeURIComponent(l.sym)}">${esc(l.navn)}</a> <span class="${l.ret >= 0 ? "pos" : "neg"}">${pct(l.ret, 0)}</span>`).join(" · ")}${leaders.length > 10 ? ` · +${leaders.length - 10} til` : ""}</p>` : ""}
      <p class="note">${btText(dir)}</p>
    </div>
    ${shown.length ? `<div class="tbl"><table>
      <thead><tr><th>Papir og hvem det pleier å følge</th><th class="r">Siste mnd</th><th class="r kv" title="Hva samvariasjonen tilsier">Kunne vært</th><th></th></tr></thead>
      <tbody>${rows(shown, false, dir)}</tbody></table></div>`
      : `<div class="empty">${only === "mine" ? "Ingen av papirene du eier eller følger er på listen nå." : leaders.length ? "Ingen papirer henger tydelig etter akkurat nå." : `Ingen aksjer har ${dir === "opp" ? "steget" : "falt"} over 10 % siste måned uten at det skyldtes én enkelt dag.`}</div>`}
    <p class="foot" style="margin:0;padding:10px 14px">Samvariasjon (0–1) er målt på ukentlige endringer siste halvannet år, før den siste måneden. Bevegelser som kom på én enkelt dag (bud, kvartalsrapport) er holdt utenfor, fordi de som regel bare gjelder ett selskap. Dette er et læringsverktøy og ikke investeringsråd.</p>`;
  el.querySelectorAll(".chip[data-d]").forEach(b => b.addEventListener("click", () => { dir = b.dataset.d; renderTrendRadar(); }));
  el.querySelector(".chip[data-o]").addEventListener("click", () => { only = only === "mine" ? "alle" : "mine"; renderTrendRadar(); });
  wire(el, renderTrendRadar);
}

// ---------- Portefølje: papirene dine mot trendtvillingene ----------
export function trendPortfolioHtml() {
  const T = D.TREND;
  if (!T?.opp) return "";
  const own = owned();
  if (!own.size) return "";
  const ned = (T.ned || []).filter(r => own.has(r.sym)), opp = (T.opp || []).filter(r => own.has(r.sym));
  const block = (list, d) => `<div class="tbl"><table><thead><tr><th>${d === "ned" ? "▼ Kan bli dratt ned" : "▲ Kan bli dratt opp"}</th><th class="r">Siste mnd</th><th class="r kv">Kunne vært</th></tr></thead><tbody>${rows(list, true, d)}</tbody></table></div>`;
  return `<section class="panel" id="trendmine"><div class="ph"><h2><em>⇅</em>Papirene dine og trendtvillingene</h2><a class="src" href="#radar">Hele listen →</a></div>
    ${ned.length ? block(ned, "ned") + `<div class="pad"><p class="note" style="margin:0">${btText("ned", true)} Sjekk om du har stop-loss.</p></div>` : ""}
    ${opp.length ? block(opp, "opp") : ""}
    ${!ned.length && !opp.length ? `<div class="empty">Ingen av papirene du eier henger etter noe som har steget eller falt over 10 % siste måned.</div>` : ""}
  </section>`;
}
