import { $, esc, nf2, kr, pct, cls, label, dmy, api, push } from "../core.js";

export async function renderGroup() {
  const box = $("v-gruppe");
  box.innerHTML = `
    <section class="panel"><div class="ph"><h2><em>♛</em>Toppliste</h2><span class="src">Sortert etter avkastning mot indeksfondet i samme periode</span></div>
      <div class="tbl"><table><thead><tr><th>#</th><th>Navn</th><th class="r">Mot indeks</th><th class="r">Avkastning</th><th class="r">Verdi</th><th class="r">Handler</th><th class="r">Blindtest</th><th class="r">Quiz</th></tr></thead>
      <tbody id="lb"><tr><td colspan="8" class="empty">Henter …</td></tr></tbody></table></div>
      <div class="pad"><span class="note">«Mot indeks» er avkastningen din minus KLP AksjeNorge Indeks siden du startet. Det er den beste målestokken: slår du ikke indeksen, er indeksfond et bedre valg. Topplisten oppdateres når hver bruker åpner appen.</span></div></section>
    <section class="panel"><div class="ph"><h2><em>⇄</em>Hva gruppen handler</h2><span class="src">Siste 60 dager · med begrunnelser</span></div><div id="feed"><div class="empty">Henter …</div></div></section>`;
  push(); // sørg for at egen plass på topplisten er oppdatert
  try {
    const { rows } = await api("group/leaderboard");
    $("lb").innerHTML = rows.length ? rows.map((r, i) => `<tr${r.me ? ' class="meRow"' : ""}>
      <td class="num">${i + 1}</td>
      <td><div class="who"><span>${esc(r.navn)}${r.me ? ' <span class="note">(deg)</span>' : ""}${r.skjult ? ' <span class="note">· skjult for andre</span>' : ""}</span><small>startet ${dmy(r.start)} · ${r.posisjoner ?? 0} posisjoner</small></div></td>
      <td class="r num ${cls(r.alpha)}"><b>${pct(r.alpha)}</b></td>
      <td class="r num ${cls(r.ret)}">${pct(r.ret)}</td>
      <td class="r num">${kr(r.tv)}</td>
      <td class="r num">${r.handler ?? 0}</td>
      <td class="r num">${r.blindN ? Math.round(r.blindtest * 100) + " %" : "–"}<br><small>${r.blindN ? r.blindN + " forsøk" : ""}</small></td>
      <td class="r num">${r.quiz ?? 0}/11</td></tr>`).join("") : `<tr><td colspan="8" class="empty">Ingen på topplisten ennå.</td></tr>`;
  } catch (e) { $("lb").innerHTML = `<tr><td colspan="8" class="empty">${esc(e.message)}</td></tr>`; }
  try {
    const { items } = await api("group/feed");
    $("feed").innerHTML = items.length ? items.map(t => `<div class="sigrow click" data-s="${esc(t.sym)}">
      <span class="ic ${t.side === "K" ? "opp" : "ned"}">${t.side === "K" ? "▲" : "▼"}</span>
      <b>${esc(t.navn)}${t.me ? ' <span class="note">(deg)</span>' : ""} ${t.side === "K" ? "kjøpte" : "solgte"} ${label(t.sym) ? `<span class="tk">${esc(label(t.sym))}</span> ` : ""}${esc(t.papir)} <span class="note num">til ${nf2.format(t.price)}${t.cur && t.cur !== "NOK" ? " " + esc(t.cur) : ""} · ${dmy(t.d)}</span>${t.auto ? ' <span class="badge b-O">AUTO</span>' : ""}</b>
      <p>${esc([...(t.tags || []), t.why].filter(Boolean).join(" · ") || "Ingen begrunnelse")}${t.r30 ? ` · <span style="color:var(--neutral)">Etter 30 dager: ${esc(t.r30)}</span>` : ""}</p></div>`).join("")
      : `<div class="empty">Ingen delte handler de siste 60 dagene.</div>`;
    box.querySelectorAll(".click[data-s]").forEach(el => el.onclick = () => { location.hash = "aksje/" + encodeURIComponent(el.dataset.s); });
  } catch (e) { $("feed").innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
