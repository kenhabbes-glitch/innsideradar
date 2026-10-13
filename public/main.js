import { $, S, AUTH, esc, loadAll, pull, push, applyOrders, accessToken, saveSession, clearSession, loadLocal, toast } from "./core.js";
import { renderMarket, initMarket } from "./views/market.js";
import { renderInstrument, destroyChart } from "./views/instrument.js";
import { renderPortfolio } from "./views/portfolio.js";
import { renderGroup } from "./views/group.js";
import { renderTraining, destroyTraining } from "./views/training.js";
import { renderSchool } from "./views/school.js";
import { renderSettings } from "./views/settings.js";

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

const VIEWS = ["radar", "marked", "instr", "portefolje", "gruppe", "trening", "skole", "innstillinger"];
let started = false;
function route() {
  if (!AUTH.user) return;
  const h = decodeURIComponent(location.hash.slice(1) || "radar");
  const [v, arg] = h.split("/");
  const view = v === "aksje" ? "instr" : VIEWS.includes(v) ? v : "radar";
  VIEWS.forEach(x => { $("v-" + x).hidden = x !== view; });
  const tab = view === "instr" ? "marked" : view === "skole" ? "trening" : view;
  document.querySelectorAll("nav.tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.v === tab ? "page" : "false"));
  $("learnnav").hidden = !(view === "trening" || view === "skole");
  document.querySelectorAll("#learnnav a").forEach(a => a.setAttribute("aria-current", a.dataset.v === view ? "page" : "false"));
  $("tape").parentElement.hidden = view !== "radar";
  destroyChart(); destroyTraining();
  if (view === "marked") renderMarket();
  if (view === "instr") renderInstrument(arg);
  if (view === "portefolje") renderPortfolio();
  if (view === "gruppe") renderGroup();
  if (view === "trening") renderTraining();
  if (view === "skole") renderSchool();
  if (view === "innstillinger") renderSettings();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

// ---------- innlogging ----------
const ID = "/.netlify/identity";
const views = () => document.querySelectorAll("section.view, #learnnav");
function lock(on) {
  document.body.classList.toggle("locked", on);
  $("login").hidden = !on;
  if (on) views().forEach(v => { v.hidden = true; });
}
function loginMsg(text, ok) { const m = $("loginMsg"); m.hidden = !text; m.textContent = text || ""; m.className = "msg " + (ok ? "ok" : text ? "err" : ""); }
function loginMode(mode) {
  $("loginForm").hidden = mode !== "login"; $("setPwForm").hidden = mode !== "setpw"; $("forgotForm").hidden = mode !== "forgot";
  $("loginTitle").textContent = mode === "setpw" ? "Velg passord" : mode === "forgot" ? "Glemt passord" : "Logg inn";
  $("loginIntro").textContent = mode === "setpw" ? "Lag et passord du skal bruke når du logger inn i Innsideradar."
    : mode === "forgot" ? "Skriv inn e-postadressen din, så sender vi en lenke for å lage nytt passord."
    : "Innsideradar er bare for inviterte. Logg inn med e-postadressen du ble invitert med.";
}
function showLogin(msg, ok) { loginMode("login"); loginMsg(msg || "", ok); lock(true); }
async function idErr(r, fallback) {
  try {
    const j = await r.json(); const m = j.error_description || j.msg || j.error || "";
    if (/user not found/i.test(m)) return "Lenken er ikke gyldig lenger. Be om en ny invitasjon og bruk lenken i den nyeste e-posten.";
    if (/email not confirmed/i.test(m)) return "Du har ikke akseptert invitasjonen ennå. Bruk lenken i e-posten for å lage passord.";
    if (/invalid.*(grant|credentials)|no user found/i.test(m)) return "Feil e-post eller passord.";
    if (/expired|invalid/i.test(m) && /token/i.test(m)) return "Lenken er utløpt eller allerede brukt. Be om en ny.";
    return m || fallback;
  } catch { return fallback; }
}
let setPwAction = null;
// Lenker fra e-post: #invite_token=…, #recovery_token=…, #confirmation_token=…
async function handleAuthHash() {
  const h = new Map(location.hash.replace(/^#/, "").split("&").filter(Boolean).map(kv => { const i = kv.indexOf("="); return i < 0 ? [kv, ""] : [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))]; }));
  const clear = () => history.replaceState(null, "", location.pathname + location.search);
  if (h.get("error_description")) { clear(); showLogin(h.get("error_description").replace(/\+/g, " ")); return true; }
  const invite = h.get("invite_token"), recovery = h.get("recovery_token"), confirm = h.get("confirmation_token");
  if (invite) {
    clear(); loginMode("setpw"); loginMsg("Velkommen! Lag et passord for å ta i bruk appen.", true); lock(true);
    setPwAction = async pw => {
      const r = await fetch(ID + "/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: invite, type: "signup", password: pw }) });
      if (!r.ok) throw new Error(await idErr(r, "Invitasjonen kunne ikke aksepteres."));
      saveSession(await r.json());
    };
    return true;
  }
  if (recovery) {
    clear();
    const r = await fetch(ID + "/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: recovery, type: "recovery" }) });
    if (!r.ok) { showLogin(await idErr(r, "Lenken virker ikke lenger. Be om en ny.")); return true; }
    saveSession(await r.json());
    loginMode("setpw"); loginMsg("Lag et nytt passord.", true); lock(true);
    setPwAction = async pw => {
      const u = await fetch(ID + "/user", { method: "PUT", headers: { "content-type": "application/json", Authorization: "Bearer " + await accessToken() }, body: JSON.stringify({ password: pw }) });
      if (!u.ok) throw new Error(await idErr(u, "Passordet kunne ikke lagres."));
    };
    return true;
  }
  if (confirm) {
    clear();
    const r = await fetch(ID + "/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: confirm, type: "signup" }) });
    if (r.ok) saveSession(await r.json()); else { showLogin(await idErr(r, "Bekreftelsen feilet.")); return true; }
  }
  return false;
}
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("loginEmail").value.trim(), pw = $("loginPw").value;
  const b = $("loginBtn"); b.disabled = true; b.textContent = "Logger inn …";
  try {
    const r = await fetch(ID + "/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "password", username: email, password: pw }) });
    if (!r.ok) throw new Error(await idErr(r, "Innloggingen feilet."));
    saveSession(await r.json()); $("loginPw").value = ""; loginMsg("");
    await start();
  } catch (err) { loginMsg(err.message); }
  finally { b.disabled = false; b.textContent = "Logg inn"; }
});
$("setPwForm").addEventListener("submit", async e => {
  e.preventDefault();
  const a = $("newPw").value, b2 = $("newPw2").value;
  if (a.length < 8) { loginMsg("Passordet må ha minst 8 tegn."); return; }
  if (a !== b2) { loginMsg("Passordene er ikke like."); return; }
  const b = $("setPwBtn"); b.disabled = true; b.textContent = "Lagrer …";
  try { await setPwAction(a); $("newPw").value = $("newPw2").value = ""; setPwAction = null; toast("Passordet er lagret"); await start(); }
  catch (err) { loginMsg(err.message); }
  finally { b.disabled = false; b.textContent = "Lagre passord"; }
});
$("showForgot").onclick = () => { $("forgotEmail").value = $("loginEmail").value; loginMode("forgot"); loginMsg(""); };
$("backToLogin").onclick = () => { loginMode("login"); loginMsg(""); };
$("forgotForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await fetch(ID + "/recover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: $("forgotEmail").value.trim() }) });
    loginMode("login"); loginMsg("Hvis adressen har tilgang, får du en e-post med lenke for nytt passord.", true);
  } catch { loginMsg("Kunne ikke sende e-post. Prøv igjen."); }
});
window.addEventListener("ir-logout", () => showLogin("Du er logget ut."));

// ---------- oppstart ----------
async function start() {
  const tok = await accessToken();
  if (!tok) return showLogin();
  let h = null;
  try { h = await fetch("/api/health", { headers: { Authorization: "Bearer " + tok } }).then(r => r.json()); } catch { /* offline */ }
  if (!h?.user) { clearSession(); return showLogin(h ? "Logg inn på nytt." : "Får ikke kontakt med serveren. Sjekk nettet."); }
  AUTH.user = h.user; AUTH.admin = !!h.admin;
  loadLocal();
  lock(false);
  if (!started) {
    started = true;
    document.querySelector(".brand").insertAdjacentHTML("beforeend", `<button class="sync" id="sync" type="button" title="Synk-status"><b>●</b> ${esc(S.sync.msg)}</button>`);
    $("sync").onclick = () => { location.hash = "innstillinger"; };
    initMarket();
    setInterval(async () => { await loadAll(); if (!$("v-marked").hidden) renderMarket(); }, 10 * 60 * 1000);
  }
  await Promise.all([loadAll(), pull()]);
  route();
  if (await applyOrders()) route();
  push(); // oppdaterer plassen på topplisten
}

if (!(await handleAuthHash())) await start();
