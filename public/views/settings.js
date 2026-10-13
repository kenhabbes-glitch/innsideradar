import { $, S, AUTH, esc, kr, DEF, commit, toast, api, clearSession } from "../core.js";

export async function renderSettings() {
  const P = S.P;
  const box = $("v-innstillinger");
  const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  box.innerHTML = `
    <section class="panel"><div class="ph"><h2><em>◉</em>Deg</h2><span class="src">${esc(AUTH.user || "")}${AUTH.admin ? " · admin" : ""}</span></div>
      <div class="pad">
        <div class="settings"><div class="field"><label for="pnavn">Navn i gruppen</label><input id="pnavn" type="text" maxlength="30" autocomplete="nickname"></div>
          <button class="go ghost" id="saveprof" type="button">Lagre</button></div>
        <label class="tog"><input type="checkbox" id="ptop"> Vis meg på topplisten (navn, avkastning og antall handler)</label>
        <label class="tog"><input type="checkbox" id="pfeed"> Del handlene mine og begrunnelsene i gruppens feed</label>
        <p class="note" style="margin:0">Ingen ser porteføljen din i detalj. Slår du av deling, ser du fortsatt deg selv, men ikke de andre ser deg.</p>
        <div class="row"><span class="note" id="syncinfo">${esc(S.sync.msg)}</span><button class="go ghost" id="logout" type="button">Logg ut</button></div>
      </div></section>

    ${AUTH.admin ? `<section class="panel"><div class="ph"><h2><em>✉</em>Brukere</h2><span class="src">Bare inviterte kommer inn</span></div>
      <div class="pad">
        <form id="inviteForm" class="settings"><div class="field"><label for="inviteEmail">Inviter med e-post</label><input id="inviteEmail" type="email" autocomplete="off" placeholder="navn@eksempel.no"></div>
          <button class="go" id="inviteBtn" type="submit">Send invitasjon</button></form>
        <p class="note" style="margin:0">Den inviterte får en e-post fra Netlify, trykker på lenken, velger passord og er inne. Hver bruker får sin egen portefølje.</p>
        <div id="userList" class="users"><div class="note">Henter brukere …</div></div>
      </div></section>` : ""}

    <section class="panel"><div class="ph"><h2><em>!</em>Push-varsler</h2><span class="src" id="pushinfo">${pushOk ? (Notification.permission === "granted" ? "Tillatt på denne enheten" : "Av") : "Ikke støttet her"}</span></div>
      <div class="pad"><p class="note" style="margin:0">Få varsel på telefonen når noe skjer med aksjer du eier eller følger: viktige signaler, innsidehandel, økt short, kvartalsrapporter og når kursen nærmer seg stop-loss eller kursmål. Sjekkes hver time. På iPhone må appen først legges til på Hjem-skjermen.</p>
      <div class="row"><button class="go" id="pushon" type="button" ${pushOk ? "" : "disabled"}>Slå på varsler på denne enheten</button><button class="go ghost" id="pushtest" type="button" ${pushOk ? "" : "disabled"}>Send testvarsel</button></div></div></section>

    <section class="panel"><div class="ph"><h2><em>⚙</em>Kurtasje og startkapital</h2></div>
      <div class="pad"><div class="settings">
        <div class="field"><label for="fp">Kurtasje (%)</label><input id="fp" type="number" step="0.01" value="${(P.fee.pct * 100).toFixed(2)}"></div>
        <div class="field"><label for="fm">Minste kurtasje (kr)</label><input id="fm" type="number" step="1" value="${P.fee.min}"></div>
        <button class="go ghost" id="savefee" type="button">Lagre kurtasje</button></div>
      <div class="settings"><div class="field"><label for="sc">Startkapital ved ny start (kr)</label><input id="sc" type="number" step="1000" value="${P.startCash}"></div>
        <button class="go danger" id="reset" type="button">Start på nytt</button></div><div id="rconf"></div></div></section>

    <section class="panel"><div class="ph"><h2><em>⬇</em>Installer som app</h2></div><div class="pad"><p class="note" style="margin:0">iPhone: Del-knappen i Safari → «Legg til på Hjem-skjerm». Android: menyen i Chrome → «Installer app». PC: ikonet til høyre i adresselinjen i Chrome eller Edge.</p></div></section>`;

  // profil
  try {
    const { profile } = await api("me/profile");
    AUTH.profile = profile;
    $("pnavn").value = profile.navn; $("ptop").checked = profile.toppliste; $("pfeed").checked = profile.feed;
  } catch { /* offline */ }
  const saveProf = async () => {
    try { const { profile } = await api("me/profile", { method: "POST", json: { navn: $("pnavn").value, toppliste: $("ptop").checked, feed: $("pfeed").checked } }); AUTH.profile = profile; toast("Lagret"); }
    catch (e) { toast(e.message); }
  };
  $("saveprof").onclick = saveProf; $("ptop").onchange = saveProf; $("pfeed").onchange = saveProf;
  $("logout").onclick = async () => {
    const t = (JSON.parse(localStorage.getItem("ir.auth") || "null") || {}).access_token;
    try { if (t) await fetch("/.netlify/identity/logout", { method: "POST", headers: { Authorization: "Bearer " + t } }); } catch { /* uansett */ }
    clearSession(); window.dispatchEvent(new Event("ir-logout"));
  };

  $("savefee").onclick = () => { P.fee = { pct: Math.max(0, +$("fp").value / 100), min: Math.max(0, +$("fm").value) }; commit(); toast("Kurtasje lagret"); };
  $("reset").onclick = () => {
    $("rconf").innerHTML = `<div class="confirm"><b>Slette alle fiktive handler og starte med ${kr(+$("sc").value)}?</b><span class="note">Journalen, ordrene og vurderingene forsvinner også. Quiz- og blindtestresultater beholdes.</span><div class="row"><button class="go danger" id="rok" type="button">Ja, start på nytt</button><button class="go ghost" id="rno" type="button">Avbryt</button></div></div>`;
    $("rno").onclick = () => { $("rconf").innerHTML = ""; };
    $("rok").onclick = () => {
      const keep = { fee: S.P.fee, practice: S.P.practice, quiz: S.P.quiz, watch: S.P.watch, extra: S.P.extra };
      S.P = Object.assign(DEF(), keep, { startCash: Math.max(1000, +$("sc").value || 100000) });
      commit(); $("rconf").innerHTML = `<div class="msg ok">Ny start med ${kr(S.P.startCash)}.</div>`;
    };
  };
  $("pushon").onclick = enablePush;
  $("pushtest").onclick = async () => {
    try { const { sent } = await api("push/test", { method: "POST", json: {} }); toast(sent ? "Testvarsel sendt" : "Ingen enheter har slått på varsler ennå"); }
    catch (e) { toast(e.message); }
  };
  if (AUTH.admin) initAdmin();
}

