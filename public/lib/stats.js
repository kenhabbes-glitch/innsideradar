// Statistikk for fond og makro: avkastning, volatilitet, fall fra topp og korrelasjon.

// Annualisert avkastning over de siste `years` årene (null hvis for kort historikk)
export function annualized(bars, years) {
  if (!bars.length) return null;
  const end = bars[bars.length - 1];
  const target = new Date(new Date(end.t) - years * 365.25 * 864e5).toISOString().slice(0, 10);
  const start = bars.find(b => b.t >= target);
  if (!start || (new Date(end.t) - new Date(start.t)) / 864e5 < years * 365 - 20) return null;
  const yrs = (new Date(end.t) - new Date(start.t)) / (365.25 * 864e5);
  return Math.pow(end.c / start.c, 1 / yrs) - 1;
}
export function volatility(bars, days = 756) {
  const c = bars.slice(-days).map(b => b.c);
  const r = c.slice(1).map((v, i) => Math.log(v / c[i]));
  if (r.length < 20) return null;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  return Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1) * 252);
}
export function maxDrawdown(bars, days = 1260) {
  let peak = -Infinity, dd = 0;
  for (const b of bars.slice(-days)) { peak = Math.max(peak, b.c); dd = Math.min(dd, b.c / peak - 1); }
  return dd;
}
// Ukentlige endringer fra en serie [[dato, verdi]] → Map(ukenøkkel → endring)
export function weekly(series) {
  const byWeek = new Map();
  for (const [d, v] of series) byWeek.set(weekKey(d), v);
  const keys = [...byWeek.keys()].sort();
  const out = new Map();
  keys.forEach((k, i) => { if (i) out.set(k, byWeek.get(k) / byWeek.get(keys[i - 1]) - 1); });
  return out;
}
export function correlation(a, b) {
  const ks = [...a.keys()].filter(k => b.has(k));
  if (ks.length < 12) return null;
  const x = ks.map(k => a.get(k)), y = ks.map(k => b.get(k));
  const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}
export function weekKey(d) {
  const t = new Date(d + "T12:00:00Z");
  const day = (t.getUTCDay() + 6) % 7;
  const thu = new Date(t - day * 864e5 + 3 * 864e5);
  const jan1 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
  return thu.getUTCFullYear() + "-" + String(Math.ceil(((thu - jan1) / 864e5 + 1) / 7)).padStart(2, "0");
}
