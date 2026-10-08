// Enkel offline-støtte: appskall caches, data hentes alltid ferskt når nett finnes.
const C = "innsideradar-v4";
const SHELL = ["/", "/index.html", "/datasource.js", "/radar.js", "/main.js", "/core.js", "/views/market.js", "/views/instrument.js", "/views/portfolio.js", "/views/training.js", "/views/school.js", "/views/settings.js", "/lib/indicators.js", "/lib/chart.js", "/lib/lessons.js", "/lib/merge.js", "/lib/stats.js", "/lib/portfolio.js", "/lib/alerts.js", "/manifest.webmanifest", "/icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Innsideradar", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ("focus" in w) { w.navigate(url); return w.focus(); }
    return clients.openWindow(url);
  }));
});