async function enablePush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { $("pushinfo").textContent = "Avslått i nettleseren"; return; }
    const { publicKey } = await api("push/key");
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
    await api("push/subscribe", { method: "POST", json: { subscription: sub } });
    $("pushinfo").textContent = "På for denne enheten";
    toast("Varsler er slått på");
  } catch (e) { $("pushinfo").textContent = "Klarte ikke å slå på (" + e.message + ")"; }
}
function b64(s) {
  const p = "=".repeat((4 - (s.length % 4)) % 4), raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ---------- admin: brukere (samme flyt som SofaPilot) ----------
const fmt = s => (s ? new Date(s).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" }) : "");
async function loadUsers() {
  const box = $("userList");
  try {
    const { users } = await api("admin/users");
    users.sort((a, b) => (b.me - a.me) || String(a.email).localeCompare(b.email));
    box.innerHTML = users.length ? users.map(u => `
      <div class="urow" data-id="${esc(u.id)}">
        <div class="uinfo"><b>${esc(u.email)}${u.me ? ' <span class="note">(deg)</span>' : ""}</b>
          <small>${u.confirmed_at ? (u.last_sign_in_at ? "Sist innlogget " + fmt(u.last_sign_in_at) : "Aktiv") : "Invitert " + fmt(u.invited_at) + " · har ikke akseptert ennå"}</small></div>
        <div class="uact">
          ${u.admin ? '<span class="badge b-P">ADMIN</span>' : ""}
          ${!u.confirmed_at ? '<button type="button" class="chip" data-act="reinvite">Send ny invitasjon</button>' : ""}
          ${u.me || u.fixedAdmin ? "" : `<button type="button" class="chip" data-act="role" data-admin="${u.admin ? 0 : 1}">${u.admin ? "Fjern admin" : "Gjør til admin"}</button>`}
          ${u.me ? "" : '<button type="button" class="chip danger" data-act="delete">Fjern tilgang</button>'}
        </div></div>`).join("") : '<p class="note">Ingen brukere ennå.</p>';
  } catch (e) { box.innerHTML = `<p class="note">${esc(e.message)}</p>`; }
}
function initAdmin() {
  loadUsers();
  $("inviteForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("inviteEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Skriv inn en gyldig e-postadresse"); return; }
    const b = $("inviteBtn"); b.disabled = true; b.textContent = "Sender …";
    try { await api("admin/invite", { method: "POST", json: { email } }); $("inviteEmail").value = ""; toast(`Invitasjon sendt til ${email}`); loadUsers(); }
    catch (err) { toast(/already|registered|exists/i.test(err.message) ? "Denne adressen er allerede invitert" : err.message); }
    finally { b.disabled = false; b.textContent = "Send invitasjon"; }
  });
  $("userList").addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = b.closest(".urow").dataset.id, act = b.dataset.act;
    if (act === "delete" && !b.dataset.sure) {
      b.dataset.sure = "1"; b.textContent = "Trykk igjen for å fjerne";
      setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = "Fjern tilgang"; } }, 4000);
      return;
    }
    b.disabled = true;
    try {
      if (act === "delete") { await api("admin/delete", { method: "POST", json: { id } }); toast("Tilgangen er fjernet"); }
      if (act === "role") { await api("admin/role", { method: "POST", json: { id, admin: b.dataset.admin === "1" } }); toast(b.dataset.admin === "1" ? "Er nå admin" : "Admin fjernet"); }
      if (act === "reinvite") { await api("admin/reinvite", { method: "POST", json: { id } }); toast("Ny invitasjon sendt"); }
      loadUsers();
    } catch (err) { toast(err.message); b.disabled = false; }
  });
}
