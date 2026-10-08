const TYPE = { K: "KJØP", S: "SALG", P: "PROGRAM", O: "OVERF.", "?": "UKLAR" };
const nf = new Intl.NumberFormat("nb-NO");
const nf2 = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtD = d => d.slice(8, 10) + "." + d.slice(5, 7);
const title = s => s.toLowerCase().replace(/(^|[\s.\-/(])([a-zæøå])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bAsa\b/, "ASA");
const val = r => (r.shares != null && r.price != null ? r.shares * r.price : null);
const short = v => (v >= 1e6 ? nf2.format(v / 1e6) + " M" : v >= 1e3 ? nf.format(Math.round(v / 1e3)) + " k" : nf.format(Math.round(v)));
const $ = id => document.getElementById(id);
const msgUrl = id => `https://newsweb.oslobors.no/message/${id}`;



async function load(name) {
  const r = await window.irFetch(`${name}?v=${Date.now()}`);
  if (!r.ok) throw new Error(name);
  return r.json();
}

Promise.all([load("ssr.json"), load("insider.json"), load("meta.json").catch(() => null)])
  .then(([shorts, ins, meta]) => render(shorts, ins, meta))
  .catch(() => { $("kpis").innerHTML = `<div class="err">Fant ikke data. Kjør «Oppdater data» i GitHub Actions én gang.</div>`; });

function spark(h, w = 96, hgt = 24) {
  if (!h || h.length < 2) return `<span class="note">–</span>`;
  const mx = Math.max(...h), mn = Math.min(...h), rng = mx - mn || 1;
  const pts = h.map((v, i) => [(i * (w - 4)) / (h.length - 1) + 2, hgt - 3 - ((v - mn) / rng) * (hgt - 6)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  const c = h[h.length - 1] >= h[0] ? "var(--down)" : "var(--up)";
  return `<svg class="spark" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}" aria-hidden="true"><path d="${d} L${last[0].toFixed(1)} ${hgt} L2 ${hgt} Z" fill="${c}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="${last[0]}" cy="${last[1]}" r="2.4" fill="${c}"/></svg>`;
}

function render(shorts, INS, meta) {
  const byTk = Object.fromEntries(shorts.filter(s => s.tk).map(s => [s.tk, s]));
  if (meta) {
    const u = new Date(meta.updated);
    $("upd").textContent = `Oppdatert ${u.toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · Oslo Børs`;
  } else $("upd").textContent = "Oslo Børs";

  // tape
  const tape = INS.filter(r => r.type === "K" || r.type === "S").slice(0, 18).map(r => {
    const v = val(r), c = r.type === "K" ? "var(--up)" : "var(--down)";
    return `<span><b>${esc(r.tk)}</b><span style="color:${c}">${r.type === "K" ? "▲ KJØP" : "▼ SALG"}</span> ${r.shares != null ? nf.format(r.shares) : "–"}${r.price != null ? " @ " + nf2.format(r.price) : ""}${v ? " · " + r.cur + " " + short(v) : ""}</span>`;
  }).join("");
  $("tape").innerHTML = tape + tape;

  // KPI
  const buys = INS.filter(r => r.type === "K"), sells = INS.filter(r => r.type === "S");
  const buyNok = buys.filter(r => r.cur === "NOK").reduce((a, r) => a + (val(r) || 0), 0);
  const topS = shorts[0];
  const kp = [
    ["Innsidekjøp", buys.length, `mot ${sells.length} salg siste ${meta?.days || 30} dager`],
    ["Kjøpt for (NOK)", short(buyNok), "kun handler med oppgitt kurs i NOK"],
    ["Shortede aksjer", shorts.length, "med offentlig posisjon ≥ 0,5 %"],
    ["Høyest short", topS ? nf2.format(topS.p) + " %" : "–", topS ? (topS.tk || "") + " · " + title(topS.name) : ""],
  ];
  $("kpis").innerHTML = kp.map(k => `<div class="kpi"><span class="l">${k[0]}</span><span class="v">${k[1]}</span><span class="s">${esc(k[2])}</span></div>`).join("");

  // signaler
  const sig = {};
  buys.forEach(r => {
    if (!byTk[r.tk]) return;
    const s = (sig[r.tk] ||= { tk: r.tk, co: r.co, n: 0, v: 0, cur: r.cur, ppl: new Set() });
    s.n++; s.v += val(r) || 0;
    if (r.person) s.ppl.add(r.person.replace(/ \(.*\)/, ""));
  });
  const sigs = Object.values(sig).sort((a, b) => byTk[b.tk].p - byTk[a.tk].p);
  $("signals").innerHTML = sigs.length ? sigs.map(s => {
    const sh = byTk[s.tk], d = sh.p30 != null ? sh.p - sh.p30 : null;
    return `<button class="sig" data-tk="${esc(s.tk)}" aria-label="Vis shortposisjoner i ${esc(s.co)}">
      <div class="t"><span class="tk">${esc(s.tk)}</span><span class="nm">${esc(s.co)}</span></div>
      <div class="tug">
        <div><span class="k">Innside</span><span class="num up">▲ ${s.n} kjøp${s.v ? " · " + s.cur + " " + short(s.v) : ""}</span></div>
        <div><span class="k">Short</span><span class="num dn">▼ ${nf2.format(sh.p)} %${d != null ? ` (${d >= 0 ? "+" : ""}${nf2.format(d)})` : ""}</span></div>
      </div>
      <p>${esc([...s.ppl].join(", "))}</p>
    </button>`;
  }).join("") : `<div class="empty">Ingen selskaper har både innsidekjøp og aktiv short akkurat nå.</div>`;

  // innsidetabell
  let filt = "all", q = "";
  const renderIns = () => {
    const rows = INS.filter(r => (filt === "all" || r.type === filt || (filt === "P" && r.type === "O")) &&
      (!q || `${r.tk} ${r.co} ${r.person}`.toLowerCase().includes(q)));
    $("ins").innerHTML = rows.length ? rows.map(r => {
      const v = val(r);
      return `<tr class="msg" tabindex="0" data-id="${r.id}" title="Åpne meldingen på Newsweb">
        <td class="num">${fmtD(r.d)}</td>
        <td><span class="tk">${esc(r.tk)}</span>${byTk[r.tk] ? ` <span class="note num" title="Aktiv short">S ${nf2.format(byTk[r.tk].p)}%</span>` : ""}</td>
        <td><div class="who"><span>${esc(r.person || r.title)}</span><small>${esc([r.role, r.co].filter(Boolean).join(" · "))}</small></div></td>
        <td><span class="badge b-${r.type === "?" ? "U" : r.type}">${TYPE[r.type] || r.type}</span></td>
        <td class="r num">${r.shares != null ? nf.format(r.shares) : "–"}</td>
        <td class="r num">${r.price != null ? nf2.format(r.price) : "–"}</td>
        <td class="r num">${v ? `<span class="note">${r.cur}</span> ${short(v)}` : "–"}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="7" class="empty">Ingen treff. Prøv et annet søk eller filter.</td></tr>`;
    document.querySelectorAll("#ins tr.msg").forEach(tr => {
      const go = () => { if (+tr.dataset.id) window.open(msgUrl(tr.dataset.id), "_blank", "noopener"); };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    });
  };
  document.querySelectorAll(".chip[data-f]").forEach(b => b.addEventListener("click", () => {
    filt = b.dataset.f;
    document.querySelectorAll(".chip[data-f]").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderIns();
  }));
  $("q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderIns(); });
  renderIns();

  // shortliste
  const maxP = shorts[0]?.p || 1;
  $("short").innerHTML = shorts.map((s, i) => {
    const d = s.p30 != null ? s.p - s.p30 : null;
    return `<tr class="click" tabindex="0" data-i="${i}">
      <td><div class="who"><span><span class="tk">${esc(s.tk || "—")}</span> ${esc(title(s.name))}</span><div class="bar"><i style="width:${((s.p / maxP) * 100).toFixed(1)}%"></i></div></div></td>
      <td class="r num">${nf2.format(s.p)}%</td>
      <td class="r num chg ${d > 0 ? "up" : d < 0 ? "dn" : ""}">${d == null ? "ny" : (d >= 0 ? "+" : "") + nf2.format(d)}</td>
      <td>${spark(s.hist)}</td>
    </tr>`;
  }).join("");

  const drawer = $("drawer");
  const openShort = s => {
    drawer.hidden = false;
    const ins = INS.filter(r => r.tk && r.tk === s.tk);
    drawer.innerHTML = `<h3><span class="tk">${esc(s.tk || "")}</span>${esc(title(s.name))} <span class="note num">sist endret ${fmtD(s.d)} · ISIN ${esc(s.isin)}</span><button class="chip x" id="cls">Lukk</button></h3>
      <div class="hold">${s.h.map(h => `<div><span>${esc(h[0])}</span><span class="num" style="text-align:right">${nf2.format(h[1])} %</span><span class="num note">siden ${h[2].split("-").reverse().join(".")}</span></div>`).join("")}</div>
      ${ins.length ? `<div class="note">Innsidehandel: ${ins.map(r => `${(TYPE[r.type] || "").toLowerCase()} ${r.shares != null ? nf.format(r.shares) : ""} (${esc((r.person || "").replace(/ \(.*\)/, ""))}, ${fmtD(r.d)})`).join(" · ")}</div>` : ""}`;
    $("cls").onclick = () => { drawer.hidden = true; };
    drawer.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  document.querySelectorAll("#short tr").forEach(tr => {
    const go = () => openShort(shorts[+tr.dataset.i]);
    tr.addEventListener("click", go);
    tr.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  });
  document.querySelectorAll(".sig").forEach(b => b.addEventListener("click", () => openShort(byTk[b.dataset.tk])));
}
