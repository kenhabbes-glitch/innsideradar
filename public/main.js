import { $, S, esc, loadAll, pull, applyOrders } from "./core.js";
import { renderMarket, initMarket } from "./views/market.js";
import { renderInstrument, destroyChart } from "./views/instrument.js";
import { renderPortfolio } from "./views/portfolio.js";
import { renderTraining, destroyTraining } from "./views/training.js";
import { renderSchool } from "./views/school.js";
import { renderSettings } from "./views/settings.js";

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

const VIEWS = ["radar", "marked", "instr", "portefolje", "trening", "skole", "innstillinger"];
function route() {
  const h = decodeURIComponent(location.hash.slice(1) || "radar");
  const [v, arg] = h.split("/");
  const view = v === "aksje" ? "instr" : VIEWS.includes(v) ? v : "radar";
  VIEWS.forEach(x => { $("v-" + x).hidden = x !== view; });
  document.querySelectorAll("nav.tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.v === (view === "instr" ? "marked" : view) ? "page" : "false"));
  $("tape").parentElement.hidden = view !== "radar";
  destroyChart(); destroyTraining();
  if (view === "marked") renderMarket();
  if (view === "instr") renderInstrument(arg);
  if (view === "portefolje") renderPortfolio();
  if (view === "trening") renderTraining();
  if (view === "skole") renderSchool();
  if (view === "innstillinger") renderSettings();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

document.querySelector(".brand").insertAdjacentHTML("beforeend", `<button class="sync" id="sync" type="button" title="Synk-status"><b>●</b> ${esc(S.sync.msg)}</button>`);
$("sync").onclick = () => { location.hash = "innstillinger"; };
initMarket();
await Promise.all([loadAll(), pull()]);
route();
if (await applyOrders()) route();
setInterval(async () => { await loadAll(); if (!$("v-marked").hidden) renderMarket(); }, 10 * 60 * 1000);
