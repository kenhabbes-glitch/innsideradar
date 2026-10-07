// Liten canvas-graf for candlesticks, linjer, volum og RSI. Ingen eksterne biblioteker.
import { sma, rsi, detectPatterns, PATTERNS } from "./indicators.js";

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const nf = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const nfv = new Intl.NumberFormat("nb-NO", { notation: "compact", maximumFractionDigits: 1 });

export function createChart(box, opts = {}) {
  const canvas = document.createElement("canvas");
  const tip = document.createElement("div");
  tip.className = "tip";
  box.append(canvas, tip);
  const ctx = canvas.getContext("2d");
  const state = { bars: [], view: [], mode: "candle", show: { s20: true, s50: true, s200: true, vol: true, rsi: true, pat: true }, hover: -1, marks: [] };

  function size() {
    const w = box.clientWidth;
    const h = opts.height || Math.max(320, Math.min(520, Math.round(w * 0.58)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function draw() {
    const { w, h } = size();
    const C = { bg: css("--panel"), line: css("--line"), dim: css("--dim"), fg: css("--fg"), up: css("--up"), dn: css("--down"), amber: css("--amber"), blue: css("--neutral") };
    ctx.clearRect(0, 0, w, h);
    const B = state.view;
    if (!B.length) { ctx.fillStyle = C.dim; ctx.font = "13px system-ui"; ctx.fillText("Ingen kursdata ennå.", 16, 40); return; }

    const padR = 62, padL = 8, padT = 30;
    const rsiH = state.show.rsi ? Math.round(h * 0.18) : 0;
    const gap = state.show.rsi ? 18 : 0;
    const mainH = h - padT - rsiH - gap - 22;
    const volH = state.show.vol ? mainH * 0.2 : 0;
    const plotW = w - padL - padR;
    const n = B.length;
    const step = plotW / n;
    const bw = Math.max(1, Math.min(14, step * 0.68));
    const x = i => padL + step * i + step / 2;

    const k0 = state.bars.length - n;
    const lines = [
      ["s20", state.s20, C.blue], ["s50", state.s50, C.amber], ["s200", state.s200, "#b07cff"],
    ].filter(l => state.show[l[0]]);
    let lo = Infinity, hi = -Infinity;
    B.forEach((b, i) => {
      lo = Math.min(lo, state.mode === "candle" ? b.l : b.c); hi = Math.max(hi, state.mode === "candle" ? b.h : b.c);
      for (const l of lines) { const v = l[1][k0 + i]; if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    });
    const padP = (hi - lo) * 0.06 || hi * 0.02;
    lo -= padP; hi += padP;
    const y = p => padT + (hi - p) / (hi - lo) * mainH;

    // rutenett og akse
    ctx.font = "11px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    const ticks = niceTicks(lo, hi, 5);
    for (const t of ticks) {
      const yy = Math.round(y(t)) + 0.5;
      ctx.strokeStyle = C.line; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.dim; ctx.fillText(nf.format(t), w - padR + 8, yy);
    }
    // fremtid i blindtest
    if (state.split != null) {
      const si = state.split - k0;
      if (si >= 0 && si < n) {
        const xs = padL + step * (si + 1);
        ctx.fillStyle = C.amber; ctx.globalAlpha = 0.06; ctx.fillRect(xs, padT, w - padR - xs, mainH); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.amber; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(xs, padT); ctx.lineTo(xs, padT + mainH); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // datoer
    ctx.textBaseline = "top";
    const every = Math.max(1, Math.round(n / Math.max(3, Math.floor(plotW / 90))));
    let lastMonth = "";
    for (let i = 0; i < n && !state.hideDates; i += every) {
      const t = B[i].t, lab = n > 130 ? monthName(t) + " " + t.slice(2, 4) : t.slice(8, 10) + "." + t.slice(5, 7);
      if (lab === lastMonth) continue; lastMonth = lab;
      ctx.fillStyle = C.dim; ctx.fillText(lab, Math.min(x(i) - 14, w - padR - 40), padT + mainH + 6);
    }

    // volum
    if (state.show.vol) {
      const mv = Math.max(...B.map(b => b.v || 0)) || 1;
      B.forEach((b, i) => {
        const vh = (b.v || 0) / mv * volH;
        ctx.fillStyle = b.c >= b.o ? C.up : C.dn; ctx.globalAlpha = 0.22;
        ctx.fillRect(x(i) - bw / 2, padT + mainH - vh, bw, vh);
      });
      ctx.globalAlpha = 1;
    }

    // kurs
    if (state.mode === "candle") {
      B.forEach((b, i) => {
        const up = b.c >= b.o, col = up ? C.up : C.dn;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
        const xx = Math.round(x(i)) + 0.5;
        ctx.beginPath(); ctx.moveTo(xx, y(b.h)); ctx.lineTo(xx, y(b.l)); ctx.stroke();
        const top = y(Math.max(b.o, b.c)), bot = y(Math.min(b.o, b.c));
        const hgt = Math.max(1, bot - top);
        if (up && bw > 4) { ctx.fillStyle = C.bg; ctx.fillRect(xx - bw / 2, top, bw, hgt); ctx.strokeRect(xx - bw / 2, top, bw, hgt); }
        else ctx.fillRect(xx - bw / 2, top, bw, hgt);
      });
    } else {
      ctx.beginPath();
      B.forEach((b, i) => (i ? ctx.lineTo(x(i), y(b.c)) : ctx.moveTo(x(i), y(b.c))));
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.lineTo(x(n - 1), padT + mainH); ctx.lineTo(x(0), padT + mainH); ctx.closePath();
      ctx.fillStyle = C.amber; ctx.globalAlpha = 0.08; ctx.fill(); ctx.globalAlpha = 1;
    }

    // glidende snitt
    for (const [, arr, col] of lines) {
      ctx.beginPath(); let started = false;
      B.forEach((_, i) => { const v = arr[k0 + i]; if (v == null) return; if (!started) { ctx.moveTo(x(i), y(v)); started = true; } else ctx.lineTo(x(i), y(v)); });
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
    }

    // mønstre
    if (state.show.pat && state.mode === "candle") {
      ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.font = "bold 10px ui-monospace, monospace";
      for (const p of state.pats) {
        const i = p.i - k0; if (i < 0 || i >= n) continue;
        const P = PATTERNS[p.key], b = B[i];
        const col = P.retning === "opp" ? C.up : P.retning === "ned" ? C.dn : C.blue;
        const yy = P.retning === "ned" ? y(b.h) - 10 : y(b.l) + 10;
        ctx.fillStyle = col; ctx.fillText(P.retning === "ned" ? "▼" : P.retning === "opp" ? "▲" : "◆", x(i), yy);
      }
      ctx.textAlign = "left";
    }

    // handler (markører fra porteføljen)
    for (const m of state.marks) {
      const i = B.findIndex(b => b.t === m.t); if (i < 0) continue;
      ctx.fillStyle = m.side === "K" ? C.up : C.dn;
      ctx.beginPath(); ctx.arc(x(i), y(m.price), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // siste kurs
    const lastC = B[n - 1].c, ly = y(lastC);
    ctx.fillStyle = C.amber; ctx.fillRect(w - padR + 2, ly - 9, padR - 4, 18);
    ctx.fillStyle = "#1b1200"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.textBaseline = "middle";
    ctx.fillText(nf.format(lastC), w - padR + 6, ly);

    // RSI
    if (state.show.rsi) {
      const top = padT + mainH + 22 + gap - 10, bh = rsiH;
      const ry = v => top + (100 - v) / 100 * bh;
      ctx.fillStyle = C.dn; ctx.globalAlpha = 0.07; ctx.fillRect(padL, ry(100), plotW, ry(70) - ry(100));
      ctx.fillStyle = C.up; ctx.fillRect(padL, ry(30), plotW, ry(0) - ry(30)); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.line;
      for (const lv of [30, 70]) { ctx.beginPath(); ctx.moveTo(padL, ry(lv) + 0.5); ctx.lineTo(w - padR, ry(lv) + 0.5); ctx.stroke(); ctx.fillStyle = C.dim; ctx.font = "10px ui-monospace, monospace"; ctx.fillText(String(lv), w - padR + 8, ry(lv)); }
      ctx.beginPath(); let st = false;
      B.forEach((_, i) => { const v = state.rsi[k0 + i]; if (v == null) return; if (!st) { ctx.moveTo(x(i), ry(v)); st = true; } else ctx.lineTo(x(i), ry(v)); });
      ctx.strokeStyle = C.blue; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = C.dim; ctx.fillText("RSI 14", padL + 4, top + 8);
    }

    // trådkors
    const hv = state.hover;
    if (hv >= 0 && hv < n) {
      ctx.strokeStyle = C.dim; ctx.setLineDash([3, 3]); ctx.beginPath();
      ctx.moveTo(Math.round(x(hv)) + 0.5, padT); ctx.lineTo(Math.round(x(hv)) + 0.5, h - 4); ctx.stroke(); ctx.setLineDash([]);
    }
    const b = B[hv >= 0 && hv < n ? hv : n - 1];
    const ki = (hv >= 0 && hv < n ? hv : n - 1) + k0;
    const chg = ki > 0 ? (b.c / state.bars[ki - 1].c - 1) * 100 : 0;
    const pat = state.pats.filter(p => p.i === ki).map(p => PATTERNS[p.key].navn).join(", ");
    tip.innerHTML = `<span>${state.hideDates ? "Dag " + (ki + 1) : b.t.split("-").reverse().join(".")}</span>` +
      (state.mode === "candle" ? `<span>Å <b>${nf.format(b.o)}</b></span><span>H <b>${nf.format(b.h)}</b></span><span>L <b>${nf.format(b.l)}</b></span>` : "") +
      `<span>S <b>${nf.format(b.c)}</b></span><span style="color:${chg >= 0 ? C.up : C.dn}">${chg >= 0 ? "+" : ""}${nf.format(chg)} %</span>` +
      (b.v ? `<span>Vol <b>${nfv.format(b.v)}</b></span>` : "") + (state.rsi[ki] != null && state.show.rsi ? `<span>RSI <b>${state.rsi[ki].toFixed(0)}</b></span>` : "") +
      (pat ? `<span style="color:${C.amber}">${pat}</span>` : "");
    state.geom = { padL, step, n };
  }

  function idxFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const g = state.geom; if (!g) return -1;
    return Math.max(0, Math.min(g.n - 1, Math.floor((px - g.padL) / g.step)));
  }
  canvas.addEventListener("mousemove", e => { state.hover = idxFromEvent(e); draw(); });
  canvas.addEventListener("mouseleave", () => { state.hover = -1; draw(); });
  canvas.addEventListener("touchmove", e => { state.hover = idxFromEvent(e); draw(); }, { passive: true });
  canvas.addEventListener("touchend", () => { state.hover = -1; draw(); });
  const ro = new ResizeObserver(() => draw());
  ro.observe(box);

  return {
    setData(bars, o = {}) {
      state.bars = bars; state.split = o.split ?? null; state.hideDates = !!o.hideDates;
      const c = bars.map(b => b.c);
      state.s20 = sma(c, 20); state.s50 = sma(c, 50); state.s200 = sma(c, 200); state.rsi = rsi(c, 14);
      state.pats = detectPatterns(bars);
      state.flat = bars.every(b => b.o === b.c && b.h === b.c);
      if (state.flat) state.mode = "line";
      this.setRange(o.range || state.range || 126);
    },
    setRange(days) { state.range = days; state.view = state.bars.slice(-days); draw(); },
    setMode(m) { if (!state.flat) state.mode = m; draw(); },
    toggle(k, v) { state.show[k] = v; draw(); },
    setMarks(m) { state.marks = m; draw(); },
    get flat() { return state.flat; },
    destroy() { ro.disconnect(); },
  };
}

function niceTicks(lo, hi, count) {
  const span = hi - lo, raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(10));
  return out;
}
const MON = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
const monthName = t => MON[+t.slice(5, 7) - 1];

// Enkel linjegraf for porteføljeutvikling
export function lineChart(box, series, opts = {}) {
  box.innerHTML = "";
  const canvas = document.createElement("canvas"); box.append(canvas);
  const ctx = canvas.getContext("2d");
  const draw = () => {
    const w = box.clientWidth, h = opts.height || 220, dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.height = h + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const all = series.flatMap(s => s.data.map(d => d[1]));
    if (!all.length) return;
    let lo = Math.min(...all), hi = Math.max(...all); const p = (hi - lo) * 0.08 || 1; lo -= p; hi += p;
    const n = Math.max(...series.map(s => s.data.length));
    const padR = 56, padT = 10, padB = 22, pw = w - padR - 8;
    const X = i => 8 + (n <= 1 ? pw / 2 : i / (n - 1) * pw), Y = v => padT + (hi - v) / (hi - lo) * (h - padT - padB);
    ctx.font = "11px ui-monospace, monospace"; ctx.textBaseline = "middle";
    for (const t of niceTicks(lo, hi, 4)) { ctx.strokeStyle = css("--line"); ctx.beginPath(); ctx.moveTo(8, Y(t) + .5); ctx.lineTo(w - padR, Y(t) + .5); ctx.stroke(); ctx.fillStyle = css("--dim"); ctx.fillText(opts.fmt ? opts.fmt(t) : String(t), w - padR + 6, Y(t)); }
    if (opts.base != null) { ctx.setLineDash([4, 4]); ctx.strokeStyle = css("--dim"); ctx.beginPath(); ctx.moveTo(8, Y(opts.base)); ctx.lineTo(w - padR, Y(opts.base)); ctx.stroke(); ctx.setLineDash([]); }
    const d0 = series[0].data;
    if (d0.length) { ctx.fillStyle = css("--dim"); ctx.textBaseline = "top"; ctx.fillText(d0[0][0].split("-").reverse().join("."), 8, h - padB + 6); const lt = d0[d0.length - 1][0].split("-").reverse().join("."); ctx.fillText(lt, w - padR - ctx.measureText(lt).width, h - padB + 6); }
    for (const s of series) {
      ctx.beginPath(); s.data.forEach((d, i) => (i ? ctx.lineTo(X(i), Y(d[1])) : ctx.moveTo(X(i), Y(d[1]))));
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; if (s.dash) ctx.setLineDash(s.dash); ctx.stroke(); ctx.setLineDash([]);
      const L = s.data[s.data.length - 1]; if (L) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(s.data.length - 1), Y(L[1]), 3, 0, 7); ctx.fill(); }
    }
  };
  new ResizeObserver(draw).observe(box);
  draw();
}
