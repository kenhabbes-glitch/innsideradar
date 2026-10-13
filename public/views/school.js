import { $, S, esc, commit, toast } from "../core.js";
import { LESSONS, QUIZ } from "../lib/lessons.js";

export function renderSchool() {
  const box = $("v-skole");
  const open = [...box.querySelectorAll("details[open]")].map(d => d.dataset.i);
  box.innerHTML = `<section class="panel"><div class="ph"><h2><em>✦</em>Skole</h2><span class="src">${LESSONS.length} korte leksjoner med quiz · ca. 3 minutter hver</span></div>
    <div class="lessons">${LESSONS.map((l, i) => {
      const r = S.P.quiz?.[i];
      return `<details class="lesson" data-i="${i}" ${open.includes(String(i)) || (!open.length && i === 1) ? "open" : ""}><summary><span class="no">${String(i + 1).padStart(2, "0")}</span><div><h3>${l.t}${r ? ` <span class="qs ${r.score === r.n ? "full" : ""}">${r.score === r.n ? "✓" : ""} ${r.score}/${r.n}</span>` : ""}</h3><p>${l.s}</p></div></summary>
        <div class="lbody">${l.b}${QUIZ[i] ? quizHtml(i) : ""}</div></details>`;
    }).join("")}</div></section>
    <p class="foot">Innholdet er laget for læring og er ikke investeringsråd. Historiske mønstre gir ingen garanti for fremtiden.</p>`;
  box.querySelectorAll(".quiz").forEach(bindQuiz);
}
// Trekk 3 tilfeldige spørsmål og stokk svaralternativene, så riktig svar ikke alltid står på samme plass
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ROUNDS = {};
function round(i) {
  ROUNDS[i] = shuffle(QUIZ[i]).slice(0, 3).map(x => {
    const order = shuffle(x.a.map((_, j) => j));
    return { q: x.q, f: x.f, a: order.map(j => x.a[j]), c: order.indexOf(x.c) };
  });
  return ROUNDS[i];
}
function quizHtml(i) {
  const Q = round(i);
  return `<div class="quiz" data-i="${i}"><span class="lbl">Test deg selv · 3 av ${QUIZ[i].length} spørsmål</span>${Q.map((x, k) => `<div class="qq" data-k="${k}"><b>${k + 1}. ${esc(x.q)}</b><div class="qa">${x.a.map((a, j) => `<button type="button" class="chip" data-j="${j}">${esc(a)}</button>`).join("")}</div><p class="qf" hidden></p></div>`).join("")}
    <button type="button" class="go ghost qnew" hidden>Nye spørsmål</button></div>`;
}
function bindQuiz(el) {
  const i = +el.dataset.i, Q = ROUNDS[i];
  const answers = {};
  el.querySelectorAll(".qq").forEach(qq => {
    const k = +qq.dataset.k;
    qq.querySelectorAll("[data-j]").forEach(b => b.onclick = () => {
      if (answers[k] != null) return;
      const j = +b.dataset.j; answers[k] = j;
      qq.querySelectorAll("[data-j]").forEach(x => { x.disabled = true; if (+x.dataset.j === Q[k].c) x.classList.add("right"); });
      if (j !== Q[k].c) b.classList.add("wrong");
      const f = qq.querySelector(".qf"); f.hidden = false; f.textContent = (j === Q[k].c ? "Riktig. " : "Ikke helt. ") + Q[k].f;
      if (Object.keys(answers).length === Q.length) {
        const score = Object.entries(answers).filter(([kk, v]) => Q[kk].c === v).length;
        S.P.quiz ||= {};
        const prev = S.P.quiz[i];
        if (!prev || score >= prev.score) S.P.quiz[i] = { score, n: Q.length, t: new Date().toISOString() };
        commit(); toast(`Quiz: ${score} av ${Q.length} riktige`);
        const nb = el.querySelector(".qnew"); nb.hidden = false;
        nb.onclick = () => { const fresh = document.createElement("div"); fresh.innerHTML = quizHtml(i); const q = fresh.firstElementChild; el.replaceWith(q); bindQuiz(q); };
      }
    });
  });
}
