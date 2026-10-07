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
function quizHtml(i) {
  return `<div class="quiz" data-i="${i}"><span class="lbl">Test deg selv</span>${QUIZ[i].map((x, k) => `<div class="qq" data-k="${k}"><b>${k + 1}. ${esc(x.q)}</b><div class="qa">${x.a.map((a, j) => `<button type="button" class="chip" data-j="${j}">${esc(a)}</button>`).join("")}</div><p class="qf" hidden></p></div>`).join("")}</div>`;
}
function bindQuiz(el) {
  const i = +el.dataset.i, Q = QUIZ[i];
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
      }
    });
  });
}
