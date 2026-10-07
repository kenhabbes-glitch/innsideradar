// Felles tekniske indikatorer og signaler. Brukes både i nettleseren og av GitHub Actions.
// Data-format: bars = [{t:"YYYY-MM-DD", o, h, l, c, v}]

export function sma(vals, n) {
  const out = new Array(vals.length).fill(null);
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
    if (i >= n) sum -= vals[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export function rsi(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= n) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

// ---------- Candlestick-mønstre ----------
// Hvert mønster: key, navn, retning (opp/ned/nøytral) og kort forklaring.
export const PATTERNS = {
  hammer: { navn: "Hammer", retning: "opp", tekst: "Lang nedre veke og liten kropp øverst etter et fall. Selgerne presset kursen ned, men kjøperne tok den tilbake. Kan varsle at fallet stopper." },
  shooting: { navn: "Stjerneskudd", retning: "ned", tekst: "Lang øvre veke og liten kropp nederst etter en oppgang. Kjøperne presset kursen opp, men selgerne tok over. Kan varsle at oppgangen stopper." },
  bullEngulf: { navn: "Bullish engulfing", retning: "opp", tekst: "En grønn kropp som helt «sluker» forrige røde kropp. Kjøperne har tatt kontroll. Sterkere etter et fall og med høyt volum." },
  bearEngulf: { navn: "Bearish engulfing", retning: "ned", tekst: "En rød kropp som helt sluker forrige grønne kropp. Selgerne har tatt kontroll. Sterkere etter en oppgang og med høyt volum." },
  doji: { navn: "Doji", retning: "nøytral", tekst: "Åpning og slutt nesten like. Kjøpere og selgere er i balanse. Etter en lang trend kan det bety at trenden mister kraft." },
  morningStar: { navn: "Morgenstjerne", retning: "opp", tekst: "Tre lys: stort rødt, et lite lys med gap ned, så et stort grønt. Klassisk tegn på bunn etter et fall." },
  eveningStar: { navn: "Kveldsstjerne", retning: "ned", tekst: "Tre lys: stort grønt, et lite lys, så et stort rødt. Klassisk tegn på topp etter en oppgang." },
};

export function detectPatterns(bars) {
  const res = [];
  const c = bars.map(b => b.c);
  const trend = i => (i >= 5 ? (c[i - 1] - c[i - 5]) / c[i - 5] : 0); // kortsiktig trend før lyset
  for (let i = 2; i < bars.length; i++) {
    const b = bars[i], p = bars[i - 1], pp = bars[i - 2];
    const range = b.h - b.l || 1e-9;
    const body = Math.abs(b.c - b.o);
    const upper = b.h - Math.max(b.o, b.c);
    const lower = Math.min(b.o, b.c) - b.l;
    const pBody = Math.abs(p.c - p.o);
    const tr = trend(i);
    if (body / range < 0.08 && range / b.c > 0.015 && Math.abs(tr) > 0.03) res.push({ i, t: b.t, key: "doji" });
    else if (lower > 2 * body && upper < body * 0.6 && tr < -0.02) res.push({ i, t: b.t, key: "hammer" });
    else if (upper > 2 * body && lower < body * 0.6 && tr > 0.02) res.push({ i, t: b.t, key: "shooting" });
    if (p.c < p.o && b.c > b.o && b.c >= p.o && b.o <= p.c && body > pBody && tr < 0) res.push({ i, t: b.t, key: "bullEngulf" });
    if (p.c > p.o && b.c < b.o && b.o >= p.c && b.c <= p.o && body > pBody && tr > 0) res.push({ i, t: b.t, key: "bearEngulf" });
    const ppBody = Math.abs(pp.c - pp.o);
    if (pp.c < pp.o && ppBody / (pp.h - pp.l || 1e-9) > 0.6 && pBody < ppBody * 0.35 && b.c > b.o && b.c > (pp.o + pp.c) / 2) res.push({ i, t: b.t, key: "morningStar" });
    if (pp.c > pp.o && ppBody / (pp.h - pp.l || 1e-9) > 0.6 && pBody < ppBody * 0.35 && b.c < b.o && b.c < (pp.o + pp.c) / 2) res.push({ i, t: b.t, key: "eveningStar" });
  }
  return res;
}

// ---------- Signaler ----------
// Returnerer en liste med {key, tone:"opp"|"ned"|"nøytral", tittel, tekst}
export function signals(bars) {
  const out = [];
  if (!bars || bars.length < 30) return out;
  const c = bars.map(b => b.c), v = bars.map(b => b.v || 0);
  const n = c.length - 1, last = c[n];
  const s20 = sma(c, 20), s50 = sma(c, 50), s200 = sma(c, 200);
  const r = rsi(c, 14);

  if (s200[n] != null && s50[n] != null) {
    if (last > s50[n] && s50[n] > s200[n]) out.push({ key: "trendOpp", tone: "opp", tittel: "Stigende trend", tekst: "Kursen ligger over 50-dagers snitt, og 50-dagers ligger over 200-dagers. Det regnes som en sunn opptrend." });
    else if (last < s50[n] && s50[n] < s200[n]) out.push({ key: "trendNed", tone: "ned", tittel: "Fallende trend", tekst: "Kursen ligger under 50-dagers snitt, og 50-dagers ligger under 200-dagers. Det regnes som en nedtrend." });
    for (let k = Math.max(1, n - 10); k <= n; k++) {
      if (s50[k - 1] != null && s200[k - 1] != null) {
        if (s50[k - 1] <= s200[k - 1] && s50[k] > s200[k]) out.push({ key: "golden", tone: "opp", tittel: "Gyllent kors", tekst: "50-dagers snitt krysset nylig over 200-dagers. Mange tolker det som starten på en lengre oppgang." });
        if (s50[k - 1] >= s200[k - 1] && s50[k] < s200[k]) out.push({ key: "death", tone: "ned", tittel: "Dødskors", tekst: "50-dagers snitt krysset nylig under 200-dagers. Mange tolker det som et svakhetstegn." });
      }
    }
  } else if (s20[n] != null) {
    out.push(last > s20[n]
      ? { key: "over20", tone: "opp", tittel: "Over 20-dagers snitt", tekst: "Kursen ligger over snittet for de siste 20 dagene." }
      : { key: "under20", tone: "ned", tittel: "Under 20-dagers snitt", tekst: "Kursen ligger under snittet for de siste 20 dagene." });
  }
  if (r[n] != null) {
    if (r[n] >= 70) out.push({ key: "rsiHøy", tone: "ned", tittel: `RSI ${r[n].toFixed(0)}: overkjøpt`, tekst: "RSI over 70 betyr at kursen har steget mye på kort tid. Det kan komme en pause eller rekyl, men sterke aksjer kan holde seg overkjøpt lenge." });
    else if (r[n] <= 30) out.push({ key: "rsiLav", tone: "opp", tittel: `RSI ${r[n].toFixed(0)}: oversolgt`, tekst: "RSI under 30 betyr at kursen har falt mye på kort tid. Det kan komme en rekyl opp, men svake aksjer kan fortsette ned." });
  }
  const v20 = sma(v, 20);
  if (v20[n - 1] && v[n] > 2 * v20[n - 1]) out.push({ key: "volum", tone: "nøytral", tittel: `Volum ${(v[n] / v20[n - 1]).toFixed(1)}× normalt`, tekst: "Uvanlig mye handel. Store bevegelser med høyt volum regnes som mer pålitelige. Sjekk om det har kommet en børsmelding." });
  const look = c.slice(-252);
  const hi = Math.max(...look), lo = Math.min(...look);
  if (last >= hi * 0.98) out.push({ key: "toppår", tone: "opp", tittel: "Nær årshøyeste", tekst: "Kursen er innenfor 2 % av høyeste nivå siste år. Aksjer som setter nye toppnivåer har ofte momentum." });
  if (last <= lo * 1.02) out.push({ key: "bunnår", tone: "ned", tittel: "Nær årslaveste", tekst: "Kursen er innenfor 2 % av laveste nivå siste år. Vær forsiktig med å «ta imot en fallende kniv»." });
  const pats = detectPatterns(bars).filter(p => p.i >= n - 2);
  for (const p of pats) {
    const P = PATTERNS[p.key];
    out.push({ key: "mønster-" + p.key, tone: P.retning, tittel: `${P.navn} (${p.t.slice(8, 10)}.${p.t.slice(5, 7)})`, tekst: P.tekst });
  }
  return out;
}

export function summary(bars) {
  if (!bars || !bars.length) return null;
  const c = bars.map(b => b.c), n = c.length - 1;
  const r = rsi(c, 14);
  const ret = d => (n - d >= 0 ? c[n] / c[n - d] - 1 : null);
  return {
    last: c[n], prev: n > 0 ? c[n - 1] : null, d: bars[n].t,
    chg1: n > 0 ? c[n] / c[n - 1] - 1 : null, chg5: ret(5), chg21: ret(21), chg252: ret(Math.min(252, n)),
    rsi: r[n], hi: Math.max(...c.slice(-252)), lo: Math.min(...c.slice(-252)),
    sig: signals(bars).map(s => [s.tone, s.tittel, s.key]),
  };
}
