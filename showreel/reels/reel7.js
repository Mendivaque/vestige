/* Reel 7 — "crewupa · dört şekil, otuz gün".
 * One idea, six scenes, slow enough to read. The four roles (yazılımcı, tasarımcı,
 * büyüme, ürün) are four shapes. They snap together into a team, step onto a
 * 30-cell grid and travel it as a group; the hard week pulls them apart, the weekly
 * check-in snaps them back; the last cell zooms into Demo Day; then the same four
 * shapes come home as the crewupa mark.
 *   0.0–2.3s  hook: shapes converge and lock, "Ekibini kur."
 *   2.3–3.8s  flood to dark, "30 günde çık.", the grid blooms
 *   3.8–8.5s  the team crosses 30 days (zor hafta, check-in)
 *   8.5–10.5s Demo Day (zoom match-cut into the last cell)
 *  10.5–12.0s "Fikir şart değil, taahhüt şart."
 *  12.0–15.0s lockup, ~1.4s final hold
 * 96 BPM, 24 beats. Copy and facts are from crewupa.com.
 */
(function () {
  const BPM = 96, SPB = 60 / BPM, B = (b) => b * SPB;
  const E = V.ease, W = V.W, H = V.H, CX = W / 2, CY = H / 2, TAU = V.TAU;
  const C = {
    bg: '#0b0816', bg2: '#141026', bg3: '#1e1b3a', mid: '#5b21b6', v1: '#6d28d9', v2: '#8b5cf6', v3: '#a78bfa', v4: '#c4b5fd',
    lav: '#f1ebff', cream: '#fbf7f2', teal: '#2cc9a8', org: '#f97316', amb: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
  };
  const DISP = 'Unbounded', SANS = 'Geist', MONO = 'Geist Mono';
  const T = { lock: 1.15, txt: 1.7, flood: 3.6, title: 5.0, cells: 4.7, go: 6.0, zorIn: 9.0, ping: 12.0, arrive: 13.6, zoom0: 13.3, demo: 14.0, wipeC: 16.8, wipeP: 19.2 };
  const prog = V.prog, clamp = V.clamp, lerp = V.lerp;
  const en = (b, t0, d = 0.5, e = E.outExpo) => e(prog(b, t0, t0 + d));

  /* ---------------- helpers ---------------- */
  const memo = {};
  const once = (k, fn) => (k in memo ? memo[k] : (memo[k] = fn()));
  const capH = (ctx, fam, w) => once(`cap|${fam}|${w}`, () => { ctx.save(); V.font(ctx, 100, fam, w); const m = ctx.measureText('H').actualBoundingBoxAscent / 100; ctx.restore(); return m; });
  const widthOf = (ctx, s, fam, w) => once(`w|${s}|${fam}|${w}`, () => V.measure(ctx, s, { size: 100, family: fam, weight: w }) / 100);
  const fitSize = (ctx, s, fam, target, w = 800, max = 9999) => Math.min(max, target / widthOf(ctx, s, fam, w));
  const glyphsOf = (ctx, s, fam, size, w = 800, tr = 0) => once(`g|${s}|${fam}|${size.toFixed(1)}|${w}|${tr}`, () => V.glyphs(ctx, s, { size, family: fam, weight: w, tracking: tr }));
  function word(ctx, s, x, y, size, fill, o = {}) {
    const fam = o.fam || DISP, w = o.w || 800;
    ctx.save(); V.font(ctx, size, fam, w);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = (o.tr || 0) + 'px';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillStyle = fill; ctx.fillText(s, x, y + (capH(ctx, fam, w) * size) / 2);
    ctx.restore();
  }
  const mono = (ctx, s, x, y, size, fill, o = {}) => word(ctx, s, x, y, size, fill, Object.assign({ fam: MONO, w: 500, tr: size * 0.12 }, o));
  const body = (ctx, s, x, y, size, fill, o = {}) => word(ctx, s, x, y, size, fill, Object.assign({ fam: SANS, w: 600 }, o));
  function rise(ctx, s, x, y, size, fill, p, o = {}) {
    if (p <= 0.001) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 0.75, W, size * 1.5); ctx.clip();
    word(ctx, s, x, y + (1 - p) * size * 1.15, size, fill, o); ctx.restore();
  }
  const dot = (ctx, x, y, r, col) => { if (r > 0.2) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); } };
  const ring = (ctx, x, y, r, lw, col, a = 1) => { if (a > 0.001 && r > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore(); } };
  const pill = (ctx, x, y, w, h, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); } };
  const wipe = (ctx, b, b0, d, ox, oy, col) => { const p = E.inOutCubic(prog(b, b0, b0 + d)); if (p > 0) dot(ctx, ox, oy, p * 2600, col); };
  const SCR = 'ABCDEF0123456789#/<>*+=';
  const decode = (s, p, seed = 0, tb = 0) => {
    let out = ''; const q = p * 1.3;
    for (let i = 0; i < s.length; i++) { const k = i / s.length; if (q >= k + 0.3 || s[i] === ' ') out += s[i]; else if (q > k) out += SCR[Math.floor(V.hash(i * 7.3 + seed + Math.floor(tb * 30)) * SCR.length)]; }
    return out;
  };

  /* ---------------- the four roles as shapes ---------------- */
  const ROLES = [
    { k: 'sq', c: C.sky, n: 'Yazılımcı' }, { k: 'ci', c: C.pink, n: 'Tasarımcı' },
    { k: 'tr', c: C.teal, n: 'Büyüme' }, { k: 'st', c: C.amb, n: 'Ürün' },
  ];
  function shape(ctx, k, x, y, S, rot, fill, sx = 1, sy = 1, st = null) {
    ctx.save(); ctx.translate(x, y);
    if (st && st.v > 0.01) { ctx.rotate(st.ang); ctx.scale(1 + 0.55 * st.v, 1 - 0.28 * st.v); ctx.rotate(-st.ang); }
    ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineJoin = 'round';
    if (k === 'sq') { ctx.beginPath(); ctx.roundRect(-S / 2, -S / 2, S, S, S * 0.24); ctx.fill(); }
    else if (k === 'ci') { ctx.beginPath(); ctx.arc(0, 0, S / 2, 0, TAU); ctx.fill(); }
    else if (k === 'tr') {
      const r = S * 0.44; ctx.lineWidth = S * 0.18; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * TAU) / 3; const px = Math.cos(a) * r, py = Math.sin(a) * r + r * 0.14; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else { V.star(ctx, 0, 0, S * 0.46, S * 0.22, 5, 0); ctx.lineWidth = S * 0.12; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  // the mark: a 2x2 arrangement of the four shapes
  const MARKO = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const markPos = (i, cx, cy, sc) => [cx + MARKO[i][0] * 130 * sc, cy + MARKO[i][1] * 130 * sc];
  const FROM = [[-700, -500], [1500, -300], [-600, 1500], [1600, 1400]];

  /* ---------------- 30-cell grid, snake path ---------------- */
  const CELL = 130, GAP = 24, GX = 90, GY = 700, PITCH = CELL + GAP;
  const cellXY = (i) => { i = clamp(i, 0, 29); const r = Math.floor(i / 6), c0 = i % 6, c = r % 2 === 0 ? c0 : 5 - c0; return [GX + c * PITCH + CELL / 2, GY + r * PITCH + CELL / 2]; };
  const weekOf = (d) => (d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5);
  const weekCol = (d) => [C.v2, C.v2, C.teal, C.org, C.pink, C.amb][weekOf(d)];
  function pathPos(s) {
    const i = Math.floor(clamp(s, 0, 28.999)), f = clamp(s, 0, 29) - i;
    const a = cellXY(i), c = cellXY(i + 1), sm = f * f * (3 - 2 * f), ef = lerp(f, sm, 0.65);
    return [lerp(a[0], c[0], ef), lerp(a[1], c[1], ef), s <= 0 ? 0 : f];
  }
  // leader position s(b): integral of a smooth speed profile, normalised so s(arrive) = 29
  const SPEED = [[6.0, 0], [6.6, 4.3], [8.6, 4.3], [9.4, 1.8], [11.6, 1.8], [12.0, 0.3], [12.4, 5.4], [13.2, 5.4], [13.6, 2.0]];
  const vraw = (b) => {
    if (b <= SPEED[0][0]) return 0;
    for (let i = 0; i < SPEED.length - 1; i++) { const [b0, v0] = SPEED[i], [b1, v1] = SPEED[i + 1]; if (b < b1) { const p = (b - b0) / (b1 - b0); return lerp(v0, v1, p * p * (3 - 2 * p)); } }
    return 0;
  };
  const integ = (b) => { let s = 0; const h = 0.04; for (let x = T.go; x < Math.min(b, T.arrive); x += h) s += vraw(x + h / 2) * h; return s; };
  let NORM = 0;
  const sLead = (b) => { if (!NORM) NORM = 29 / integ(T.arrive); return integ(b) * NORM; };
  const spacing = (b) => {
    const base = 1.15 * E.outCubic(prog(b, 6.3, 7.6));
    const spread = 1.5 * E.inOutCubic(prog(b, T.zorIn, T.zorIn + 1.2)) * (1 - E.outBack(prog(b, T.ping, T.ping + 0.7), 1.5));
    return base + spread;
  };
  const zorAmt = (b) => V.win(b, T.zorIn, T.ping + 0.2, 0.6, 0.4, E.outCubic, E.inCubic);

  /* =========================================================
     WORLD: hook → title → grid → zoom (b 0 .. 14.05)
     ========================================================= */
  function drawWorld(ctx, t, b) {
    V.bg(ctx, C.v1);
    // ---------- HOOK ----------
    const hookA = 1 - en(b, 3.6, 0.6, E.inOutCubic);
    // big soft circle behind the mark
    dot(ctx, CX, 690, lerp(420, 560, E.outCubic(clamp(b / 2))) + 14 * Math.sin(b * 1.4), C.mid);
    // dark flood from the mark
    const fl = E.inOutExpo(prog(b, T.flood, T.flood + 0.9));
    if (fl > 0) dot(ctx, CX, 690, fl * 2600, C.bg);

    // world transform for the final zoom (+ a slow push-in during the crossing)
    const [px, py] = cellXY(29);
    const push = 1 + 0.03 * E.inOutSine(prog(b, 6.0, 13.6));
    const kz = 1 + E.inExpo(prog(b, T.zoom0, T.demo + 0.05)) * 40;
    ctx.save();
    ctx.translate(px, py); ctx.scale(push * kz, push * kz); ctx.translate(-px, -py);

    // ---------- GRID ----------
    const s0 = sLead(b);
    const hasGrid = b > T.cells - 0.1;
    if (hasGrid) {
      for (let i = 0; i < 30; i++) {
        const [x, y] = cellXY(i), r = Math.floor(i / 6), c = (i % 6);
        const pop = E.outBack(prog(b, T.cells + (r + c) * 0.07, T.cells + (r + c) * 0.07 + 0.55), 2.2);
        if (pop <= 0) continue;
        const d = i + 1, wc = weekCol(d);
        const amt = clamp((s0 - i) * 1.4 + 0.55) * (b > T.go - 0.2 ? 1 : 0);
        const bump = Math.max(0, 1 - Math.abs(s0 - i) * 1.3) * (b > T.go ? 1 : 0);
        const warn = (d >= 15 && d <= 21) ? V.win(b, T.zorIn - 0.4, T.ping, 0.6, 0.3) : 0;
        const sc = pop * (1 + 0.1 * bump);
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.beginPath(); ctx.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 32);
        ctx.fillStyle = C.bg2; ctx.fill();
        if (warn > 0 && amt < 1) { ctx.strokeStyle = V.rgba(C.org, 0.35 + 0.35 * Math.sin(b * 6 + i) * warn); ctx.lineWidth = 3; ctx.stroke(); }
        else { ctx.strokeStyle = V.rgba(C.v2, 0.22); ctx.lineWidth = 2; ctx.stroke(); }
        if (amt > 0) { ctx.globalAlpha = amt * 0.95; ctx.fillStyle = i === 29 ? C.amb : wc; ctx.fill(); ctx.globalAlpha = 1; }
        mono(ctx, String(d).padStart(2, '0'), -CELL / 2 + 18, -CELL / 2 + 26, 20, amt > 0.5 ? C.bg : V.rgba(C.lav, 0.4), { align: 'left', w: 700 });
        if (i === 29) { V.star(ctx, 0, 6, 34, 16, 5, 0); ctx.fillStyle = amt > 0.5 ? C.bg : C.amb; ctx.fill(); }
        ctx.restore();
      }
    }

    // ---------- THE FOUR SHAPES ----------
    const teamDraw = [];
    ROLES.forEach((r, i) => {
      let x, y, S, rot = 0, sx = 1, sy = 1, st = null;
      if (b < T.go + 0.05) {
        // hook mark: fly in, lock, then travel to the grid's first cell
        const tt = b + 0.55 - i * 0.12, p = clamp(tt / 1.3), e = E.outBack(p, 1.15);
        const m = markPos(i, CX, 690, 1);
        const flight = 1 - p;
        x = lerp(FROM[i][0], m[0], e); y = lerp(FROM[i][1], m[1], e);
        rot = lerp(i % 2 ? 2.2 : -2.2, 0, E.outCubic(p));
        st = { ang: Math.atan2(m[1] - FROM[i][1], m[0] - FROM[i][0]), v: flight * flight };
        S = 230;
        const lockT = 0.75 + i * 0.12, h = V.hit(t, B(lockT), 0.1) * (b >= lockT ? 1 : 0);
        sx = 1 + 0.28 * h; sy = 1 - 0.22 * h;
        // breathe + tiny float while it holds
        const idle = clamp((b - 1.6) / 0.4);
        y += Math.sin(b * 1.6 + i) * 7 * idle; rot += Math.sin(b * 1.1 + i * 1.7) * 0.04 * idle;
        S *= 1 + 0.02 * Math.sin(b * 2 + i) * idle;
        // hop off to the first cell (staggered, arced)
        const ho = E.inOutCubic(prog(b, 4.2 + i * 0.14, 5.5 + i * 0.14));
        if (ho > 0) {
          const c0 = cellXY(0);
          x = lerp(x, c0[0], ho); y = lerp(y, c0[1], ho) - Math.sin(ho * Math.PI) * 150;
          S = lerp(230, 100, E.outCubic(ho)); rot = lerp(rot, 0, ho); st = null;
        }
        // shapes that flew in a beat ago get their idle bob after they land on cell 0
      } else {
        const sk = s0 - spacing(b) * i, p = pathPos(sk);
        const hop = Math.sin(Math.PI * p[2]) * lerp(34, 12, zorAmt(b));
        x = p[0]; y = p[1] - hop; S = 100;
        const land = Math.pow(Math.max(0, 1 - p[2] * 5), 2);
        sx = 1 + 0.22 * land - 0.06 * Math.sin(Math.PI * p[2]); sy = 1 - 0.26 * land + 0.14 * Math.sin(Math.PI * p[2]);
        rot = 0.28 * Math.sin(b * 7 + i * 1.3) * zorAmt(b) + 0.18 * Math.sin(b * 2 + i);
        if (b > T.ping && b < T.ping + 0.9) sy *= 1 + 0.12 * Math.sin(prog(b, T.ping, T.ping + 0.9) * Math.PI * 3) * (1 - prog(b, T.ping, T.ping + 0.9));
      }
      // amber star on an amber cell needs to stay visible: give the shape a dark edge when it sits on a lit cell
      teamDraw.push({ r, x, y, S, rot, sx, sy, st });
    });
    // draw leader last (on top)
    for (let i = 3; i >= 0; i--) { const d = teamDraw[i]; shape(ctx, d.r.k, d.x, d.y, d.S, d.rot, d.r.c, d.sx, d.sy, d.st); }
    // arrival at day 30: little burst of light from the last cell
    if (b > T.arrive - 0.2) { const p = prog(b, T.arrive - 0.2, T.arrive + 0.4); ring(ctx, px, py, 60 + p * 400, 10 * (1 - p) + 1, C.amb, 1 - p); }
    // check-in ping from the team's centroid
    if (b >= T.ping) {
      const cx = teamDraw.reduce((a, d) => a + d.x, 0) / 4, cy = teamDraw.reduce((a, d) => a + d.y, 0) / 4;
      [0, 0.25].forEach((dl, k) => { const p = prog(b, T.ping + dl, T.ping + dl + 1.1); ring(ctx, cx, cy, 40 + E.outExpo(p) * 520, 9 * (1 - p) + 1.5, k ? C.lav : C.teal, 1 - p); });
    }
    ctx.restore();

    // ---------- HOOK TYPE ----------
    if (hookA > 0.01) {
      ctx.save(); ctx.globalAlpha = hookA;
      const s1 = fitSize(ctx, 'Ekibini', DISP, 820, 900, 170);
      rise(ctx, 'Ekibini', CX, 1100, s1, C.lav, en(b, T.txt, 0.7), { w: 900, tr: -3 });
      // "kur" + an amber full stop that drops in
      const wk = widthOf(ctx, 'kur', DISP, 900) * s1, dr = s1 * 0.085, gap = s1 * 0.05, tot = wk + gap + dr * 2, x0 = CX - tot / 2;
      const yb = 1100 + s1 * 1.08;
      const pk = en(b, T.txt + 0.25, 0.7);
      if (pk > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, yb - s1 * 0.75, W, s1 * 1.5); ctx.clip(); word(ctx, 'kur', x0, yb + (1 - pk) * s1 * 1.15, s1, C.lav, { w: 900, align: 'left', tr: -3 }); ctx.restore(); }
      const dp = prog(b, T.txt + 0.7, T.txt + 1.15), capPx = capH(ctx, DISP, 900) * s1;
      const dyb = yb + capPx / 2 - dr;
      const dy = lerp(yb - 700, dyb, E.outBounce(dp));
      if (dp > 0) { const land = V.hit(t, B(T.txt + 1.05), 0.07) * (dp >= 1 ? 1 : 0); ctx.save(); ctx.translate(x0 + wk + gap + dr, dy); ctx.scale(1 + 0.3 * land, 1 - 0.25 * land); dot(ctx, 0, 0, dr, C.amb); ctx.restore(); }
      mono(ctx, 'SEZON 01 · BAŞVURULAR AÇIK', CX, 322, 24, C.lav, { alpha: en(b, 2.6, 0.5, E.outCubic) });
      ctx.restore();
    }
    // shockwave when the shapes lock
    if (b > 1.0 && b < 3.4) { const p = prog(b, 1.25, 2.6); ring(ctx, CX, 690, 200 + E.outExpo(p) * 900, 12 * (1 - p) + 1, C.lav, (1 - p) * 0.9); }

    // ---------- UI over the grid ----------
    if (b > T.title - 0.2) {
      const dd = clamp(Math.floor(s0) + 1, 1, 30);
      const uiOut = 1 - en(b, T.zoom0 - 0.5, 0.4, E.inCubic);
      ctx.save(); ctx.globalAlpha = uiOut;
      // big title first, then it steps aside for the counter
      const big = en(b, T.title, 0.7), bigOut = 1 - en(b, 6.0, 0.35, E.inCubic);
      const s2 = fitSize(ctx, '30 günde', DISP, 860, 900, 150);
      if (bigOut > 0.01) { ctx.save(); ctx.globalAlpha = bigOut; rise(ctx, '30 günde', 90, 420, s2, C.lav, big, { w: 900, align: 'left', tr: -2 }); rise(ctx, 'çık.', 90, 420 + s2 * 1.05, s2, C.lav, en(b, T.title + 0.2, 0.7), { w: 900, align: 'left', tr: -2 }); ctx.restore(); }
      const small = en(b, 6.3, 0.6);
      if (small > 0) {
        rise(ctx, '30 günde çık.', 90, 360, 58, C.lav, small, { w: 900, align: 'left', tr: -1.5 });
        // counter
        mono(ctx, 'GÜN', 990, 308, 22, C.v4, { align: 'right', alpha: small });
        const pop = 1 + 0.12 * Math.pow(1 - V.fract(Math.max(0, s0)), 4);
        ctx.save(); ctx.translate(990, 440); ctx.scale(pop, pop); ctx.translate(-990, -440);
        word(ctx, String(dd).padStart(2, '0'), 990, 440, 170, C.lav, { w: 900, align: 'right', tr: -5, alpha: small }); ctx.restore();
        mono(ctx, '/30', 990, 545, 28, weekCol(dd), { align: 'right', alpha: small });
        // status chips
        const wk = weekOf(dd), wc = weekCol(dd);
        pill(ctx, 90, 610, 210, 56, V.rgba(wc, 0.22), wc); mono(ctx, `HAFTA ${wk}`, 195, 638, 22, C.lav, { w: 700, alpha: small });
        const zp = E.outBack(prog(b, T.zorIn, T.zorIn + 0.5), 2) * (1 - 0.0 * en(b, T.ping, 0.3));
        if (zp > 0) { ctx.save(); ctx.translate(316 + 115, 638); ctx.scale(zp, zp); pill(ctx, -115, -28, 230, 56, V.rgba(C.org, 0.25), C.org); mono(ctx, 'ZOR HAFTA', 0, 0, 22, C.lav, { w: 700 }); ctx.restore(); }
        const cp = E.outBack(prog(b, T.ping + 0.1, T.ping + 0.6), 2);
        if (cp > 0) { ctx.save(); ctx.translate(562 + 160, 638); ctx.scale(cp, cp); pill(ctx, -160, -28, 320, 56, V.rgba(C.teal, 0.25), C.teal); mono(ctx, 'CHECK-İN · 5 DK', 0, 0, 22, C.lav, { w: 700 }); ctx.restore(); }
      }
      ctx.restore();
    }
  }

  /* =========================================================
     DEMO DAY
     ========================================================= */
  const CR = V.rng(909);
  const CONF = Array.from({ length: 70 }, () => ({ a: -Math.PI / 2 + (CR() - 0.5) * 3.4, sp: 500 + CR() * 1300, k: ['sq', 'ci', 'tr', 'st'][Math.floor(CR() * 4)], c: [C.sky, C.pink, C.teal, C.cream, C.bg, C.v1][Math.floor(CR() * 6)], S: 26 + CR() * 34, rs: (CR() - 0.5) * 12, r0: CR() * 6 }));
  function drawDemo(ctx, t, b) {
    V.bg(ctx, C.amb);
    const lb = b - T.demo;
    // sunburst rays behind the star
    const rp = en(b, T.demo, 0.9, E.outCubic);
    ctx.save(); ctx.translate(CX, 700); ctx.rotate(b * 0.12);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.09) * 1500 * rp, Math.sin(a - 0.09) * 1500 * rp); ctx.lineTo(Math.cos(a + 0.09) * 1500 * rp, Math.sin(a + 0.09) * 1500 * rp); ctx.closePath(); ctx.fillStyle = 'rgba(11,8,22,0.07)'; ctx.fill(); }
    ctx.restore();
    // star
    const k = E.outBack(prog(b, T.demo + 0.05, T.demo + 1.0), 2.2), rot = lerp(-2.6, 0, E.outExpo(prog(b, T.demo + 0.05, T.demo + 1.4))) + 0.05 * Math.sin(b * 1.3);
    ctx.save(); ctx.translate(CX, 700 + 10 * Math.sin(b * 1.5)); ctx.scale(k, k); shape(ctx, 'st', 0, 0, 470, rot, C.cream); ctx.restore();
    // confetti shapes
    const tau = (b - (T.demo + 0.1)) * SPB;
    if (tau > 0 && tau < 2.4) CONF.forEach((c) => {
      const x = CX + Math.cos(c.a) * c.sp * tau * (1 - 0.3 * tau), y = 700 + Math.sin(c.a) * c.sp * tau + 1300 * tau * tau;
      ctx.save(); ctx.globalAlpha = clamp(2.2 - tau) ; shape(ctx, c.k, x, y, c.S, c.r0 + c.rs * tau, c.c); ctx.restore();
    });
    // ring
    if (lb > 0) { const p = prog(b, T.demo, T.demo + 1.2); ring(ctx, CX, 700, 100 + E.outExpo(p) * 1000, 14 * (1 - p) + 1, C.cream, 1 - p); }
    const s = fitSize(ctx, 'Demo Day', DISP, 860, 900, 160);
    rise(ctx, 'Demo Day', CX, 1150, s, C.bg, en(b, T.demo + 0.7, 0.8), { w: 900, tr: -3 });
    body(ctx, '30. gün · topluluk oylar', CX, 1150 + s * 0.95, 44, V.rgba(C.bg, 0.85), { w: 600, alpha: en(b, T.demo + 1.4, 0.6, E.outCubic) });
    mono(ctx, 'ÜRÜNÜNÜ TOPLULUĞA GÖSTER', CX, 322, 24, C.bg, { alpha: en(b, T.demo + 0.6, 0.5, E.outCubic) });
  }

  /* =========================================================
     VALUE + LOCKUP (the four shapes come home)
     ========================================================= */
  const IDLE = [[210, 1290], [440, 1380], [660, 1280], [880, 1370]];
  function drawValue(ctx, t, b) {
    V.bg(ctx, C.cream);
    const lb = b - T.wipeC;
    // headline
    const sz = Math.min(108, fitSize(ctx, 'taahhüt şart.', DISP, 860, 900));
    const lines = ['Fikir şart', 'değil,', 'taahhüt şart.'];
    lines.forEach((s, i) => rise(ctx, s, 90, 470 + i * sz * 1.28, sz, i === 2 ? C.v1 : C.bg, en(b, T.wipeC + 0.45 + i * 0.22, 0.75), { w: 900, align: 'left', tr: -2 }));
    // underline sweep under "taahhüt"
    const uw = widthOf(ctx, 'taahhüt', DISP, 900) * sz, up = E.inOutCubic(prog(b, T.wipeC + 1.6, T.wipeC + 2.1));
    ctx.fillStyle = C.amb; ctx.fillRect(90, 470 + 2 * sz * 1.28 + sz * 0.42, uw * up, 12);
    // pills
    [['ÜCRETSİZ', C.teal, C.bg, 90, 240], ['ONLINE', C.bg, C.lav, 350, 210], ['3 DK BAŞVURU', C.v1, C.lav, 580, 330]].forEach(([s, bg, fg, x, w], i) => {
      const p = E.outBack(prog(b, T.wipeC + 1.5 + i * 0.16, T.wipeC + 2.0 + i * 0.16), 2);
      if (p <= 0) return; ctx.save(); ctx.translate(x + w / 2, 960); ctx.scale(p, p); pill(ctx, -w / 2, -38, w, 76, bg); mono(ctx, s, 0, 0, 26, fg, { w: 700 }); ctx.restore();
    });
    // the shapes idle at the bottom
    if (b < T.wipeP + 0.3) ROLES.forEach((r, i) => {
      const p = E.outBack(prog(b, T.wipeC + 0.9 + i * 0.12, T.wipeC + 1.5 + i * 0.12), 2.4); if (p <= 0) return;
      shape(ctx, r.k, IDLE[i][0], IDLE[i][1] + Math.sin(b * 1.7 + i * 1.4) * 14, 140 * p, Math.sin(b * 1.1 + i) * 0.12, r.c);
    });
  }
  function drawLockup(ctx, t, b) {
    V.bg(ctx, C.v1);
    const g = ctx.createRadialGradient(CX, 800, 0, CX, 800, 1200); g.addColorStop(0, V.rgba(C.v2, 0.45)); g.addColorStop(1, V.rgba(C.bg, 0.7));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cyMark = 640, sc = 0.82;
    // the four shapes fly home from where they idled
    ROLES.forEach((r, i) => {
      const p = clamp((b - T.wipeP - 0.1 - i * 0.14) / 0.95), e = E.outBack(p, 1.3), m = markPos(i, CX, cyMark, sc);
      const x = lerp(IDLE[i][0], m[0], e), y = lerp(IDLE[i][1], m[1], e) - Math.sin(p * Math.PI) * 180;
      const lockT = T.wipeP + 0.1 + i * 0.14 + 0.95 * 0.72, h = V.hit(t, B(lockT), 0.1) * (b >= lockT ? 1 : 0);
      const idle = clamp((b - (T.wipeP + 1.6)) / 0.4);
      shape(ctx, r.k, x, y + Math.sin(b * 1.6 + i) * 6 * idle, 230 * sc * lerp(0.6, 1, E.outCubic(p)), lerp(i % 2 ? 1.6 : -1.6, 0, E.outCubic(p)) + Math.sin(b * 1.1 + i * 1.7) * 0.035 * idle, r.c, 1 + 0.26 * h, 1 - 0.2 * h);
    });
    const wy = 1010, s = fitSize(ctx, 'crewupa', DISP, 880, 800), G = glyphsOf(ctx, 'crewupa', DISP, s, 800, -s * 0.04), cap = capH(ctx, DISP, 800) * s;
    ctx.save(); ctx.beginPath(); ctx.rect(0, wy - cap * 1.3, W, cap * 3); ctx.clip();
    for (const g2 of G) { const p = E.outBack(clamp((b - 20.3 - g2.i * 0.06) / 0.5), 1.7); word(ctx, g2.ch, CX + g2.x, wy + (1 - p) * cap * 1.7, s, C.lav, { w: 800 }); }
    ctx.restore();
    rise(ctx, 'Ekibini kur.', CX, wy + 175, 60, C.v4, en(b, 20.8, 0.6), { w: 800, tr: -1 });
    rise(ctx, '30 günde çık.', CX, wy + 255, 60, C.lav, en(b, 20.95, 0.6), { w: 800, tr: -1 });
    const up = E.outBack(prog(b, 21.2, 21.8), 1.8);
    if (up > 0) {
      ctx.save(); ctx.translate(CX, 1370); ctx.scale(up, up); pill(ctx, -280, -54, 560, 108, C.lav); mono(ctx, 'crewupa.com', 0, 2, 46, C.bg, { w: 800, tr: 2 }); ctx.restore();
      mono(ctx, decode('BAŞVURULAR AÇIK · 19 EKİM\'E KADAR', prog(b, 21.5, 22.1), 4, t), CX, 1478, 24, C.v4);
    }
  }

  /* ---------------- master ---------------- */
  V.reel({
    title: 'crewupa · dört şekil, otuz gün',
    duration: 15, fps: 60, bpm: BPM, sidechain: 0.5,
    blur: { samples: 4, shutter: (t) => (t / SPB > T.zoom0 && t / SPB < T.demo + 0.15 ? 0.18 : 0.5) },
    draw(ctx, t) {
      const b = t / SPB;
      if (b < T.demo + 0.05) drawWorld(ctx, t, b);
      else {
        drawDemo(ctx, t, b);
        if (b >= T.wipeC) { wipe(ctx, b, T.wipeC, 0.6, CX, 700, C.cream); if (b >= T.wipeC + 0.3) drawValueMasked(ctx, t, b); }
        if (b >= T.wipeP) { wipe(ctx, b, T.wipeP, 0.6, CX, 640, C.v1); if (b >= T.wipeP + 0.3) drawLockupMasked(ctx, t, b); }
      }
    },
    post(ctx, t) {
      const b = t / SPB;
      const ch = V.hit(t, B(T.lock), 0.1) * 9 + V.hit(t, B(T.demo + 0.05), 0.12) * 12 + V.hit(t, B(20.3), 0.1) * 8;
      if (ch > 0.5) V.chroma(ctx, ch, 0);
      V.vignette(ctx, 0.28, '11,8,22');
      V.grain(ctx, t, b > 21.8 ? 0.03 : 0.05);
    },
    music(m) {
      const F = [65, 69, 72, 76], Dm = [62, 65, 69, 72], Bb = [58, 62, 65, 69], Cc = [60, 64, 67, 71];
      const at = (fn, lo, hi) => { const r = []; for (let x = lo; x < hi; x += 0.01) if (fn(x)) { r.push(x); } return r; };
      // ---- hook: each shape landing is a note of the same motif
      m.chord(0, 3.6, F, { attack: 0.35, gain: 0.14, cutoff: 700, env: 1500, fdecay: 2, release: 0.8, verb: 0.5 });
      [[1.0, 72], [1.12, 76], [1.24, 79], [1.36, 84]].forEach(([b, n]) => m.lead(b, 0.7, n, { gain: 0.11, decay: 3, verb: 0.5 }));
      m.impact(1.4, { gain: 0.5 }); m.kick(1.4, { gain: 0.8 });
      m.tick(T.txt + 1.05, { freq: 2200, gain: 0.25 });
      m.whoosh(0, 1.2, { gain: 0.25 });
      for (let b = 2; b < 4; b += 2) { m.kick(b, { gain: 0.8 }); }
      m.hat(2.5, { gain: 0.12 }); m.hat(3.5, { gain: 0.12 });
      // ---- flood + title + grid bloom
      m.whoosh(3.6, 0.9, { gain: 0.4 });
      for (let b = 4; b < 6; b += 2) { m.kick(b, { gain: 0.9 }); m.kick(b + 1.5, { gain: 0.5 }); }
      [5, 7].forEach((b) => m.clap(b, { gain: 0.5 }));
      m.chord(4, 2, F, { gain: 0.15, cutoff: 900, env: 2500, fdecay: 3, release: 0.4 });
      for (let i = 0; i < 12; i++) m.tick(4.7 + i * 0.1, { freq: 1400 + i * 110, gain: 0.07, pan: Math.sin(i) * 0.5 });
      // ---- crossing: groove
      for (let b = 6; b < 13.6; b += 2) { m.kick(b, { gain: 0.9 }); }
      for (let b = 7; b < 13.6; b += 2) { m.clap(b, { gain: 0.55 }); }
      for (let b = 6.5; b < 9.0; b += 1) m.hat(b, { gain: 0.16 });
      for (let b = 12.5; b < 13.6; b += 0.5) m.hat(b, { gain: 0.16 });
      [[6, F, 41], [8, Dm, 38], [10, Bb, 34], [12, Cc, 36]].forEach(([b, ch, root]) => {
        m.chord(b, 2, ch, { gain: 0.16, cutoff: b >= 8 && b < 12 ? 500 : 1100, env: 2500, fdecay: 3, release: 0.4, verb: 0.35 });
        for (let i = 0; i < 4; i++) m.bass(b + i * 0.5, 0.4, i % 2 ? root + 12 : root, { gain: 0.42, cutoff: 420, env: 1000 });
      });
      // week ticks at the moment the leader crosses days 7/14/21/28
      [7, 14, 21, 28].forEach((d, k) => { const cx = at((x) => sLead(x) >= d - 0.5, T.go, T.arrive)[0]; if (cx) { m.tick(cx, { freq: 1800 + k * 300, gain: 0.3 }); m.lead(cx, 0.5, [72, 76, 79, 84][k], { gain: 0.1, decay: 4 }); } });
      // hard week: heartbeat, then the check-in bell
      m.kick(9.6, { gain: 0.5, decay: 9 }); m.kick(10.1, { gain: 0.4, decay: 9 }); m.kick(10.9, { gain: 0.5, decay: 9 }); m.kick(11.4, { gain: 0.4, decay: 9 });
      m.lead(T.ping, 1.2, 88, { gain: 0.14, decay: 2, verb: 0.7 }); m.tick(T.ping, { freq: 3200, gain: 0.3 }); m.zap(T.ping - 0.05, { gain: 0.1, from: 1200 });
      m.riser(12.4, 14, { gain: 0.35 });
      for (let b = 13; b < 13.95; b += 0.125) m.snare(b, { gain: 0.14 + (b - 13) * 0.35, verb: 0.1 });
      m.mute(13.92, 14.0);
      // ---- Demo Day
      m.impact(14, { gain: 0.9 }); m.subdrop(14, { gain: 0.5 }); m.kick(14, { gain: 1 });
      m.chord(14, 2.8, [53, 65, 69, 72, 76, 81], { gain: 0.22, attack: 0.005, cutoff: 1800, env: 4500, fdecay: 1.5, release: 0.9, verb: 0.6 });
      [[14.3, 84], [14.55, 88], [14.8, 91], [15.05, 96], [15.3, 91], [15.55, 88]].forEach(([b, n]) => m.lead(b, 0.4, n, { gain: 0.06, decay: 5, verb: 0.7 }));
      for (let b = 14; b < 16.8; b += 2) m.kick(b + (b > 14 ? 0 : 0), { gain: 0.8 });
      [15, 16].forEach((b) => m.clap(b, { gain: 0.5 }));
      for (let b = 14.5; b < 16.8; b += 1) m.hat(b, { gain: 0.14 });
      [41, 41, 48, 41].forEach((n, i) => m.bass(14 + i * 0.5, 0.4, n, { gain: 0.4 }));
      // ---- value: pared back
      m.whoosh(16.5, 0.6, { gain: 0.3 });
      for (let b = 17; b < 19.2; b += 2) m.kick(b, { gain: 0.7 });
      m.chord(17, 2.2, Dm, { gain: 0.14, cutoff: 700, env: 1800, fdecay: 3, release: 0.5 });
      [17.5, 18.0, 18.5].forEach((b, i) => m.tick(b, { freq: 2000 + i * 250, gain: 0.14 }));
      m.hat(17.5, { gain: 0.1 }); m.hat(18.5, { gain: 0.1 });
      m.riser(17.9, 19.2, { gain: 0.3 });
      m.mute(19.15, 19.25);
      // ---- lockup: the motif returns
      [[19.7, 72], [19.84, 76], [19.98, 79], [20.12, 84]].forEach(([b, n]) => m.lead(b, 0.7, n, { gain: 0.11, decay: 3, verb: 0.5 }));
      m.kick(19.25, { gain: 0.8 }); m.impact(20.3, { gain: 0.85 }); m.subdrop(20.3, { gain: 0.5 }); m.kick(20.3, { gain: 1, decay: 4 });
      m.chord(20.3, 3.7, [53, 65, 69, 72, 76, 81], { gain: 0.24, attack: 0.005, cutoff: 1800, env: 4500, fdecay: 1.5, release: 1.2, verb: 0.7 });
      m.bass(20.3, 3.7, 29, { type: 'sub', gain: 0.4 });
      [[21.0, 84], [21.4, 88], [21.9, 91]].forEach(([b, n]) => m.lead(b, 0.9, n, { gain: 0.06, decay: 1.6, verb: 0.8 }));
      m.tick(21.2, { freq: 3000, gain: 0.15 });
    },
  });
  // The masked variants: draw the scene's own content only once the wipe circle has begun.
  function drawValueMasked(ctx, t, b) { ctx.save(); const p = E.inOutCubic(prog(b, T.wipeC, T.wipeC + 0.6)); ctx.beginPath(); ctx.arc(CX, 700, p * 2600, 0, TAU); ctx.clip(); drawValue(ctx, t, b); ctx.restore(); }
  function drawLockupMasked(ctx, t, b) { ctx.save(); const p = E.inOutCubic(prog(b, T.wipeP, T.wipeP + 0.6)); ctx.beginPath(); ctx.arc(CX, 640, p * 2600, 0, TAU); ctx.clip(); drawLockup(ctx, t, b); ctx.restore(); }
})();
