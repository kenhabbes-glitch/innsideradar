// Hvor appen henter data fra.
// Dataene ligger i GitHub-repoet og leses direkte derfra, slik at Netlify ikke trenger
// å publisere på nytt hver gang tallene oppdateres (hver publisering koster credits).
// Endre REPO hvis repoet får et annet navn eller ligger under en annen bruker.
(function () {
  var REPO = "kenhabbes-glitch/innsideradar";
  var BRANCH = "main";
  var REMOTE = "https://raw.githubusercontent.com/" + REPO + "/" + BRANCH + "/public/data/";
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Henter fra GitHub, og faller tilbake til kopien som ligger i selve Netlify-publiseringen.
  window.irFetch = function (path) {
    var fallback = function () { return fetch("data/" + path); };
    if (local) return fallback();
    return fetch(REMOTE + path).then(function (r) { return r.ok ? r : fallback(); }, fallback);
  };
})();
