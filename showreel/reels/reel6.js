/* Reel 6 — "THE NUMBER 30" — crewupa.com
 * One continuous idea: the numeral 30. It is slammed as type; its "0" is a
 * window we fly through into the 30-day calendar; the calendar's last cell
 * floods amber (Demo Day); that amber disc collapses back into a "0" ring that
 * becomes a 30-day timer wheel; we fly through the ring again into the final
 * violet lockup. Four match-cuts, five scenes, 96 BPM = 24 beats = 15 s.
 *
 * Beat map (1 beat = 0.625 s, bar = 2.5 s)
 *   0-4    HOOK     30 slam · "Ekibini kur." · "günde çık." · dive through the 0 (music muted b3-4)
 *   4-12   CALENDAR wakes · "Herkes aynı gün başlar." · 01→30 count, week colour floods
 *   12-16  DEMO DAY cell 30 floods amber · "Gün 30: Demo Day" · confetti
 *   16-20  WHEEL    amber disc → "0" ring → 30-day timer · "Sezon 1 · Ücretsiz" · dive (muted b19-20)
 *   20-24  LOCKUP   crewupa · Ekibini kur, 30 günde çık. · crewupa.com · BAŞVURULAR AÇIK · 19 EKİM
 */
(function () {
  const BPM = 96;
  const SPB = 60 / BPM;
  const B = (b) => b * SPB;
  const E = V.ease;
  const W = V.W, H = V.H, CX = W / 2, CY = H / 2, TAU = V.TAU;
  const clamp = V.clamp, lerp = V.lerp, prog = V.prog;

  const K = {
    ink: '#0b0816', ink2: '#141026', ink3: '#1e1b3a',
    v9: '#3b1486', v8: '#5b21b6', v7: '#6d28d9', v5: '#8b5cf6', v4: '#a78bfa', v3: '#c4b5fd',
    lav: '#f1ebff', cream: '#fbf7f2',
    teal: '#2cc9a8', mint: '#6ee7b7', orange: '#f97316', amber: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
  };
  const WK = [K.v5, K.teal, K.orange, K.pink, K.amber];
  const DISP = 'Unbounded', BODY = 'Geist', MONO = 'Geist Mono';

  /* ---------------- helpers ---------------- */
  const memo = {};
  const once = (k, fn) => (k in memo ? memo[k] : (memo[k] = fn()));
  const cap = (ctx, fam, w, ref = 'H') =>
    once(`cap|${fam}|${w}|${ref}`, () => {
      ctx.save(); V.font(ctx, 100, fam, w);
      const m = ctx.measureText(ref).actualBoundingBoxAscent / 100;
      ctx.restore(); return m;
    });
  const wid = (ctx, s, fam, w, track = 0) =>
    once(`w|${s}|${fam}|${w}|${track}`, () => V.measure(ctx, s, { size: 100, family: fam, weight: w, tracking: track * 100 }) / 100);
  const fitSize = (ctx, s, fam, w, track, target) => target / wid(ctx, s, fam, w, track);

  /** Text centred (horizontally per align, vertically by cap/x height) on (x,y). */
  function T(ctx, s, x, y, o = {}) {
    const size = o.size || 100, fam = o.fam || DISP, w = o.w || 800;
    ctx.save();
    V.font(ctx, size, fam, w);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = (o.track || 0) * size + 'px';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const yy = y + (o.base ? 0 : (cap(ctx, fam, w, o.ref || 'H') * size) / 2);
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 3; ctx.lineJoin = 'round'; ctx.strokeText(s, x, yy); }
    if (o.fill !== null) { ctx.fillStyle = o.fill || '#fff'; ctx.fillText(s, x, yy); }
    ctx.restore();
  }
  /** Glyph-by-glyph row. fn(i,n) → {dx,dy,sx,sy,rot,a,fill} or null. */
  function letters(ctx, s, cx, y, o, fn) {
    const size = o.size, fam = o.fam || DISP, w = o.w || 800, track = o.track || 0;
    const gl = V.glyphs(ctx, s, { size, family: fam, weight: w, tracking: track * size });
    const c = cap(ctx, fam, w, o.ref || 'H') * size;
    ctx.save();
    V.font(ctx, size, fam, w);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    gl.forEach((g, i) => {
      if (g.ch === ' ') return;
      const st = fn(i, gl.length, g);
      if (!st || st.a <= 0) return;
      ctx.save();
      ctx.globalAlpha *= st.a == null ? 1 : st.a;
      ctx.translate(cx + g.x + (st.dx || 0), y + (st.dy || 0));
      ctx.rotate(st.rot || 0);
      ctx.scale(st.sx == null ? 1 : st.sx, st.sy == null ? 1 : st.sy);
      ctx.fillStyle = st.fill || o.fill || '#fff';
      ctx.fillText(g.ch, 0, c / 2);
      ctx.restore();
    });
    ctx.restore();
    return gl;
  }
  const disc = (ctx, x, y, r, fill) => {
    if (r <= 0.3) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  };
  const ringS = (ctx, x, y, r, lw, col, a = 1) => {
    if (a <= 0.003 || r <= 0 || lw <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const alphaMix = (hex, a) => V.rgba(hex, a);
  /** Draw fn with content clipped to a disc. */
  const inDisc = (ctx, x, y, r, fn) => {
    if (r <= 0.5) return;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); fn(); ctx.restore();
  };
  const camMap = (ctx, z, fx, fy) => { ctx.translate(CX, CY); ctx.scale(z, z); ctx.translate(-fx, -fy); };

  /* ---------------- the "0": exact outline scanned from Unbounded 900 ---------------- */
  function zero() {
    return once('zero', () => {
      const S = 600, N = 360, SZ = 1500;
      const [c, x] = V.buffer('zscan', SZ, SZ);
      x.clearRect(0, 0, SZ, SZ);
      V.font(x, S, DISP, 900);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.letterSpacing = '0px'; x.fillStyle = '#fff';
      const ox = SZ / 2, oy = SZ * 0.66;
      x.fillText('0', ox, oy);
      const d = x.getImageData(0, 0, SZ, SZ).data;
      let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
      for (let yy = 0; yy < SZ; yy++) for (let xx = 0; xx < SZ; xx++) {
        if (d[(yy * SZ + xx) * 4 + 3] > 127) { if (xx < minx) minx = xx; if (xx > maxx) maxx = xx; if (yy < miny) miny = yy; if (yy > maxy) maxy = yy; }
      }
      const A = (px, py) => {
        const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
        const g = (i, j) => d[((iy + j) * SZ + ix + i) * 4 + 3] / 255;
        return lerp(lerp(g(0, 0), g(1, 0), fx), lerp(g(0, 1), g(1, 1), fx), fy);
      };
      const cx = (minx + maxx + 1) / 2, cy = (miny + maxy + 1) / 2;
      const inner = new Array(N), outer = new Array(N);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU, dx = Math.cos(a), dy = Math.sin(a);
        let state = 0, prev = A(cx, cy), inn = 0, out = 0;
        for (let r = 0.5; r < S * 1.2; r += 0.5) {
          const v = A(cx + dx * r, cy + dy * r);
          if (state === 0 && v >= 0.5) { inn = r - 0.5 + ((0.5 - prev) / (v - prev)) * 0.5; state = 1; }
          else if (state === 1 && v < 0.5) { out = r - 0.5 + ((prev - 0.5) / (prev - v)) * 0.5; break; }
          prev = v;
        }
        inner[i] = inn / S; outer[i] = out / S;
      }
      const smooth = (arr) => arr.map((_, i) => (arr[(i + N - 1) % N] + arr[i] * 2 + arr[(i + 1) % N]) / 4);
      const Z = {
        N, inner: smooth(inner), outer: smooth(outer),
        cx: (cx - ox) / S, cy: (cy - oy) / S,
        w: (maxx - minx + 1) / S, h: (maxy - miny + 1) / S,
      };
      Z.rmin = Math.min(...Z.inner);
      Z.rmean = Z.outer.reduce((a, v) => a + v, 0) / N;
      Z.imean = Z.inner.reduce((a, v) => a + v, 0) / N;
      return Z;
    });
  }
  /** Points of the 0 contour in device space via matrix m. k=1 glyph, 0 circle of radius cR. */
  function zeroPts(m, cx, cy, size, key, k = 1, cR = 0, rot = 0, shrink = 1) {
    const Z = zero(), pts = [];
    for (let i = 0; i < Z.N; i++) {
      const a = (i / Z.N) * TAU + rot;
      const r = lerp(cR, Z[key][i] * size, k) * shrink;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      pts.push([m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    }
    return pts;
  }
  const ptsPath = (ctx, pts) => { pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };

  /* ---------------- hero geometry ---------------- */
  function hero(ctx) {
    return once('hero', () => {
      const Z = zero(), fam = DISP, w = 900, track = -0.03;
      const size = Math.round(fitSize(ctx, "30", fam, w, track, 1010));
      ctx.save(); V.font(ctx, size, fam, w); ctx.letterSpacing = track * size + 'px';
      const m = ctx.measureText('30');
      const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
      ctx.restore();
      const HX = CX, HY = 905;
      const base = HY + (asc - desc) / 2;
      const g = V.glyphs(ctx, '30', { size, family: fam, weight: w, tracking: track * size });
      const P0 = { x: HX + g[1].x + Z.cx * size, y: base + Z.cy * size };
      const Z1 = Math.min(40, (1150 / (Z.rmin * size)) * 1.08);
      const dH = asc + desc;
      return { size, fam, w, track, HX, HY, base, P0, Z1, dH, asc, desc, g };
    });
  }


  /* timeline (beats) */
  const WAKE = 4, CB = 7, DEMO = 12, IRIS = 15.5, WH = 16, LOCK = 20;

  /* =========================================================
     THE CALENDAR — 7 × 5 cells, weeks as rows
     ========================================================= */
  const GC = 7, CELL = 112, GAP = 18, GX0 = 94, GY0 = 790;
  const cellXY = (i) => [GX0 + (i % GC) * (CELL + GAP) + CELL / 2, GY0 + Math.floor(i / GC) * (CELL + GAP) + CELL / 2];
  const dayBeat = (i) => (i < 28 ? CB + Math.floor(i / 7) + (i % 7) * 0.125 : i === 28 ? CB + 4 : CB + 4.5);
  const weekOf = (i) => Math.min(4, Math.floor(i / 7));
  const WBG = [V.mix(K.ink, K.v7, 0.4), V.mix(K.ink, K.teal, 0.27), K.orange, V.mix(K.ink, K.pink, 0.34), K.amber];
  const CAPTIONS = [[CB, 'GÜN 01 · TANIŞMA'], [CB + 2, 'ZOR HAFTA']];

  function drawGrid(ctx, t, b) {
    V.bg(ctx, K.ink);
    {
      const g = ctx.createRadialGradient(CX, 1050, 60, CX, 1050, 1100);
      g.addColorStop(0, K.ink3); g.addColorStop(1, K.ink);
      ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
    }
    ctx.save();
    // slow push-in across the whole scene
    const dr = 1 + 0.04 * prog(b, WAKE, DEMO);
    ctx.translate(CX, 1090); ctx.scale(dr, dr); ctx.translate(-CX, -1090);

    // colour floods: circle-reveals from the first cell of each week
    for (let w = 0; w < 4; w++) {
      const tw = B(CB + w);
      if (t < tw) break;
      const u = prog(t, tw, tw + B(0.7));
      const [ox, oy] = cellXY(w * 7);
      const rad = lerp(30, 2600, E.outExpo(u));
      disc(ctx, ox, oy, rad, WBG[w]);
      if (u < 1) ringS(ctx, ox, oy, rad - 4, lerp(28, 3, u), WK[w], 1 - u * 0.6);
    }
    const orangeBg = b >= CB + 2 && b < CB + 3.05;
    const dimF = orangeBg ? 'rgba(11,8,22,0.14)' : 'rgba(255,255,255,0.055)';
    const dimS = orangeBg ? 'rgba(11,8,22,0.30)' : 'rgba(255,255,255,0.15)';
    const dimT = orangeBg ? 'rgba(11,8,22,0.35)' : 'rgba(255,255,255,0.22)';

    // ---- headline
    if (b >= WAKE && b < CB) {
      const lines = [['Herkes', 4.0, K.lav], ['aynı gün', 4.25, K.v3], ['başlar.', 4.5, K.lav]];
      const size = 122, exit = E.inCubic(prog(b, 6.7, 6.95));
      lines.forEach(([s, lb, col], i) => {
        const u = prog(b, lb, lb + 0.5);
        if (u <= 0) return;
        const y = 372 + i * 134;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, y - 90, W, 180); ctx.clip();
        const bob = Math.sin(t * 1.7 + i * 0.9) * 3 * (1 - exit);
        const hit = V.hit(t, B(lb), 0.12);
        letters(ctx, s, CX, y - exit * 170 + bob, { size, w: 800, track: -0.03, fill: col }, (k) => {
          const uu = prog(b, lb + k * 0.06, lb + k * 0.06 + 0.55);
          return { dy: (1 - E.outBack(uu, 1.5)) * 150, a: uu > 0 ? 1 : 0, sy: 1 + hit * 0.05 };
        });
        ctx.restore();
      });
    }

    // ---- counter + caption
    if (b >= CB && b < DEMO + 0.8) {
      let n = 0;
      for (let i = 0; i < 30; i++) if (b >= dayBeat(i)) n = i + 1;
      const u = t - B(dayBeat(Math.max(0, n - 1)));
      const w3 = orangeBg;
      const numCol = w3 ? K.ink : K.cream;
      const bump = Math.exp(-u / 0.09);
      const tension = w3 ? V.shake(t, 6, 22) : [0, 0, 0];
      const ent = E.outExpo(prog(b, CB, CB + 0.5));
      T(ctx, 'GÜN', CX - 250, 322, { size: 34, fam: MONO, w: 600, track: 0.32, fill: w3 ? K.ink : K.v3, align: 'left', alpha: ent });
      T(ctx, '/ 30', CX + 250, 322, { size: 34, fam: MONO, w: 600, track: 0.2, fill: w3 ? alphaMix(K.ink, 0.6) : alphaMix(K.v3, 0.7), align: 'right', alpha: ent });
      ctx.save();
      ctx.translate(CX + tension[0], 506 + tension[1]);
      ctx.scale(1 + 0.09 * bump, 1 + 0.09 * bump);
      ctx.translate(0, -(1 - ent) * 60);
      T(ctx, String(Math.max(n, 1)).padStart(2, '0'), 0, 0, { size: 420, fam: MONO, w: 700, track: -0.04, fill: numCol, alpha: ent });
      ctx.restore();

      const ci = b >= CB + 2 ? 1 : 0;
      const [cb, ctext] = CAPTIONS[ci];
      const cu = prog(b, cb, cb + 0.5);
      const pillCol = ci === 0 ? K.v5 : K.ink;
      const textCol = ci === 0 ? K.ink : K.orange;
      const tw = wid(ctx, ctext, MONO, 700, 0.1) * 34 + 64;
      ctx.save();
      ctx.translate(CX, 716 + Math.sin(t * 1.8) * 3);
      const sc = E.outBack(cu, 2);
      ctx.scale(sc, sc);
      rr(ctx, -tw / 2, -34, tw, 68, 34); ctx.fillStyle = pillCol; ctx.fill();
      T(ctx, ctext, 0, 1, { size: 34, fam: MONO, w: 700, track: 0.1, fill: textCol });
      ctx.restore();
    }

    // ---- cells
    const center = [(GC - 1) / 2, 2];
    for (let i = 0; i < 30; i++) {
      let [x, y] = cellXY(i);
      const col = i % GC, row = Math.floor(i / GC);
      if (b >= WAKE) y += Math.sin(t * 2.0 + col * 0.65 + row * 0.9) * 3;
      const dt = B(dayBeat(i));
      const u = t - dt;
      const lit = b >= CB && u >= 0;
      let sc = 1, fill = dimF, stroke = dimS, tcol = dimT, lw = 2;
      if (b < CB) {
        const dist = Math.hypot(col - center[0], row - center[1]);
        const uw = t - B(WAKE) - dist * 0.07;
        const f = uw >= 0 ? Math.exp(-uw / 0.34) : 0;
        const g = V.hit(t, B(4.25), 0.22) * (b >= 4.25 ? 1 : 0) + 0.4 * V.hit(t, B(5), 0.2) * (b >= 5 ? 1 : 0) + 0.4 * V.hit(t, B(6), 0.2) * (b >= 6 ? 1 : 0);
        const shim = b >= WAKE + 0.8 ? 0.2 * (0.5 + 0.5 * Math.sin(t * 3.2 - (col + row) * 0.75)) : 0;
        const a = Math.min(1, Math.max(f * 0.9, g, shim));
        fill = V.mix('#1b1735', K.v5, a); stroke = V.mix('#3a3566', K.v3, a); tcol = V.mix('#5a5590', K.ink, a);
        sc = 1 + 0.16 * f + 0.1 * g;
        if (b < WAKE) { const p = V.hit(t, B(Math.floor(b)), 0.14); fill = V.mix('#1b1735', '#2c2456', p); }
      } else if (lit) {
        const w = weekOf(i);
        const fl = Math.exp(-u / 0.09);
        sc = 1 + 0.34 * fl;
        if (w === 2) { fill = V.mix(K.ink, '#ffffff', 0.7 * fl); stroke = K.orange; tcol = K.orange; lw = 5; }
        else { fill = V.mix(WK[w], '#ffffff', 0.78 * fl); stroke = V.mix(WK[w], '#ffffff', 0.4); tcol = K.ink; lw = 2; }
        if (i === 29) fill = V.mix(K.amber, '#ffffff', 0.6 * fl);
      }
      if (i === 29 && b >= CB + 4.5) sc *= 1 - 0.24 * E.inOutSine(prog(b, CB + 4.55, DEMO));
      ctx.save();
      ctx.translate(x, y); ctx.scale(sc, sc);
      if (lit && u < 0.6) {
        ctx.globalAlpha = 0.45 * Math.exp(-u / 0.15);
        rr(ctx, -CELL / 2 - 12, -CELL / 2 - 12, CELL + 24, CELL + 24, 42); ctx.fillStyle = weekOf(i) === 2 ? K.orange : WK[weekOf(i)]; ctx.fill();
        ctx.globalAlpha = 1;
      }
      rr(ctx, -CELL / 2, -CELL / 2, CELL, CELL, 34);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
      T(ctx, String(i + 1).padStart(2, '0'), 0, 1, { size: 30, fam: MONO, w: 700, fill: tcol, track: 0.02 });
      ctx.restore();
    }
    ctx.restore();

    // impact rings as the grid wakes
    if (b >= WAKE && b < WAKE + 1.2) {
      const u = prog(t, B(WAKE), B(WAKE) + 0.7);
      ringS(ctx, CX, 1100, lerp(60, 1500, E.outExpo(u)), lerp(40, 2, u), K.v5, 1 - u);
    }
    if (b >= 4.25 && b < 5.2) {
      const u = prog(t, B(4.25), B(4.25) + 0.65);
      ringS(ctx, CX, 1100, lerp(80, 1400, E.outExpo(u)), lerp(24, 2, u), K.v3, (1 - u) * 0.8);
    }
  }

  /* =========================================================
     HOOK + DIVE THROUGH THE 0
     ========================================================= */
  function drawHook(ctx, t, b) {
    const Hg = hero(ctx);
    const pre = prog(b, 2.5, 2.9), main = prog(b, 2.9, 4.0);
    const z = (1 - 0.075 * E.inOutSine(pre)) * Math.exp(Math.log(Hg.Z1) * E.inCubic(main));
    const q = E.inOutCubic(prog(b, 2.9, 3.85));
    const fx = lerp(CX, Hg.P0.x, q), fy = lerp(CY, Hg.P0.y, q);

    const land = 1 - E.outExpo(clamp(t / 0.85));
    const breath = Math.sin(b * 1.35) * (1 - land);
    const sc = 1 + 0.3 * land + 0.035 * (V.hit(t, B(1), 0.07) + V.hit(t, B(2), 0.07)) + 0.014 * breath;
    const rot = -0.055 * land + 0.005 * breath;

    V.bg(ctx, K.ink);
    ctx.save();
    camMap(ctx, z, fx, fy);
    ctx.save();
    ctx.translate(Hg.HX, Hg.HY); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-Hg.HX, -Hg.HY);
    const m = ctx.getTransform();
    ctx.restore();
    const p0 = [m.a * Hg.P0.x + m.c * Hg.P0.y + m.e, m.b * Hg.P0.x + m.d * Hg.P0.y + m.f];

    // window: the calendar seen through the 0
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const s2 = lerp(0.4, 1, E.inQuad(main));
    ctx.translate(p0[0], p0[1]); ctx.scale(s2, s2); ctx.translate(-CX, -CY);
    drawGrid(ctx, t, Math.min(b, 3.999));
    ctx.restore();

    // violet outside the 0's outer contour
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gr = ctx.createRadialGradient(CX, 900, 60, CX, 900, 1300);
    gr.addColorStop(0, V.mix(K.v7, K.v5, 0.32)); gr.addColorStop(1, V.mix(K.v7, K.v8, 0.75));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.rect(-400, -400, W + 800, H + 800);
    ptsPath(ctx, zeroPts(m, Hg.P0.x, Hg.P0.y, Hg.size, 'outer', 1, 0, 0, 0.982));
    ctx.fill('evenodd');
    ctx.restore();

    // dot lattice
    ctx.save();
    ctx.fillStyle = alphaMix(K.v3, 0.16);
    for (let gy = -3; gy < 24; gy++) for (let gx = -2; gx < 12; gx++) {
      const x = 54 + gx * 108, y = 40 + gy * 108;
      if (Math.abs(x - Hg.P0.x) < 300 && Math.abs(y - Hg.P0.y) < 330) continue;
      if (Math.abs(y - Hg.HY) < Hg.dH * 0.62 && z < 2) continue;
      disc(ctx, x, y, 5, ctx.fillStyle);
    }
    ctx.restore();

    // hero numeral group
    ctx.save();
    ctx.translate(Hg.HX, Hg.HY); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-Hg.HX, -Hg.HY);
    V.font(ctx, Hg.size, Hg.fam, Hg.w);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = Hg.track * Hg.size + 'px';
    const echoes = [[K.orange, -1, -0.7, 0], [K.pink, 1, -0.5, 0.06], [K.teal, 0, 1, 0.12]];
    echoes.forEach(([col, dx, dy, dl], ei) => {
      const e = 1 - E.outExpo(clamp((t - dl) / 0.9));
      const kick = V.hit(t, B(1), 0.12) * 26 + V.hit(t, B(2), 0.12) * 26;
      const idle = (10 + 8 * Math.sin(b * 1.6 + ei * 2.1)) * prog(t, 0.8, 1.3) * (1 - prog(b, 2.8, 3.2));
      const a = 78 * e + kick + idle;
      if (a < 0.6) return;
      ctx.fillStyle = col; ctx.fillText('30', Hg.HX + dx * a, Hg.base + dy * a);
    });
    const depth = (30 + 46 * land) * (1 - prog(b, 2.95, 3.4));
    if (depth > 1) {
      const n = Math.ceil(depth / 2.2);
      ctx.fillStyle = K.v9;
      for (let i = n; i >= 1; i--) ctx.fillText('30', Hg.HX + (i * depth) / n * 0.62, Hg.base + (i * depth) / n);
    }
    ctx.fillStyle = K.cream;
    ctx.fillText('30', Hg.HX, Hg.base);
    ctx.restore();

    // copy
    const size = Math.min(100, fitSize(ctx, 'Ekibini kur.', DISP, 800, -0.03, 860));
    const ty = Hg.HY - Hg.dH / 2 - 118, by = Hg.HY + Hg.dH / 2 + 132;
    {
      const wa = 'Ekibini', wb = 'kur.';
      const wA = wid(ctx, wa + ' ', DISP, 800, -0.03) * size, wB = wid(ctx, wb, DISP, 800, -0.03) * size;
      const x0 = CX - (wA + wB) / 2;
      [[wa, 0.5, x0], [wb, 0.8, x0 + wA]].forEach(([s, lb, x]) => {
        const u = prog(b, lb, lb + 0.6);
        if (u <= 0) return;
        ctx.save();
        ctx.beginPath(); ctx.rect(x - 20, ty - size, wA + wB, size * 2); ctx.clip();
        T(ctx, s, x, ty + (1 - E.outExpo(u)) * size * 1.3, { size, w: 800, track: -0.03, align: 'left', fill: K.cream });
        ctx.restore();
      });
      const sz2 = Math.min(100, fitSize(ctx, 'günde çık.', DISP, 800, -0.03, 800));
      letters(ctx, 'günde çık.', CX, by + Math.sin(b * 1.6) * 4 * prog(b, 2, 2.5), { size: sz2, w: 800, track: -0.03, fill: K.amber }, (i) => {
        const u = prog(b, 1.25 + i * 0.05, 1.25 + i * 0.05 + 0.6);
        return { dy: (1 - E.outBack(u, 2.2)) * 200, a: u > 0 ? 1 : 0, sy: 1 + (1 - u) * 0.5 };
      });
    }
    ctx.restore();

    // speed lines as the dive accelerates
    if (b > 3.1) {
      const a = E.inQuad(prog(b, 3.1, 3.9)) * (1 - prog(b, 3.93, 4.0));
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 46; i++) {
        const ang = (i / 46) * TAU + V.hash(i) * 0.1;
        const r0 = lerp(120, 380, V.hash(i + 5)) * (1 + 3 * main);
        const r1 = r0 + lerp(200, 900, V.hash(i + 9)) * a;
        ctx.strokeStyle = alphaMix(i % 3 === 0 ? K.amber : K.lav, 0.55 * a);
        ctx.lineWidth = lerp(3, 9, V.hash(i + 2));
        ctx.beginPath(); ctx.moveTo(p0[0] + Math.cos(ang) * r0, p0[1] + Math.sin(ang) * r0); ctx.lineTo(p0[0] + Math.cos(ang) * r1, p0[1] + Math.sin(ang) * r1); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* =========================================================
     DEMO DAY — flood from cell 30
     ========================================================= */
  const DEMO_O = () => cellXY(29);
  function drawDemoContent(ctx, t, b) {
    V.bg(ctx, K.amber);
    const [ox, oy] = DEMO_O();
    for (let k = 0; k < 3; k++) {
      const u = prog(t, B(DEMO + 0.05 + k * 0.3), B(DEMO + 0.05 + k * 0.3) + 1.1);
      ringS(ctx, ox, oy, lerp(60, 1900, E.outExpo(u)), lerp(22, 2, u), K.ink, (1 - u) * 0.5);
    }
    for (const kb of [14, 15]) {
      const uu = prog(t, B(kb), B(kb) + 0.9);
      ringS(ctx, CX, 930, lerp(120, 1500, E.outExpo(uu)), lerp(26, 2, uu), K.ink, (1 - uu) * 0.26);
    }
    // confetti, drifting slowly
    const rnd = V.rng(30);
    const cols = [K.v7, K.teal, K.pink, K.ink, K.cream, K.sky, K.v5];
    for (let i = 0; i < 40; i++) {
      const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.2 + 0.25, sp = lerp(900, 2300, rnd());
      const rot0 = rnd() * TAU, spin = (rnd() - 0.5) * 6, size = lerp(20, 46, rnd()), kind = Math.floor(rnd() * 4), col = cols[i % cols.length];
      const u = t - B(DEMO + 0.03) - rnd() * 0.08;
      if (u < 0) continue;
      const drag = Math.exp(-u * 1.7);
      const x = ox + Math.cos(ang) * sp * (1 - drag) / 1.7, y = oy + Math.sin(ang) * sp * (1 - drag) / 1.7 + 420 * u * u;
      if (y > H + 100 || x < -100 || x > W + 100) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot0 + spin * u);
      ctx.fillStyle = col;
      if (kind === 0) { ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, TAU); ctx.fill(); }
      else if (kind === 1) { ctx.fillRect(-size / 2, -size / 2, size, size); }
      else if (kind === 2) { V.poly(ctx, 0, 0, size * 0.62, 3); ctx.fill(); }
      else { V.star(ctx, 0, 0, size * 0.6, size * 0.26, 4); ctx.fill(); }
      ctx.restore();
    }
    ctx.save();
    const pl = 1 + 0.026 * (V.hit(t, B(14), 0.12) + V.hit(t, B(15), 0.12));
    const bob = Math.sin(t * 1.9) * 7 * prog(b, 13.4, 14.2);
    ctx.translate(CX, 900 + bob); ctx.scale(pl, pl); ctx.translate(-CX, -900);
    const u1 = prog(b, DEMO + 0.3, DEMO + 0.85);
    T(ctx, 'Gün 30:', CX, 560, { size: 84, w: 700, track: -0.03, fill: K.ink, alpha: E.outExpo(u1) });
    const fs = Math.min(268, fitSize(ctx, 'Demo', DISP, 900, -0.04, 900));
    ['Demo', 'Day'].forEach((s, li) => {
      const y = 850 + li * 262, lb = DEMO + 0.5 + li * 0.4;
      letters(ctx, s, CX, y, { size: fs, w: 900, track: -0.04, fill: K.ink }, (i) => {
        const st = lb + i * 0.07, u = prog(b, st, st + 0.6);
        const fall = 1 - E.outBounce(u);
        const stretch = u < 1 ? 1 + 0.5 * (1 - u) : 1;
        const sq = u >= 1 ? V.hit(t, B(st + 0.6), 0.09) : 0;
        return { dy: (li ? 1 : -1) * fall * 900, sy: stretch - sq * 0.26, sx: 1 / stretch + sq * 0.2, a: u > 0 ? 1 : 0 };
      });
    });
    ctx.restore();
  }
  function drawDemo(ctx, t, b) {
    const [ox, oy] = DEMO_O();
    const u = prog(t, B(DEMO), B(DEMO + 0.7));
    const r = lerp(58, 2600, E.inOutCubic(u) * 0.35 + E.outExpo(u) * 0.65);
    if (b < DEMO + 0.75) inDisc(ctx, ox, oy, r, () => drawDemoContent(ctx, t, b));
    else drawDemoContent(ctx, t, b);
  }

  /* =========================================================
     THE WHEEL — 0 as ring → timer → portal to the lockup
     ========================================================= */
  const RC = { x: CX, y: 770 };
  function ringGeo() {
    return once('ringgeo', () => {
      const Z = zero();
      const size = 700 / Z.h;
      return { size, Rd: Z.rmean * size };
    });
  }
  function drawWheel(ctx, t, b) {
    const G = ringGeo(), Z = zero();
    const morph = E.inOutBack(prog(b, 16.25, 17.0), 1.3);
    const open = E.outBack(prog(b, 16.45, 17.2), 1.6);
    const popIn = 1 + 0.06 * V.hit(t, B(16), 0.12) + 0.035 * V.hit(t, B(17), 0.12) + 0.03 * V.hit(t, B(18), 0.12);
    const pre = prog(b, 18.65, 19.0), main = prog(b, 19.0, 20.0);
    const z = popIn * (1 - 0.06 * E.inOutSine(pre)) * Math.exp(Math.log(Math.min(40, 1150 / (Z.rmin * G.size)) * 1.08) * E.inCubic(main));
    const q = E.inOutCubic(prog(b, 19.0, 19.9));
    const fx = lerp(CX, RC.x, q), fy = lerp(CY, RC.y, q);
    const still = 1 - prog(b, 18.5, 19.0);
    const rot = 0.03 * Math.sin(b * 1.3) * still;

    V.bg(ctx, K.ink);
    ctx.save();
    camMap(ctx, z, fx, fy);
    ctx.translate(RC.x, RC.y); ctx.rotate(rot); ctx.translate(-RC.x, -RC.y);
    const m = ctx.getTransform();
    ctx.restore();
    const c0 = [m.a * RC.x + m.c * RC.y + m.e, m.b * RC.x + m.d * RC.y + m.f];

    const outerK = clamp(morph, 0, 1), innerK = clamp(open, 0, 1);
    const win = b >= 18.6;
    if (win) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const s2 = lerp(0.42, 1, E.inQuad(main));
      ctx.translate(c0[0], c0[1]); ctx.scale(s2, s2); ctx.translate(-CX, -CY);
      drawLock(ctx, t, Math.min(b, LOCK - 0.001));
      ctx.restore();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gr = ctx.createRadialGradient(CX, 900, 80, CX, 900, 1300);
    gr.addColorStop(0, K.ink3); gr.addColorStop(1, K.ink);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.rect(-400, -400, W + 800, H + 800);
    if (win) ptsPath(ctx, zeroPts(m, RC.x, RC.y, G.size, 'outer', outerK, G.Rd, 0, 0.99));
    ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    camMap(ctx, z, fx, fy);
    ctx.translate(RC.x, RC.y); ctx.rotate(rot); ctx.translate(-RC.x, -RC.y);

    const sweepU = prog(b, 17, 19), sweep = E.inOutSine(sweepU) * 0.35 + sweepU * 0.65;
    const rt = Z.outer.reduce((a, v) => Math.max(a, v), 0) * G.size + 76;
    const tin = E.outExpo(prog(b, 16.9, 17.5));
    for (let j = 0; j < 30; j++) {
      const a = -Math.PI / 2 + (j / 30) * TAU;
      const lit = sweep * 30 > j + 0.001;
      const age = lit ? (sweep * 30 - j) / 30 : 0;
      const ps = lit ? 1 + 0.9 * Math.exp(-age * 30 * 1.1) : 1;
      const x = RC.x + Math.cos(a) * rt * (0.9 + 0.1 * tin), y = RC.y + Math.sin(a) * rt * (0.9 + 0.1 * tin);
      ctx.globalAlpha = tin;
      disc(ctx, x, y, (lit ? 11 : 7) * ps, lit ? WK[weekOf(j)] : 'rgba(255,255,255,0.22)');
    }
    ctx.globalAlpha = 1;

    ctx.save();
    const sq = 1 - 0.05 * V.hit(t, B(17), 0.12) + 0.05 * V.hit(t, B(18), 0.1);
    ctx.translate(RC.x, RC.y); ctx.scale(1, sq); ctx.translate(-RC.x, -RC.y);
    const ringPath = () => {
      ctx.beginPath();
      for (let i = 0; i < Z.N; i++) {
        const a = (i / Z.N) * TAU, r = lerp(G.Rd, Z.outer[i] * G.size, outerK);
        const x = RC.x + Math.cos(a) * r, y = RC.y + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      for (let i = 0; i < Z.N; i++) {
        const a = (i / Z.N) * TAU, r = lerp(0.0001, Z.inner[i] * G.size, innerK);
        const x = RC.x + Math.cos(a) * r, y = RC.y + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    ringPath();
    ctx.fillStyle = K.amber; ctx.fill('evenodd');
    ctx.save();
    ringPath(); ctx.clip('evenodd');
    [[0, 7], [7, 14], [14, 21], [21, 28], [28, 30]].forEach(([a0, a1], w) => {
      const s0 = a0 / 30, s1 = Math.min(a1 / 30, sweep);
      if (s1 <= s0) return;
      ctx.beginPath(); ctx.moveTo(RC.x, RC.y);
      ctx.arc(RC.x, RC.y, 2000, -Math.PI / 2 + s0 * TAU, -Math.PI / 2 + s1 * TAU + 0.004);
      ctx.closePath(); ctx.fillStyle = WK[w]; ctx.fill();
    });
    ctx.restore();
    ctx.restore();

    if (b >= 17 && b < 19.05) {
      const ha = -Math.PI / 2 + sweep * TAU;
      const hl = Z.imean * G.size * 0.9 * E.outBack(prog(b, 17, 17.5), 1.7);
      ctx.save(); ctx.globalAlpha = 1 - E.inCubic(prog(b, 18.55, 18.95));
      ctx.strokeStyle = K.cream; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(RC.x, RC.y); ctx.lineTo(RC.x + Math.cos(ha) * hl, RC.y + Math.sin(ha) * hl); ctx.stroke();
      disc(ctx, RC.x, RC.y, 20, K.cream);
      disc(ctx, RC.x, RC.y, 8, K.ink);
      ctx.restore();
    }

    const sz = Math.min(112, fitSize(ctx, 'Ücretsiz', DISP, 900, -0.03, 800));
    const bobT = Math.sin(t * 1.7) * 4 * prog(b, 17.4, 18);
    letters(ctx, 'Sezon 1', CX, 1272 + bobT, { size: sz, w: 900, track: -0.03, fill: K.cream }, (i) => {
      const u = prog(b, 16.4 + i * 0.06, 16.4 + i * 0.06 + 0.6);
      return { dy: (1 - E.outBack(u, 2)) * 170, a: u > 0 ? 1 : 0 };
    });
    letters(ctx, 'Ücretsiz', CX, 1436 + bobT, { size: sz, w: 900, track: -0.03, fill: K.mint }, (i) => {
      const u = prog(b, 16.8 + i * 0.05, 16.8 + i * 0.05 + 0.6);
      return { dy: (1 - E.outBack(u, 2)) * 170, a: u > 0 ? 1 : 0 };
    });
    ctx.restore();

    // iris: the amber disc of the Demo Day scene collapses into this ring
    if (b < WH + 0.3) {
      const u = prog(b, IRIS, WH);
      const rad = lerp(2600, G.Rd, E.inOutCubic(u));
      inDisc(ctx, RC.x, RC.y, rad, () => {
        drawDemoContent(ctx, t, b);
        ctx.fillStyle = alphaMix(K.amber, E.inOutSine(prog(u, 0.05, 0.75)));
        ctx.fillRect(0, 0, W, H);
      });
    }
  }

  /* =========================================================
     LOCKUP
     ========================================================= */
  function drawLock(ctx, t, b) {
    V.bg(ctx, K.v7);
    const gr = ctx.createRadialGradient(CX, 900, 40, CX, 900, 1250);
    gr.addColorStop(0, V.mix(K.v7, K.v5, 0.4)); gr.addColorStop(1, V.mix(K.v7, K.v8, 0.85));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // ghost 30, slowly drifting for the whole scene
    ctx.save();
    const lb = b - LOCK;
    const drift = 1.02 - 0.03 * clamp(lb / 4);
    ctx.translate(CX + Math.sin(t * 0.6) * 10, 930 + Math.cos(t * 0.5) * 8);
    ctx.scale(drift, drift); ctx.rotate(0.035 - 0.02 * clamp(lb / 4));
    const gs = 1350 / wid(ctx, '30', DISP, 900, -0.04);
    V.font(ctx, gs, DISP, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = -0.04 * gs + 'px';
    ctx.strokeStyle = alphaMix(K.v3, 0.2); ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.strokeText('30', 0, cap(ctx, DISP, 900) * gs / 2);
    ctx.restore();

    if (b < LOCK) return;
    // wordmark
    const ws = fitSize(ctx, 'crewupa', DISP, 800, -0.04, 800);
    const wy = 790 + Math.sin(t * 1.3) * 5 * prog(b, 21, 21.6);
    const kick = V.hit(t, B(21), 0.14) * 0.012 + V.hit(t, B(22), 0.14) * 0.012 + V.hit(t, B(23), 0.14) * 0.012;
    ctx.save();
    ctx.translate(CX, wy); ctx.scale(1 + kick, 1 + kick); ctx.translate(-CX, -wy);
    letters(ctx, 'crewupa', CX, wy, { size: ws, w: 800, track: -0.04, fill: '#ffffff', ref: 'x' }, (i) => {
      const u = prog(b, LOCK + i * 0.055, LOCK + i * 0.055 + 0.55);
      const e = E.outBack(u, 2.2);
      return { dy: (1 - e) * 260, sy: 1 + (1 - clamp(e, 0, 1)) * 0.5, a: u > 0 ? 1 : 0 };
    });
    ctx.restore();
    const su = prog(t, B(LOCK), B(LOCK) + 0.9);
    ringS(ctx, CX, 790, lerp(80, 1300, E.outExpo(su)), lerp(30, 2, su), K.lav, (1 - su) * 0.6);

    // tagline
    const tg = 60, tw1 = wid(ctx, 'Ekibini kur, ', BODY, 600) * tg, tw2 = wid(ctx, '30 günde çık.', BODY, 800) * tg;
    const tx = CX - (tw1 + tw2) / 2, ty = 970;
    const tu = prog(b, LOCK + 0.5, LOCK + 1.05);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, ty - 60, W, 120); ctx.clip();
    const tyo = (1 - E.outExpo(tu)) * 90;
    T(ctx, 'Ekibini kur, ', tx, ty + tyo, { size: tg, fam: BODY, w: 600, align: 'left', fill: K.lav });
    T(ctx, '30 günde çık.', tx + tw1, ty + tyo, { size: tg, fam: BODY, w: 800, align: 'left', fill: K.amber });
    ctx.restore();

    // CTA pill
    const pu = E.outBack(prog(b, LOCK + 0.85, LOCK + 1.4), 2.2);
    if (pu > 0) {
      const txt = 'crewupa.com', ps = 52;
      const pw = wid(ctx, txt, MONO, 700, 0.02) * ps + 112, ph = 112, py = 1100 + Math.sin(t * 1.5 + 1) * 4 * prog(b, 22, 22.6);
      ctx.save(); ctx.translate(CX, py); ctx.scale(pu, pu);
      rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fillStyle = K.cream; ctx.fill();
      T(ctx, txt, 0, 2, { size: ps, fam: MONO, w: 700, track: 0.02, fill: K.ink });
      ctx.restore();
    }
    // availability line — the "30" rolls down to 19
    const au = prog(b, LOCK + 1.2, LOCK + 1.7);
    if (au > 0) {
      const roll = Math.max(19, 30 - Math.floor(Math.max(0, b - (LOCK + 1.3)) / 0.06));
      const txt = 'BAŞVURULAR AÇIK · ' + roll + ' EKİM';
      const sz = 30, tw = wid(ctx, 'BAŞVURULAR AÇIK · 19 EKİM', MONO, 600, 0.16) * sz;
      const yy = 1255;
      ctx.save(); ctx.globalAlpha = E.outExpo(au);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      const dotX = CX - tw / 2 - 30;
      disc(ctx, dotX, yy, 9 + pulse * 2, K.mint);
      ringS(ctx, dotX, yy, 14 + pulse * 10, 2, K.mint, 0.6 * (1 - pulse));
      T(ctx, txt, CX - tw / 2, yy + 1, { size: sz, fam: MONO, w: 600, track: 0.16, fill: K.lav, align: 'left' });
      ctx.restore();
    }
  }

  /* ---------------- master ---------------- */
  V.reel({
    title: 'THE NUMBER 30 — crewupa',
    duration: 15,
    fps: 60,
    bpm: BPM,
    sidechain: 0.6,
    fadeOut: 0.3,
    blur: {
      samples: 4,
      shutter: (t) => {
        const b = t / SPB;
        if ((b > 2.9 && b < 4.05) || (b > 18.9 && b < 20.05)) return 1.0;
        return 0.55;
      },
    },
    draw(ctx, t) {
      const b = t / SPB;
      if (b < WAKE) drawHook(ctx, t, b);
      else if (b < DEMO + 0.75) {
        drawGrid(ctx, t, b);
        if (b >= DEMO) drawDemo(ctx, t, b);
      } else if (b < IRIS) drawDemoContent(ctx, t, b);
      else if (b < LOCK) drawWheel(ctx, t, b);
      else drawLock(ctx, t, b);
    },
    post(ctx, t) {
      const b = t / SPB;
      const ch = V.hit(t, B(0), 0.08) * 9 + V.win(b, 3.1, 4.0, 0.6, 0.1) * 16 + V.hit(t, B(WAKE), 0.1) * 16 + V.hit(t, B(DEMO), 0.14) * 16 + V.win(b, 19.1, 20, 0.6, 0.1) * 14 + V.hit(t, B(LOCK), 0.14) * 12;
      if (ch > 0.6) V.chroma(ctx, ch, 0);
      V.vignette(ctx, 0.32, '11,8,22');
      V.grain(ctx, t, b >= LOCK ? 0.035 : 0.06);
    },
    music(m) {
      // 96 BPM, C major. Bars: C (4-8) | Am (8-12) | F (12-16) | G (16-20) | C (20-24).
      const CH = { C: [60, 64, 67, 71], Am: [57, 64, 69, 72], F: [53, 60, 65, 69], G: [55, 62, 67, 71] };
      const ROOT = { C: 36, Am: 33, F: 29, G: 31 };
      const bassBar = (b0, name, g = 0.42) => {
        const r = ROOT[name];
        [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].forEach((o, i) => {
          const n = [r, r + 12, r, r, r + 12, r, r + 7, r + 12][i];
          m.bass(b0 + o, 0.42, n, { gain: g, cutoff: 380, env: 1500 });
        });
      };
      const stabs = (b0, name, vol = 0.2) => {
        const ch = CH[name];
        [0.5, 1.5, 2.75].forEach((o) => m.chord(b0 + o, 0.3, ch.map((n) => n + 12), { pluck: 10, gain: vol, cutoff: 1000, env: 6000, verb: 0.3 }));
      };
      const hats = (b0, b1, g = 0.2) => {
        for (let b = b0; b < b1; b += 1) {
          m.hat(b + 0.5, { gain: g });
          m.hat(b + 0.25, { gain: g * 0.45, pan: -0.3 });
          m.hat(b + 0.75, { gain: g * 0.45, pan: 0.3 });
        }
      };
      const pad = (b0, len, name, g = 0.1) => m.chord(b0, len, CH[name].map((n) => n - 12), { gain: g, cutoff: 700, env: 1200, attack: 0.03, release: 0.4 });

      // ---- HOOK b0-4: slam, stabs on the words, build into one beat of silence
      m.impact(0, { gain: 0.8 });
      m.chord(0, 1.5, [48, 60, 64, 67, 74], { gain: 0.24, cutoff: 1500, env: 5000, fdecay: 4, release: 0.3 });
      for (let b = 0; b < 3; b++) { m.kick(b, { gain: 1 }); m.bass(b + 0.5, 0.4, 36, { gain: 0.45 }); }
      m.bass(0, 0.45, 36, { gain: 0.5 });
      m.chord(0.5, 0.3, [72, 76, 79], { pluck: 12, gain: 0.22, cutoff: 1200, env: 6000 });
      m.chord(0.8, 0.3, [74, 79, 83], { pluck: 12, gain: 0.2, cutoff: 1200, env: 6000 });
      m.chord(1.25, 0.4, [72, 76, 79, 84], { pluck: 10, gain: 0.24, cutoff: 1200, env: 6000 });
      m.clap(2, { gain: 0.6 }); m.snare(2, { gain: 0.25 });
      [0.5, 1.5, 2.5].forEach((b) => m.hat(b, { gain: 0.2 }));
      m.riser(1.5, 3, { gain: 0.5 });
      for (let b = 2.5; b < 3; b += 0.125) m.snare(b, { gain: 0.14 + (b - 2.5) * 0.7, verb: 0.1 });
      m.zap(1.25, { gain: 0.1 });
      m.mute(3, 4);

      // ---- DROP b4: calendar wakes
      m.impact(4, { gain: 0.95 }); m.subdrop(4, { gain: 0.55 });
      m.whoosh(4, 1.2, { gain: 0.3, dir: -1 });
      for (let b = 4; b < 12; b++) m.kick(b, { gain: 1 });
      for (let b = 5; b < 12; b += 2) { m.clap(b, { gain: 0.7 }); m.snare(b, { gain: 0.3 }); }
      bassBar(4, 'C'); bassBar(8, 'Am');
      stabs(4, 'C'); stabs(8, 'Am');
      pad(4, 4, 'C'); pad(8, 4, 'Am');
      hats(4, 12, 0.2);
      [4, 4.25, 4.5].forEach((b, i) => m.chord(b, 0.3, [[72, 76, 79], [74, 79, 83], [76, 79, 84]][i], { pluck: 8, gain: 0.24, cutoff: 1400, env: 6000 }));
      m.tick(4.25, { freq: 1800, gain: 0.2 });
      // arp over the wake (16ths)
      [5, 6].forEach((b0) => [72, 76, 79, 84, 79, 76, 72, 76].forEach((n, i) => m.lead(b0 + i * 0.25, 0.22, n, { gain: 0.045, decay: 7, pan: Math.sin(i + b0) * 0.5, verb: 0.35 })));
      // ---- COUNT b7-11.5: a pentatonic run per week, one note per 1/8
      const PENT = [72, 74, 76, 79, 81, 84, 86];
      for (let w = 0; w < 4; w++) for (let j = 0; j < 7; j++) {
        const nn = PENT[j] + (w === 2 ? -3 : 0);
        m.lead(7 + w + j * 0.125, 0.12, nn, { gain: 0.09 + w * 0.012, decay: 9, pan: (j / 6 - 0.5) * 0.7, verb: 0.3 });
        m.tick(7 + w + j * 0.125, { freq: 3400 + j * 120, gain: 0.05 });
      }
      [0, 1, 2, 3].forEach((w) => m.zap(7 + w, { gain: 0.09, from: 2400 }));
      m.lead(11, 0.3, 88, { gain: 0.11, decay: 5 }); m.lead(11.5, 0.5, 91, { gain: 0.13, decay: 3 });
      m.tick(11, { freq: 4200, gain: 0.08 }); m.tick(11.5, { freq: 4800, gain: 0.1 });
      m.riser(10.5, 12, { gain: 0.42, tone: 0.6 });
      m.snare(11.5, { gain: 0.3 }); m.snare(11.75, { gain: 0.4 }); m.snare(11.875, { gain: 0.5 });

      // ---- DEMO DAY b12: amber flood, confetti
      m.impact(12, { gain: 0.95 }); m.subdrop(12, { gain: 0.5 });
      m.chord(12, 4, [41, 53, 60, 65, 69, 72], { gain: 0.24, cutoff: 1800, env: 5000, fdecay: 1.6, release: 0.5, verb: 0.55 });
      for (let b = 12; b < 16; b++) m.kick(b, { gain: 1 });
      [13, 15].forEach((b) => { m.clap(b, { gain: 0.7 }); m.snare(b, { gain: 0.3 }); });
      bassBar(12, 'F', 0.44);
      stabs(12, 'F', 0.18);
      hats(12, 16, 0.22);
      [12.06, 12.2, 12.32, 12.45, 12.6, 12.8].forEach((b, i) => m.zap(b, { gain: 0.07, from: 2000 + i * 300, pan: (i % 2 ? 0.6 : -0.6) }));
      [12.55, 12.9].forEach((b, i) => m.tick(b, { freq: 1500 + i * 500, gain: 0.16 }));
      m.lead(13.5, 0.4, 84, { gain: 0.08, decay: 3 }); m.lead(14, 0.4, 81, { gain: 0.08, decay: 3 }); m.lead(14.5, 0.4, 77, { gain: 0.08, decay: 3 });
      m.whoosh(15.3, 0.7, { gain: 0.4, dir: -1 }); m.downlifter(15.4, 0.6, { gain: 0.25 });

      // ---- WHEEL b16: half-time pulse, arpeggio follows the sweep
      m.kick(16, { gain: 1 }); m.kick(17, { gain: 0.9 }); m.kick(18, { gain: 1 }); m.kick(18.75, { gain: 0.7 });
      m.clap(17, { gain: 0.65 }); m.clap(19, { gain: 0.5 });
      m.bass(16, 2, 31, { gain: 0.45, cutoff: 400 }); m.bass(18, 1, 31, { gain: 0.45, cutoff: 400 });
      pad(16, 3, 'G', 0.14);
      m.chord(16, 3, [55, 62, 67, 71], { gain: 0.14, attack: 0.01, cutoff: 900, env: 3000, fdecay: 3, release: 0.3 });
      const ARP = [79, 83, 86, 91, 86, 83, 79, 83];
      for (let i = 0; i < 12; i++) m.lead(17 + i * 0.25, 0.22, ARP[i % ARP.length], { gain: 0.06 + i * 0.004, decay: 6, pan: Math.sin(i) * 0.5, verb: 0.35 });
      for (let b = 16; b < 19; b += 0.5) m.hat(b + 0.25, { gain: 0.16 });
      m.tick(16.4, { freq: 2400, gain: 0.12 }); m.tick(16.8, { freq: 3000, gain: 0.12 });
      m.riser(16.5, 19, { gain: 0.45 });
      for (let b = 18; b < 19; b += 0.125) m.snare(b, { gain: 0.14 + (b - 18) * 0.5, verb: 0.1 });
      m.mute(19, 20);

      // ---- LOCKUP b20
      m.impact(20, { gain: 1 }); m.subdrop(20, { gain: 0.6, len: 1.8 });
      for (let b = 20; b < 24; b++) m.kick(b, { gain: b === 20 ? 1.05 : 0.85, decay: b === 20 ? 4.5 : 6.5 });
      m.chord(20, 4, [48, 60, 64, 67, 71, 76], { gain: 0.26, attack: 0.005, cutoff: 2000, env: 4500, fdecay: 1.3, release: 1.2, verb: 0.65 });
      m.bass(20, 4, 36, { type: 'sub', gain: 0.4 });
      m.chord(20.3, 0.3, [72, 76, 79], { pluck: 9, gain: 0.2, cutoff: 1400, env: 6000 });
      m.lead(20.5, 1.2, 84, { gain: 0.09, decay: 1.4, verb: 0.7 });
      m.lead(21.5, 1.5, 88, { gain: 0.08, decay: 1.2, verb: 0.7 });
      m.lead(22.5, 1.5, 91, { gain: 0.07, decay: 1.0, verb: 0.8 });
      for (let i = 0; i < 12; i++) m.tick(21.3 + i * 0.06, { freq: 3800 - i * 140, gain: 0.05 });
      m.clap(21, { gain: 0.5 }); m.clap(23, { gain: 0.4 });
      for (let b = 20; b < 24; b++) m.hat(b + 0.5, { gain: 0.14 });
      [20.5, 21, 21.5].forEach((b) => m.tick(b, { freq: 3000 + (b - 20) * 400, gain: 0.07 }));
    },
  });
})();
