// Slår sammen to versjoner av porteføljen (f.eks. fra PC og mobil).
// Handler slås sammen på id. Nyeste nullstilling vinner. Følgeliste: nyeste endring per symbol vinner.
export function merge(a, b) {
  if (!a) return b;
  if (!b) return a;
  if ((b.resetAt || "") > (a.resetAt || "")) return b;
  if ((a.resetAt || "") > (b.resetAt || "")) return a;
  const byId = new Map();
  for (const t of [...(a.trades || []), ...(b.trades || [])]) byId.set(t.id, { ...(byId.get(t.id) || {}), ...t });
  const trades = [...byId.values()].sort((x, y) => (x.t < y.t ? -1 : 1));
  const watch = { ...(a.watch || {}) };
  for (const [k, v] of Object.entries(b.watch || {})) if (!watch[k] || (v.t || "") > (watch[k].t || "")) watch[k] = v;
  const orders = { ...(a.orders || {}) };
  for (const [k, v] of Object.entries(b.orders || {})) if (!orders[k] || (v.t || "") > (orders[k].t || "")) orders[k] = v;
  const newer = (b.updated || "") >= (a.updated || "") ? b : a;
  return { ...newer, trades, watch, orders, practice: mergePractice(a.practice, b.practice), quiz: { ...(a.quiz || {}), ...(b.quiz || {}) } };
}
function mergePractice(a, b) {
  const m = new Map();
  for (const r of [...(a?.log || []), ...(b?.log || [])]) m.set(r.id, r);
  return { log: [...m.values()].sort((x, y) => (x.t < y.t ? -1 : 1)).slice(-500) };
}
