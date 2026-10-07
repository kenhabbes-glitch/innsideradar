// Porteføljelogikk som brukes både i appen og i varsel-funksjonen på Netlify.

// Beholdning og kontanter, valgfritt frem til og med en dato (YYYY-MM-DD)
export function book(P, upTo) {
  let cash = P.startCash, realized = 0, fees = 0;
  const pos = {};
  for (const t of P.trades || []) {
    if (upTo && t.d > upTo) break;
    const p = (pos[t.sym] ||= { sym: t.sym, qty: 0, cost: 0, first: t.d });
    if (t.side === "K") { cash -= t.qty * t.price + t.fee; p.cost += t.qty * t.price + t.fee; p.qty += t.qty; }
    else {
      const avg = p.qty ? p.cost / p.qty : 0, proceeds = t.qty * t.price - t.fee;
      cash += proceeds; realized += proceeds - avg * t.qty; p.cost -= avg * t.qty; p.qty -= t.qty;
    }
    fees += t.fee;
  }
  for (const p of Object.values(pos)) if (p.qty < 1e-6) { p.qty = 0; p.cost = 0; }
  return { cash, pos, realized, fees };
}

export const activeOrders = P => Object.entries(P.orders || {}).filter(([, o]) => o && !o.del && (o.stop || o.target));

// Sjekker stop-loss og kursmål mot dagskursene siden ordren ble lagt inn.
// Returnerer nye automatiske salg. id er deterministisk, så to enheter lager samme handel.
export function runOrders(P, barsFor, feeFn) {
  const out = [];
  const b = book(P);
  for (const [sym, o] of activeOrders(P)) {
    const qty = b.pos[sym]?.qty || 0;
    if (!qty || (P.trades || []).some(t => t.id === `auto-${sym}-${o.t}`)) continue;
    const bars = (barsFor(sym) || []).filter(x => x.t > o.d);
    for (const bar of bars) {
      let px = null, why = null;
      if (o.stop && bar.l <= o.stop) { px = Math.min(bar.o, o.stop); why = `Stop-loss utløst på ${fmt(o.stop)}`; }
      else if (o.target && bar.h >= o.target) { px = Math.max(bar.o, o.target); why = `Kursmål nådd på ${fmt(o.target)}`; }
      if (px != null) {
        const val = qty * px;
        out.push({ id: `auto-${sym}-${o.t}`, t: bar.t + "T16:30:00.000Z", d: bar.t, sym, navn: o.navn, type: o.type, side: "S", qty, price: px, fee: feeFn(val, o.type), tags: [o.stop && bar.l <= o.stop ? "Stop-loss" : "Ta gevinst"], why, auto: true, sig: [] });
        break;
      }
    }
  }
  return out;
}
const fmt = v => new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 }).format(v);
