import { $, S, esc, kr, DEF, commit, pull, push, setPin, toast } from "../core.js";

export function renderSettings() {
  const P = S.P;
  const box = $("v-innstillinger");
  const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  box.innerHTML = `
    <section class="panel"><div class="ph"><h2><em>⚙</em>Synk mellom PC og mobil</h2><span class="src" id="syncinfo">${esc(S.sync.msg)}</span></div>
      <div class="pad"><p class="note" style="margin:0">Skriv inn samme PIN som du har lagt inn som <b>APP_PIN</b> i Netlify. Bruk samme PIN på alle enheter, så deler de porteføljen.</p>
      <div class="settings"><div class="field"><label for="pin">PIN</label><input id="pin" type="password" autocomplete="off" value="${esc(S.pin)}"></div>
      <button class="go" id="savepin" type="button">Lagre og synk</button></div></div></section>
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

  $("savepin").onclick = async () => { setPin($("pin").value.trim()); await pull(); await push(); $("syncinfo").textContent = S.sync.msg; };
  $("savefee").onclick = () => { P.fee = { pct: Math.max(0, +$("fp").value / 100), min: Math.max(0, +$("fm").value) }; commit(); toast("Kurtasje lagret"); };
  $("reset").onclick = () => {
    $("rconf").innerHTML = `<div class="confirm"><b>Slette alle fiktive handler og starte med ${kr(+$("sc").value)}?</b><span class="note">Journalen, ordrene og vurderingene forsvinner også. Quiz- og blindtestresultater beholdes. Gjelder alle enheter som synker.</span><div class="row"><button class="go danger" id="rok" type="button">Ja, start på nytt</button><button class="go ghost" id="rno" type="button">Avbryt</button></div></div>`;
    $("rno").onclick = () => { $("rconf").innerHTML = ""; };
    $("rok").onclick = () => {
      const keep = { fee: S.P.fee, practice: S.P.practice, quiz: S.P.quiz, watch: S.P.watch };
      S.P = Object.assign(DEF(), keep, { startCash: Math.max(1000, +$("sc").value || 100000) });
      commit(); $("rconf").innerHTML = `<div class="msg ok">Ny start med ${kr(S.P.startCash)}.</div>`;
    };
  };
  $("pushon").onclick = enablePush;
  $("pushtest").onclick = async () => {
    const r = await fetch("/api/push?test=1", { method: "POST", headers: { "x-pin": S.pin, "content-type": "application/json" }, body: "{}" }).catch(() => null);
    toast(r?.ok ? "Testvarsel sendt" : "Fikk ikke sendt. Har du slått på varsler og lagt inn PIN?");
  };
}

async function enablePush() {
  if (!S.pin) { toast("Legg inn PIN først, så varslene vet hvilken portefølje de gjelder"); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { $("pushinfo").textContent = "Avslått i nettleseren"; return; }
    const { publicKey } = await fetch("/api/push", { headers: { "x-pin": S.pin } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
    const r = await fetch("/api/push", { method: "POST", headers: { "x-pin": S.pin, "content-type": "application/json" }, body: JSON.stringify(sub) });
    if (!r.ok) throw new Error(r.status);
    $("pushinfo").textContent = "På for denne enheten";
    toast("Varsler er slått på");
  } catch (e) { $("pushinfo").textContent = "Klarte ikke å slå på (" + e.message + ")"; }
}
function b64(s) {
  const p = "=".repeat((4 - (s.length % 4)) % 4), raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
