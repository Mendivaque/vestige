/* Reel 8 — "crewupa · Buve ile 30 gün".
 * 37.5 s (15 bars @ 96 BPM), ten scenes, every scene at least one bar (2.5 s) so
 * everything can be read. Buve, the crewupa mascot, is a cut-out puppet: body and
 * waving hand are separate layers (assets/buve-body.png, assets/buve-hand.png), so
 * he waves, breathes, squashes, hops and rides a 30-day grid.
 *   bar 0–1   intro: Buve pops in, "Ekibini kur." → giant 30
 *   bar 2–3   the problem: a group chat that goes silent
 *   bar 4     rescue: bitiş çizgisi / haftalık ritim / bir sahne
 *   bar 5–6   taahhüde göre eşleşme
 *   bar 7     haftalık check-in
 *   bar 8–10  the 30-day journey, zoom into the last cell
 *   bar 11    Demo Day
 *   bar 12    roles
 *   bar 13    apply
 *   bar 14    lockup (≈1.4 s final hold)
 * All copy and facts come from crewupa.com.
 */
(function () {
  const BPM = 96, SPB = 60 / BPM, B = (b) => b * SPB;
  const E = V.ease, W = V.W, H = V.H, CX = W / 2, CY = H / 2, TAU = V.TAU;
  const C = {
    bg: '#0b0816', bg2: '#141026', bg3: '#1e1b3a', mid: '#5b21b6', v1: '#6d28d9', v2: '#8b5cf6', v3: '#a78bfa', v4: '#c4b5fd',
    lav: '#f1ebff', cream: '#fbf7f2', teal: '#2cc9a8', mint: '#6ee7b7', org: '#f97316', amb: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
  };
  const DISP = 'Unbounded', SANS = 'Geist', MONO = 'Geist Mono';
  const prog = V.prog, clamp = V.clamp, lerp = V.lerp;
  const en = (b, t0, d = 0.5, e = E.outExpo) => e(prog(b, t0, t0 + d));
  const END = 60;

  /* ---------------- assets ---------------- */
  const IM = {};
  const BV = { feetX: 591, feetY: 1016, top: 24, pivot: [244, 488] };
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

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
  function card(ctx, x, y, w, h, r, fill, stroke, shadow = false) {
    ctx.save();
    if (shadow) { ctx.shadowColor = 'rgba(11,8,22,0.28)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 18; }
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.shadowColor = 'transparent';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
  }
  const SCR = 'ABCDEF0123456789#/<>*+=';
  const decode = (s, p, seed = 0, tb = 0) => {
    let out = ''; const q = p * 1.3;
    for (let i = 0; i < s.length; i++) { const k = i / s.length; if (q >= k + 0.3 || s[i] === ' ') out += s[i]; else if (q > k) out += SCR[Math.floor(V.hash(i * 7.3 + seed + Math.floor(tb * 30)) * SCR.length)]; }
    return out;
  };
  function sparkle(ctx, x, y, r, col, a = 1, rot = 0) {
    if (a <= 0.01 || r <= 0.5) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const bolt = (ctx, x, y, s, col) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(6, -20); ctx.lineTo(-10, 4); ctx.lineTo(0, 4); ctx.lineTo(-6, 20); ctx.lineTo(10, -4); ctx.lineTo(0, -4); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };

  /** Soft, layered background: base + two drifting light blobs + a faint parallax dot grid. */
  function stage(ctx, b, base, c1, c2, o = {}) {
    V.bg(ctx, base);
    const blob = (cx, cy, r, col, a) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, V.rgba(col, a)); g.addColorStop(1, V.rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
    blob(CX + Math.sin(b * 0.3) * 200, 600 + Math.cos(b * 0.23) * 140, 950, c1, o.a1 ?? 0.55);
    blob(CX + Math.cos(b * 0.27 + 1) * 280, 1350 + Math.sin(b * 0.31) * 170, 850, c2, o.a2 ?? 0.4);
    const da = o.dots ?? 0.07, off = (b * 6) % 64;
    ctx.fillStyle = V.rgba(o.dotCol || '#ffffff', da);
    for (let y = -64 + off; y < H + 64; y += 64) for (let x = 32; x < W + 64; x += 64) ctx.fillRect(x - 2, y - 2, 4, 4);
  }

  /* ---------------- Buve ---------------- */
  /** Draw Buve with his feet at (x, y). h = height of the figure in px. */
  function buve(ctx, o) {
    if (!IM.body) return;
    const k = o.h / (BV.feetY - BV.top);
    const gy = o.gy != null ? o.gy : o.y, lift = Math.max(0, gy - o.y), lf = clamp(lift / (o.h * 1.2));
    if (o.shadow !== false) {
      ctx.save(); ctx.globalAlpha = 0.3 * (1 - lf * 0.7) * (o.alpha ?? 1); ctx.translate(o.x, gy + 6); ctx.scale(1, 0.13);
      ctx.beginPath(); ctx.arc(0, 0, o.h * 0.34 * (1 - lf * 0.5), 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0);
    ctx.scale((o.flip ? -1 : 1) * k * (o.sx || 1), k * (o.sy || 1)); ctx.translate(-BV.feetX, -BV.feetY);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(IM.body, 0, 0);
    const ang = (o.wave || 0) * 0.24 * Math.sin(o.phase || 0) + (o.armBias || 0);
    ctx.translate(BV.pivot[0], BV.pivot[1]); ctx.rotate(ang); ctx.translate(-BV.pivot[0], -BV.pivot[1]);
    ctx.drawImage(IM.hand, 0, 0);
    ctx.restore();
  }
  const idle = (b, i = 0) => ({ sx: 1 - 0.007 * Math.sin(b * 2.2 + i), sy: 1 + 0.014 * Math.sin(b * 2.2 + i), rot: 0.012 * Math.sin(b * 1.3 + i) });
  /** Squash-and-stretch state for a hop, p in 0..1 (anticipation → air → landing). */
  function hopState(p, Hh) {
    if (p <= 0 || p >= 1) return { dy: 0, sx: 1, sy: 1 };
    if (p < 0.14) { const q = E.inOutSine(p / 0.14); return { dy: 0, sx: 1 + 0.14 * q, sy: 1 - 0.16 * q }; }
    if (p < 0.86) { const q = (p - 0.14) / 0.72, st = Math.abs(1 - 2 * q); return { dy: Hh * 4 * q * (1 - q), sx: 1 - 0.1 * st, sy: 1 + 0.14 * st }; }
    const q = (p - 0.86) / 0.14, w = Math.exp(-q * 3.5) * Math.cos(q * 7);
    return { dy: 0, sx: 1 + 0.18 * w, sy: 1 - 0.2 * w };
  }

  /* ---------------- role shapes (for the roles scene) ---------------- */
  function shape(ctx, k, x, y, S, rot, fill) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineJoin = 'round';
    if (k === 'sq') { ctx.beginPath(); ctx.roundRect(-S / 2, -S / 2, S, S, S * 0.24); ctx.fill(); }
    else if (k === 'ci') { ctx.beginPath(); ctx.arc(0, 0, S / 2, 0, TAU); ctx.fill(); }
    else if (k === 'tr') { const r = S * 0.44; ctx.lineWidth = S * 0.18; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * TAU) / 3; const px = Math.cos(a) * r, py = Math.sin(a) * r + r * 0.14; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { V.star(ctx, 0, 0, S * 0.46, S * 0.22, 5, 0); ctx.lineWidth = S * 0.12; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  /* =========================================================
     INTRO (b 0–8): Buve pops in, "Ekibini kur.", then the giant 30
     ========================================================= */
  function drawIntro(ctx, t, b) {
    stage(ctx, b, C.v1, C.v2, C.mid, { a1: 0.5, a2: 0.55 });
    // big disc + rings behind Buve
    const cr = lerp(470, 560, E.outCubic(clamp(b / 2))) + 14 * Math.sin(b * 1.3);
    const shift = E.inOutCubic(prog(b, 4.0, 5.3));
    dot(ctx, lerp(CX, 830, shift), lerp(1180, 1330, shift), lerp(cr, 300, shift), C.mid);
    ring(ctx, CX, 1180, 620 + 30 * Math.sin(b * 1.1), 3, V.rgba(C.lav, 0.18), 1 - shift);

    // ---- hook copy
    const hookA = 1 - en(b, 3.6, 0.45, E.inCubic);
    if (hookA > 0.01) {
      ctx.save(); ctx.globalAlpha = hookA;
      const s1 = fitSize(ctx, 'Ekibini', DISP, 820, 900, 165);
      rise(ctx, 'Ekibini', CX, 400, s1, C.lav, en(b, 1.5, 0.7), { w: 900, tr: -3 });
      const wk = widthOf(ctx, 'kur', DISP, 900) * s1, dr = s1 * 0.085, gap = s1 * 0.05, tot = wk + gap + dr * 2, x0 = CX - tot / 2, yb = 400 + s1 * 1.08;
      const pk = en(b, 1.75, 0.7);
      if (pk > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, yb - s1 * 0.75, W, s1 * 1.5); ctx.clip(); word(ctx, 'kur', x0, yb + (1 - pk) * s1 * 1.15, s1, C.lav, { w: 900, align: 'left', tr: -3 }); ctx.restore(); }
      const dp = prog(b, 2.25, 2.7), capPx = capH(ctx, DISP, 900) * s1, dyb = yb + capPx / 2 - dr;
      if (dp > 0) { const land = V.hit(t, B(2.62), 0.07) * (dp >= 1 ? 1 : 0); ctx.save(); ctx.translate(x0 + wk + gap + dr, lerp(yb - 700, dyb, E.outBounce(dp))); ctx.scale(1 + 0.3 * land, 1 - 0.25 * land); dot(ctx, 0, 0, dr, C.amb); ctx.restore(); }
      mono(ctx, 'SEZON 01 · BAŞVURULAR AÇIK', CX, 322, 24, C.lav, { alpha: en(b, 2.9, 0.5, E.outCubic) });
      ctx.restore();
    }
    // ---- the giant 30
    if (b > 3.8) {
      const p = en(b, 4.2, 0.9, (x) => E.outBack(x, 1.5)), out = 1 - en(b, 7.6, 0.35, E.inCubic);
      const s = fitSize(ctx, '30', DISP, 800, 900, 520);
      ctx.save(); ctx.globalAlpha = out; ctx.translate(CX, 620); ctx.rotate(lerp(-0.08, 0, p)); ctx.scale(p, p);
      for (let i = 16; i >= 1; i--) word(ctx, '30', i * 1.7, i * 1.7, s, C.mid, { w: 900, tr: -8 });
      word(ctx, '30', 0, 0, s, C.lav, { w: 900, tr: -8 });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = out;
      rise(ctx, 'günde çık.', CX, 930, 112, C.amb, en(b, 4.9, 0.8), { w: 900, tr: -3 });
      body(ctx, 'Herkes aynı gün başlar.', CX, 1040, 42, C.lav, { w: 700, alpha: en(b, 5.6, 0.6, E.outCubic) });
      body(ctx, "30. gün Demo Day'de ürününü gösterirsin.", CX, 1096, 34, C.v4, { w: 500, alpha: en(b, 6.1, 0.6, E.outCubic) });
      // 30 dots light up like a calendar
      for (let i = 0; i < 30; i++) {
        const r = Math.floor(i / 6), c = i % 6, x = 110 + c * 58, y = 1200 + r * 58, lit = clamp((b - 5.0 - i * 0.075) / 0.25);
        dot(ctx, x, y, 15, V.rgba(C.lav, 0.14)); if (lit > 0) { dot(ctx, x, y, 15 * E.outBack(lit, 2.4), i === 29 ? C.amb : [C.v3, C.teal, C.org, C.pink][Math.min(3, Math.floor(i / 7.5))]); }
      }
      mono(ctx, 'GÜN 01 → 30', 110, 1500, 22, C.v4, { align: 'left', alpha: en(b, 5.3, 0.4) });
      ctx.restore();
    }
    // ---- Buve
    let x = CX, y = 1520, h = 800, sx = 1, sy = 1;
    if (b < 4) {
      const p = clamp((b + 0.5) / 1.3), e = E.outBack(p, 1.25); y = 1520 + (1 - e) * 950;
      sy = 1 + 0.16 * (1 - p); sx = 1 - 0.09 * (1 - p);
      const land = V.hit(t, B(0.8), 0.12) * (b >= 0.8 ? 1 : 0); sx *= 1 + 0.18 * land; sy *= 1 - 0.16 * land;
    } else {
      const hp = prog(b, 4.0, 5.3), e = E.inOutCubic(hp), hs = hopState(hp, 0);
      h = lerp(800, 500, e); x = lerp(CX, 830, e); y = lerp(1520, 1580, e) - Math.sin(Math.PI * hp) * 340;
      sx = 1 - 0.1 * Math.sin(Math.PI * hp); sy = 1 + 0.14 * Math.sin(Math.PI * hp);
      const land = V.hit(t, B(5.3), 0.12) * (b >= 5.3 ? 1 : 0); sx *= 1 + 0.16 * land; sy *= 1 - 0.14 * land;
    }
    const id = idle(b);
    buve(ctx, { x, y, h, sx: sx * id.sx, sy: sy * id.sy, rot: id.rot, wave: 1, phase: b * 7, gy: b < 4 ? 1520 : lerp(1520, 1580, E.inOutCubic(prog(b, 4, 5.3))) });
    // name tag
    const np = E.outBack(prog(b, 2.6, 3.1), 2);
    if (np > 0 && b < 4) { ctx.save(); ctx.translate(120 + 130, 1470); ctx.scale(np, np); pill(ctx, -130, -30, 260, 60, V.rgba(C.bg, 0.55)); mono(ctx, 'BUVE · MASKOT', 0, 1, 20, C.lav, { w: 700 }); ctx.restore(); }
    // twinkles
    [[210, 780], [880, 820], [140, 1150], [930, 1180]].forEach(([sxp, syp], i) => sparkle(ctx, sxp, syp + Math.sin(b * 1.6 + i) * 10, 22 + 8 * Math.sin(b * 2 + i), C.lav, 0.7 * en(b, 1.4 + i * 0.15, 0.5) * hookA, b * 0.5 + i));
  }

  /* =========================================================
     PROBLEM (b 8–16): the group chat that goes silent
     ========================================================= */
  const MSGS = [
    [8.6, 'L', 'ilk toplantı ne zaman?', C.amb, 'M'], [9.15, 'R', 'cumartesi olur', C.v1, ''], [9.7, 'L', "ben landing'e bakarım", C.teal, 'Z'],
    [10.25, 'R', 'ben tasarımı çıkarırım', C.v1, ''], [11.1, 'L', 'bu hafta biraz yoğunum', C.sky, 'D'], [12.0, 'R', 'tamam sorun değil', C.v1, ''],
  ];
  function drawProblem(ctx, t, b) {
    stage(ctx, b, C.bg, C.v1, C.mid, { a1: 0.35, a2: 0.25, dots: 0.05 });
    const silent = en(b, 14.6, 0.5, E.outCubic);
    // headline (two acts)
    const act1 = b < 12.2, t0 = act1 ? 8.3 : 12.5;
    const l1 = act1 ? ['Yan projeler', 'fikirsizlikten', 'ölmez.'] : ['Üçüncü haftada', 'sessizleşen', 'gruplarda ölür.'];
    const sz = Math.min(fitSize(ctx, 'fikirsizlikten', DISP, 860, 800, 74), fitSize(ctx, 'Üçüncü haftada', DISP, 860, 800, 74)), lh = sz * 1.32;
    const out = act1 ? 1 - en(b, 11.7, 0.4, E.inCubic) : 1;
    l1.forEach((s, i) => rise(ctx, s, 90, 390 + i * lh, sz, !act1 && i === 2 ? C.pink : C.lav, en(b, t0 + i * 0.22, 0.7) * out, { align: 'left', tr: -1 }));
    if (act1) { const sp = en(b, 10.6, 0.5, E.inOutCubic); if (sp > 0) { ctx.fillStyle = C.pink; ctx.fillRect(84, 390 + 2 * lh - 3, (widthOf(ctx, 'ölmez.', DISP, 800) * sz + 12) * sp, 9); } }
    // chat card
    const cx0 = 90, cy0 = 690, cw = 900, ch = 800, cin = en(b, 8.0, 0.6);
    ctx.save(); ctx.translate(0, (1 - cin) * 140); ctx.globalAlpha = cin;
    card(ctx, cx0, cy0, cw, ch, 48, C.bg2, V.rgba(C.v2, 0.35), true);
    [C.amb, C.teal, C.sky, C.pink].forEach((c, i) => { dot(ctx, cx0 + 70 + i * 36, cy0 + 66, 28, c); ring(ctx, cx0 + 70 + i * 36, cy0 + 66, 28, 4, C.bg2); });
    body(ctx, 'Yan proje ekibi', cx0 + 240, cy0 + 52, 36, C.lav, { align: 'left', w: 700 }); mono(ctx, '4 KİŞİ', cx0 + 240, cy0 + 92, 20, C.v3, { align: 'left' });
    const wk = b < 10.4 ? 1 : b < 12.5 ? 2 : 3, wbeat = [8, 10.4, 12.5][wk - 1];
    pill(ctx, cx0 + cw - 230, cy0 + 36, 190, 58, wk === 3 ? V.rgba(C.pink, 0.25) : V.rgba(C.v2, 0.3), wk === 3 ? C.pink : C.v2);
    mono(ctx, decode(`${wk}. HAFTA`, prog(b, wbeat, wbeat + 0.4), wk, t), cx0 + cw - 135, cy0 + 65, 22, wk === 3 ? C.pink : C.v4, { w: 700 });
    ctx.fillStyle = V.rgba(C.v2, 0.25); ctx.fillRect(cx0 + 30, cy0 + 130, cw - 60, 2);
    MSGS.forEach(([mb, side, txt, col, ini], i) => {
      const p = clamp((b - mb) / 0.4); if (p <= 0) return;
      const w = V.measure(ctx, txt, { size: 36, family: SANS, weight: 500 }) + 64, h = 72, y = cy0 + 160 + i * 92;
      const x = side === 'L' ? cx0 + 100 : cx0 + cw - 32 - w, sc = lerp(0.6, 1, E.outBack(p, 2.4));
      ctx.save(); ctx.globalAlpha = E.outCubic(p); const ox = side === 'L' ? x : x + w; ctx.translate(ox, y + h); ctx.scale(sc, sc); ctx.translate(-ox, -(y + h));
      if (side === 'L') { dot(ctx, cx0 + 60, y + h / 2, 30, col); word(ctx, ini, cx0 + 60, y + h / 2, 30, C.bg, { w: 900 }); }
      card(ctx, x, y, w, h, 36, side === 'L' ? '#2a2550' : C.v1); body(ctx, txt, x + 32, y + h / 2 + 1, 36, C.lav, { align: 'left', w: 500 });
      ctx.restore();
    });
    const ty = clamp((b - 13.6) / 0.35) * (1 - prog(b, 14.7, 14.9));
    if (ty > 0) { const y = cy0 + 160 + 6 * 92; dot(ctx, cx0 + 60, y + 36, 30, C.teal); card(ctx, cx0 + 100, y, 140, 72, 36, '#2a2550'); for (let i = 0; i < 3; i++) dot(ctx, cx0 + 140 + i * 30, y + 36 - Math.abs(Math.sin(b * 6 - i * 0.7)) * 10, 7.5, C.v4); }
    if (silent > 0) { ctx.fillStyle = V.rgba(C.bg, 0.74 * silent); ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch, 48); ctx.fill(); }
    ctx.restore();
    if (silent > 0.05) mono(ctx, 'SESSİZLİK', CX, cy0 + ch / 2 + 20, 36, C.pink, { alpha: silent * (b < 15.5 ? 1 : 1 - prog(b, 15.5, 15.85)), tr: 12 });
    // the finish line draws itself, and the next scene grows out of it
    if (b >= 15.55) { const p = E.inExpo(prog(b, 15.6, 16)), hh = 6 + 26 * p * p; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H * (1 - 0.0)); ctx.fillStyle = C.lav; ctx.fillRect(CX - (W / 2) * (0.02 + p), CY - hh / 2, W * (0.02 + p), hh); }
  }

  /* =========================================================
     RESCUE (b 16–20): bitiş çizgisi · haftalık ritim · bir sahne
     ========================================================= */
  function iconFlag(ctx, x, y, s, col, b) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.fillRect(-16, -26, 4, 54);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const wv = Math.sin(b * 5 + c * 0.9) * 2.5; ctx.fillStyle = (r + c) % 2 ? col : V.rgba(col, 0.25); ctx.fillRect(-12 + c * 10, -26 + r * 10 + wv, 10, 10); }
    ctx.restore();
  }
  function iconPulse(ctx, x, y, s, col, b) { for (let i = 0; i < 3; i++) { const p = V.fract(b * 0.5 - i * 0.3); ring(ctx, x, y, (6 + p * 30) * s, 3 * s, col, 1 - p); } dot(ctx, x, y, 7 * s, col); }
  function iconStage(ctx, x, y, s, col) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const g = ctx.createLinearGradient(0, -26, 0, 22); g.addColorStop(0, V.rgba(col, 0.95)); g.addColorStop(1, V.rgba(col, 0.15)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-5, -26); ctx.lineTo(5, -26); ctx.lineTo(28, 24); ctx.lineTo(-28, 24); ctx.closePath(); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 26, 30, 7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  function drawRescue(ctx, t, b) {
    stage(ctx, b, C.v1, C.v2, C.mid, { a1: 0.5, a2: 0.5 });
    rise(ctx, 'Crewupa sana', 90, 385, 74, C.lav, en(b, 16.4, 0.7), { align: 'left', w: 900, tr: -2 });
    rise(ctx, 'verir:', 90, 385 + 100, 74, C.amb, en(b, 16.6, 0.7), { align: 'left', w: 900, tr: -2 });
    const items = [['bitiş çizgisi', C.amb, 17.2], ['haftalık ritim', C.teal, 18.0], ['bir sahne', C.pink, 18.8]];
    items.forEach(([txt, col, tb], i) => {
      const p = en(b, tb, 0.7, (x) => E.outBack(x, 1.7)), y = 560 + i * 138;
      if (p <= 0) return;
      ctx.save(); ctx.translate((1 - p) * 700, 0); ctx.globalAlpha = clamp(p * 2);
      card(ctx, 90, y, 900, 118, 40, V.rgba(C.bg, 0.32), V.rgba(C.lav, 0.28), true);
      dot(ctx, 90 + 68, y + 59, 44, V.rgba(col, 0.22));
      if (i === 0) iconFlag(ctx, 158, y + 59, 1, col, b); else if (i === 1) iconPulse(ctx, 158, y + 59, 1, col, b); else iconStage(ctx, 158, y + 59, 1, col);
      word(ctx, txt, 232, y + 59, 50, C.lav, { align: 'left', w: 800, tr: -1 });
      ctx.restore();
    });
    // Buve jumps in from the right and lands centre
    const jp = prog(b, 16.15, 17.1), e = E.inOutCubic(jp), hs = hopState(clamp((b - 16.1) / 1.0), 0);
    const x = lerp(1350, CX, e), y = 1570 - Math.sin(Math.PI * jp) * 520, land = V.hit(t, B(17.1), 0.12) * (b >= 17.1 ? 1 : 0), id = idle(b);
    buve(ctx, { x, y, h: 610, sx: (1 - 0.1 * Math.sin(Math.PI * jp)) * (1 + 0.16 * land) * id.sx, sy: (1 + 0.14 * Math.sin(Math.PI * jp)) * (1 - 0.14 * land) * id.sy, rot: lerp(0.25, 0, e) + id.rot, wave: b > 17 ? 1 : 0.3, phase: b * 7, gy: 1570 });
    if (b > 17.2) { const p = en(b, 17.2, 0.5, E.outCubic); sparkle(ctx, 820, 1000 + Math.sin(b * 2) * 10, 30, C.lav, 0.8 * p, b); sparkle(ctx, 250, 1150 + Math.sin(b * 2.3) * 10, 22, C.amb, 0.8 * p, -b); }
  }

  /* =========================================================
     MATCH (b 20–28): taahhüde göre eşleşme
     ========================================================= */
  const PEOPLE = [
    { n: 'Mert', h: 15, c: C.amb }, { n: 'Zeynep', h: 12, c: C.teal }, { n: 'Deniz', h: 14, c: C.sky }, { n: 'Can', h: 4, c: C.pink },
  ];
  function drawMatch(ctx, t, b) {
    stage(ctx, b, C.lav, C.v4, C.v3, { a1: 0.55, a2: 0.4, dots: 0.09, dotCol: '#6d28d9' });
    rise(ctx, 'Taahhüde göre', 90, 390, 66, C.bg, en(b, 20.4, 0.7), { align: 'left', w: 900, tr: -2 });
    rise(ctx, 'eşleşme', 90, 480, 66, C.v1, en(b, 20.6, 0.7), { align: 'left', w: 900, tr: -2 });
    const RY = 590, RH = 122, RG = 18;
    const canOut = E.inOutCubic(prog(b, 25.0, 26.0));
    // team bracket + chip on the right of the first three rows
    const bp = en(b, 24.0, 0.7, E.inOutCubic);
    if (bp > 0) {
      ctx.save(); ctx.strokeStyle = C.v1; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); const yA = RY + 20, yB = RY + 2 * (RH + RG) + RH - 20;
      ctx.moveTo(672, yA); ctx.lineTo(704, yA); ctx.lineTo(704, lerp(yA, yB, bp)); ctx.lineTo(672, lerp(yA, yB, bp)); ctx.stroke(); ctx.restore();
      const cp = E.outBack(prog(b, 24.4, 24.95), 2), my = (RY + RY + 2 * (RH + RG) + RH) / 2;
      if (cp > 0) { ctx.save(); ctx.translate(704, my); ctx.scale(cp, cp); pill(ctx, 18, -32, 230, 64, C.v1); mono(ctx, 'EKİP 07', 133, 1, 24, C.lav, { w: 800 }); ctx.restore(); }
    }
    PEOPLE.forEach((p, i) => {
      const inP = E.outBack(prog(b, 20.7 + i * 0.4, 21.3 + i * 0.4), 1.8);
      if (inP <= 0) return;
      let y = RY + i * (RH + RG), x = 90;
      if (i === 3) { y = lerp(y, 1210, canOut); x = lerp(x, 90, canOut); }
      ctx.save(); ctx.translate((1 - inP) * -700, 0); ctx.globalAlpha = clamp(inP * 2);
      card(ctx, x, y, 570, RH, 38, C.cream, i === 3 && canOut > 0.5 ? V.rgba(C.v1, 0.6) : null, true);
      dot(ctx, x + 64, y + RH / 2, 42, p.c); word(ctx, p.n[0], x + 64, y + RH / 2 + 1, 42, C.bg, { w: 900 });
      body(ctx, p.n, x + 130, y + 42, 36, C.bg, { align: 'left', w: 800 }); mono(ctx, `${p.h} SA/HF`, x + 130, y + 88, 22, C.v1, { align: 'left', w: 700 });
      const bw = 250, bh = 14, bx = x + 300, byy = y + RH / 2 - 7, fp = E.outExpo(prog(b, 21.3 + i * 0.4, 22.6 + i * 0.4));
      ctx.fillStyle = V.rgba(C.v1, 0.15); ctx.beginPath(); ctx.roundRect(bx, byy, bw, bh, 7); ctx.fill();
      ctx.fillStyle = i === 3 ? C.pink : C.v1; ctx.beginPath(); ctx.roundRect(bx, byy, Math.max(14, bw * (p.h / 15) * fp), bh, 7); ctx.fill();
      ctx.restore();
    });
    const lp = en(b, 25.6, 0.6, E.outCubic);
    if (lp > 0) { mono(ctx, '5 SAATLİK BANT', 90 + 285, 1180, 20, C.v1, { alpha: lp * canOut }); }
    ['Haftada 5 saat ayıran,', '15 saat ayıranla aynı', 'ekibe düşmez.'].forEach((ln, i) => body(ctx, ln, 90, 1385 + i * 50, 36, C.bg, { align: 'left', w: 700, alpha: en(b, 25.4 + i * 0.2, 0.6, E.outCubic) }));
    // Buve, bottom right
    const jp = prog(b, 20.2, 21.0), id = idle(b, 1), land = V.hit(t, B(21.0), 0.12) * (b >= 21.0 ? 1 : 0);
    buve(ctx, { x: 860, y: 1560 + (1 - E.outBack(jp, 1.3)) * 700, h: 520, sx: (1 + 0.16 * land) * id.sx, sy: (1 - 0.14 * land) * id.sy, rot: id.rot, wave: 1, phase: b * 7 + 1, gy: 1560 });
    // when the team forms, Buve celebrates with a small hop
    const hp = prog(b, 24.5, 25.3), hs = hopState(hp, 90);
    if (hp > 0 && hp < 1) { /* overdraw hop on top of the idle draw */ }
  }

  /* =========================================================
     CHECK-IN (b 28–32): haftalık check-in
     ========================================================= */
  function drawCheck(ctx, t, b) {
    stage(ctx, b, C.teal, '#8ff0d9', '#0f8f77', { a1: 0.5, a2: 0.45, dots: 0.09, dotCol: '#0b0816' });
    rise(ctx, 'Haftalık', 90, 385, 84, C.bg, en(b, 28.4, 0.7), { align: 'left', w: 900, tr: -2 });
    rise(ctx, 'check-in', 90, 385 + 104, 84, C.bg, en(b, 28.6, 0.7), { align: 'left', w: 900, tr: -2 });
    // notification
    const nin = E.outBack(prog(b, 28.8, 29.5), 1.8), shake = Math.sin(b * 40) * 3 * V.hit(t, B(29.3), 0.3);
    ctx.save(); ctx.translate(shake, (1 - nin) * -360); ctx.globalAlpha = clamp(nin * 2);
    card(ctx, 90, 660, 900, 200, 44, C.cream, null, true);
    card(ctx, 126, 698, 88, 88, 24, C.v1); bolt(ctx, 170, 742, 1.15, C.teal);
    mono(ctx, 'CREWUPA · ŞİMDİ', 242, 706, 20, '#6b6480', { align: 'left' });
    body(ctx, 'Ekip 07, 2. hafta check-in zamanı.', 242, 752, 34, C.bg, { align: 'left', w: 800 }); body(ctx, '5 dakika sürer.', 242, 800, 34, C.bg, { align: 'left', w: 500 });
    mono(ctx, '20:00', 952, 706, 22, C.v1, { align: 'right', w: 700 });
    ctx.restore();
    // three prompts
    [['Yapılanlar', 90, 240], ['Sıradaki adım', 350, 310], ['Engeller', 674, 200]].forEach(([s, x, w], i) => {
      const p = E.outBack(prog(b, 29.8 + i * 0.35, 30.3 + i * 0.35), 2); if (p <= 0) return;
      ctx.save(); ctx.translate(x + w / 2, 905); ctx.scale(p, p); pill(ctx, -w / 2, -36, w, 72, C.bg); body(ctx, '✓ ' + s, 0, 1, 30, C.lav, { w: 700 }); ctx.restore();
    });
    // 5-minute ring
    const rp = E.inOutCubic(prog(b, 29.3, 31.6)), R = 175, rx = 290, ry = 1220, rin = en(b, 29.0, 0.6);
    ctx.save(); ctx.globalAlpha = rin;
    ring(ctx, rx, ry, R, 26, V.rgba(C.bg, 0.16));
    ctx.strokeStyle = C.bg; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + TAU * rp); ctx.stroke();
    const secs = Math.round(300 * (1 - rp)); word(ctx, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, rx, ry - 6, 76, C.bg, { fam: MONO, w: 800, tr: -2 });
    mono(ctx, '5 DAKİKA', rx, ry + 62, 20, C.bg);
    ctx.restore();
    // Buve with his headset, big, bottom right
    const jp = prog(b, 28.3, 29.2), id = idle(b, 2), land = V.hit(t, B(29.2), 0.12) * (b >= 29.2 ? 1 : 0);
    buve(ctx, { x: 830, y: 1570 + (1 - E.outBack(jp, 1.3)) * 800, h: 590, sx: (1 + 0.16 * land) * id.sx, sy: (1 - 0.14 * land) * id.sy, rot: id.rot, wave: 1, phase: b * 7 + 2, gy: 1570 });
    if (b > 30) { const p = prog(b, 30, 31.5); [0, 0.3].forEach((d, k) => { const q = clamp(p - d); ring(ctx, 700, 1080, 30 + E.outExpo(q) * 170, 6 * (1 - q) + 1, C.bg, (1 - q) * 0.6); }); }
  }

  /* =========================================================
     JOURNEY (b 32–44): Buve crosses 30 days, then the zoom into the last cell
     ========================================================= */
  const JG = { CELL: 122, GAP: 22, GX: 119, GY: 790 }, JP = JG.CELL + JG.GAP;
  const jXY = (i) => { i = clamp(i, 0, 29); const r = Math.floor(i / 6), c0 = i % 6, c = r % 2 === 0 ? c0 : 5 - c0; return [JG.GX + c * JP + JG.CELL / 2, JG.GY + r * JP + JG.CELL / 2]; };
  const jWeek = (d) => (d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5);
  const jCol = (d) => [C.v2, C.v2, C.teal, C.org, C.pink, C.amb][jWeek(d)];
  const KS = [[33.0, 0], [34.6, 2], [35.9, 6], [37.4, 14], [39.0, 17], [40.6, 19.5], [41.8, 26], [43.4, 29]];
  const sJ = (b) => {
    if (b <= KS[0][0]) return 0;
    for (let i = 0; i < KS.length - 1; i++) { const [b0, s0] = KS[i], [b1, s1] = KS[i + 1]; if (b < b1) { const p = (b - b0) / (b1 - b0); return lerp(s0, s1, lerp(p, p * p * (3 - 2 * p), 0.75)); } }
    return 29;
  };
  const JM = [
    { b: 33.0, l: 'GÜN 01', t: 'Tanışma', s: 'Herkes aynı gün başlar.', c: C.v3 }, { b: 34.6, l: 'GÜN 03', t: 'Fikir kilitlenir', s: 'Tek cümlelik ürün tanımı.', c: C.v3 },
    { b: 35.9, l: 'GÜN 07', t: 'İlk check-in', s: 'Beş dakika, her hafta.', c: C.v3 }, { b: 37.4, l: 'GÜN 15', t: 'Yarı yol', s: 'Çalışan ilk sürüm.', c: C.teal },
    { b: 39.0, l: 'GÜN 18', t: 'Zor hafta', s: 'Motivasyonun düştüğü yer.', c: C.org }, { b: 40.6, l: 'HAFTALIK', t: 'Ritim geri gelir', s: 'Yapılanlar, sıradaki adım, engeller.', c: C.teal },
    { b: 41.8, l: 'GÜN 27', t: 'Cila', s: 'Landing yazılır, demo çekilir.', c: C.pink }, { b: 43.35, l: 'GÜN 30', t: 'Demo Day', s: 'Ürün vitrine çıkar.', c: C.amb },
  ];
  function drawJourney(ctx, t, b) {
    const s = sJ(b), zor = V.win(b, 38.7, 40.7, 0.5, 0.5, E.outCubic, E.inCubic), dd = clamp(Math.floor(s) + 1, 1, 30);
    stage(ctx, b, C.bg, V.mix(C.v1, C.org, zor), V.mix(C.mid, C.org, zor * 0.6), { a1: 0.4, a2: 0.28, dots: 0.05 });
    const [px, py] = jXY(29);
    const kz = 1 + E.inExpo(prog(b, 43.2, 44.05)) * 40, push = 1 + 0.03 * E.inOutSine(prog(b, 33, 43));
    ctx.save(); ctx.translate(px, py); ctx.scale(push * kz, push * kz); ctx.translate(-px, -py);
    // grid
    for (let i = 0; i < 30; i++) {
      const [x, y] = jXY(i), r = Math.floor(i / 6), c = i % 6, d = i + 1, wc = jCol(d);
      const pop = E.outBack(prog(b, 32.1 + (r + c) * 0.06, 32.7 + (r + c) * 0.06), 2.2); if (pop <= 0) continue;
      const amt = clamp((s - i) * 1.4 + 0.55) * (b > 32.9 ? 1 : 0), bump = Math.max(0, 1 - Math.abs(s - i) * 1.3) * (b > 33 ? 1 : 0);
      const warn = d >= 15 && d <= 21 ? V.win(b, 38.3, 40.6, 0.6, 0.3) : 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(pop * (1 + 0.1 * bump), pop * (1 + 0.1 * bump));
      ctx.beginPath(); ctx.roundRect(-JG.CELL / 2, -JG.CELL / 2, JG.CELL, JG.CELL, 30); ctx.fillStyle = C.bg2; ctx.fill();
      if (warn > 0 && amt < 1) { ctx.strokeStyle = V.rgba(C.org, 0.4 + 0.3 * Math.sin(b * 6 + i) * warn); ctx.lineWidth = 3; ctx.stroke(); } else { ctx.strokeStyle = V.rgba(C.v2, 0.22); ctx.lineWidth = 2; ctx.stroke(); }
      if (amt > 0) { ctx.globalAlpha = amt * 0.95; ctx.fillStyle = i === 29 ? C.amb : wc; ctx.fill(); ctx.globalAlpha = 1; }
      mono(ctx, String(d).padStart(2, '0'), -JG.CELL / 2 + 16, -JG.CELL / 2 + 24, 19, amt > 0.5 ? C.bg : V.rgba(C.lav, 0.4), { align: 'left', w: 700 });
      if (i === 29) { V.star(ctx, 0, 6, 32, 15, 5, 0); ctx.fillStyle = amt > 0.5 ? C.bg : C.amb; ctx.fill(); }
      ctx.restore();
    }
    // Buve
    const ii = Math.floor(clamp(s, 0, 28.999)), f = clamp(s, 0, 29) - ii, a = jXY(ii), c2 = jXY(ii + 1), sm = f * f * (3 - 2 * f), ef = lerp(f, sm, 0.65);
    let bx = lerp(a[0], c2[0], ef), by = lerp(a[1], c2[1], ef) + 52 - Math.sin(Math.PI * f) * lerp(34, 14, zor);
    let sx = 1 - 0.06 * Math.sin(Math.PI * f), sy = 1 + 0.12 * Math.sin(Math.PI * f), rot = 0.16 * Math.sin(b * 7) * zor;
    if (b < 33.0) { const hp = prog(b, 32.2, 33.0), hs = hopState(hp, 0); const e = E.outCubic(hp); bx = lerp(-160, jXY(0)[0], e); by = jXY(0)[1] + 52 - Math.sin(Math.PI * hp) * 320; sx = 1 - 0.1 * Math.sin(Math.PI * hp); sy = 1 + 0.14 * Math.sin(Math.PI * hp); }
    const land = Math.pow(Math.max(0, 1 - f * 5), 2) * (s > 0 ? 1 : 0);
    sx *= 1 + 0.2 * land; sy *= 1 - 0.22 * land;
    // arrival jump at the last cell
    const aj = hopState(prog(b, 43.35, 44.0), 70); by -= aj.dy; sx *= aj.sx; sy *= aj.sy;
    const id = idle(b);
    buve(ctx, { x: bx, y: by, h: 300, sx: sx * id.sx, sy: sy * id.sy, rot: rot + id.rot, wave: b > 33 ? (zor > 0.3 ? 0.4 : 1) : 0.5, phase: b * 7, gy: by + Math.sin(Math.PI * f) * lerp(34, 14, zor) });
    // sweat drops in the hard week
    if (zor > 0.2) for (let k = 0; k < 3; k++) { const q = V.fract(b * 0.9 + k * 0.33); dot(ctx, bx + 34 + k * 14, by - 250 + q * 70, 6 * (1 - q * 0.5), V.rgba(C.sky, (1 - q) * zor)); }
    // check-in ping
    if (b >= 40.6) { const p = prog(b, 40.6, 41.7); [0, 0.25].forEach((d, k) => { const q = clamp(p - d); ring(ctx, bx, by - 130, 40 + E.outExpo(q) * 520, 9 * (1 - q) + 1.5, k ? C.lav : C.teal, 1 - q); }); }
    if (b > 43.2) { const p = prog(b, 43.2, 43.9); ring(ctx, px, py, 60 + p * 420, 10 * (1 - p) + 1, C.amb, 1 - p); }
    ctx.restore();

    // ---- HUD (fades before the zoom)
    const ui = (1 - en(b, 42.9, 0.35, E.inCubic)) * en(b, 32.0, 0.6);
    if (ui > 0.01) {
      ctx.save(); ctx.globalAlpha = ui;
      word(ctx, '30 günde çık.', 90, 360, 58, C.lav, { align: 'left', w: 900, tr: -1.5 });
      mono(ctx, `HAFTA ${jWeek(dd)}${zor > 0.3 ? ' · ZOR HAFTA' : ''}`, 90, 430, 22, jCol(dd), { align: 'left', w: 700 });
      mono(ctx, 'GÜN', 990, 300, 22, C.v4, { align: 'right' });
      const pop = 1 + 0.12 * Math.pow(1 - V.fract(Math.max(0, s)), 4);
      ctx.save(); ctx.translate(990, 430); ctx.scale(pop, pop); ctx.translate(-990, -430);
      word(ctx, String(dd).padStart(2, '0'), 990, 430, 150, C.lav, { align: 'right', w: 900, tr: -5 }); ctx.restore();
      mono(ctx, '/30', 990, 520, 26, jCol(dd), { align: 'right' });
      // milestone caption
      JM.forEach((m, i) => {
        const nxt = JM[i + 1] ? JM[i + 1].b : 43.0, pin = E.outExpo(prog(b, m.b - 0.1, m.b + 0.35)), pout = 1 - E.inCubic(prog(b, nxt - 0.35, nxt - 0.05));
        if (b < m.b - 0.1 || b > nxt) return;
        ctx.save(); ctx.globalAlpha = pin * pout; ctx.translate(0, (1 - pin) * 50);
        card(ctx, 90, 548, 900, 190, 40, V.rgba(C.bg, 0.6), V.rgba(m.c, 0.6));
        ctx.fillStyle = m.c; ctx.fillRect(126, 580, 90, 8);
        mono(ctx, m.l, 126, 618, 22, m.c, { align: 'left', w: 700 }); word(ctx, m.t, 126, 670, Math.min(56, fitSize(ctx, m.t, DISP, 800, 800)), C.lav, { align: 'left', tr: -1 });
        body(ctx, m.s, 126, 716, 32, C.v4, { align: 'left', w: 500 });
        if (m.l === 'HAFTALIK') bolt(ctx, 930, 640, 1.6, C.teal);
        ctx.restore();
      });
      ctx.restore();
    }
  }

  /* =========================================================
     DEMO DAY (b 44–48): podium, confetti, Buve on top
     ========================================================= */
  const CR = V.rng(909);
  const CONF = Array.from({ length: 90 }, () => ({ a: -Math.PI / 2 + (CR() - 0.5) * 3.6, sp: 500 + CR() * 1400, k: ['sq', 'ci', 'tr', 'st'][Math.floor(CR() * 4)], c: [C.sky, C.pink, C.teal, C.cream, C.bg, C.v1][Math.floor(CR() * 6)], S: 24 + CR() * 32, rs: (CR() - 0.5) * 12, r0: CR() * 6 }));
  function drawDemo(ctx, t, b) {
    V.bg(ctx, C.amb);
    const rp = en(b, 44, 0.9, E.outCubic);
    ctx.save(); ctx.translate(CX, 900); ctx.rotate(b * 0.1);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.08) * 1700 * rp, Math.sin(a - 0.08) * 1700 * rp); ctx.lineTo(Math.cos(a + 0.08) * 1700 * rp, Math.sin(a + 0.08) * 1700 * rp); ctx.closePath(); ctx.fillStyle = 'rgba(11,8,22,0.07)'; ctx.fill(); }
    ctx.restore();
    const s = fitSize(ctx, 'Demo Day', DISP, 860, 900, 165);
    rise(ctx, 'Demo Day', CX, 420, s, C.bg, en(b, 44.5, 0.8), { w: 900, tr: -3 });
    body(ctx, '30. gün · topluluk oylar', CX, 420 + s * 0.92, 44, V.rgba(C.bg, 0.85), { w: 700, alpha: en(b, 45.1, 0.6, E.outCubic) });
    mono(ctx, '3 SEZON · 3 ÜRÜN · 1 KAZANAN', CX, 322, 24, C.bg, { alpha: en(b, 44.7, 0.5, E.outCubic) });
    // podium
    const blocks = [[260, 1360, 270, '2', 44.3], [CX, 1250, 320, '1', 44.1], [820, 1400, 270, '3', 44.5]];
    blocks.forEach(([x, top, w, n, tb]) => {
      const p = E.outBack(prog(b, tb, tb + 0.8), 1.4), y = lerp(1700, top, p);
      card(ctx, x - w / 2, y, w, 1700 - y + 80, 30, n === '1' ? C.cream : V.rgba(C.cream, 0.85));
      word(ctx, n, x, y + 80, 96, n === '1' ? C.amb : C.bg, { w: 900, alpha: p });
    });
    // confetti shapes
    const tau = (b - 44.3) * SPB;
    if (tau > 0 && tau < 2.6) CONF.forEach((c) => {
      const x = CX + Math.cos(c.a) * c.sp * tau * (1 - 0.3 * tau), y = 900 + Math.sin(c.a) * c.sp * tau + 1300 * tau * tau;
      ctx.save(); ctx.globalAlpha = clamp(2.4 - tau); shape(ctx, c.k, x, y, c.S, c.r0 + c.rs * tau, c.c); ctx.restore();
    });
    // Buve jumps onto the winner's block
    const jp = prog(b, 44.3, 45.2), e = E.outBack(jp, 1.2), land = V.hit(t, B(45.2), 0.12) * (b >= 45.2 ? 1 : 0), id = idle(b, 3);
    let y = 1250 + (1 - e) * 900, sx = 1 + 0.16 * land, sy = 1 - 0.14 * land;
    // celebratory hops on the beat
    [46, 47].forEach((hb) => { const hs = hopState(prog(b, hb, hb + 0.9), 80); y -= hs.dy; sx *= hs.sx; sy *= hs.sy; });
    buve(ctx, { x: CX, y, h: 620, sx: sx * id.sx, sy: sy * id.sy, rot: id.rot, wave: 1, phase: b * 9, armBias: -0.06, gy: 1250 });
    [[220, 820], [860, 760], [170, 1180], [930, 1140]].forEach(([sxp, syp], i) => sparkle(ctx, sxp, syp + Math.sin(b * 1.7 + i) * 12, 26 + 8 * Math.sin(b * 2.1 + i), C.cream, 0.9 * en(b, 45 + i * 0.12, 0.4), b * 0.7 + i));
    if (b > 44) { const p = prog(b, 44.0, 45.2); ring(ctx, CX, 900, 100 + E.outExpo(p) * 1100, 14 * (1 - p) + 1, C.cream, 1 - p); }
  }

  /* =========================================================
     ROLES (b 48–52): ekipte yerin ne?
     ========================================================= */
  const ROLES = [
    { n: 'Yazılımcı', s: 'Frontend, backend, mobil', k: 'sq', c: C.sky }, { n: 'Tasarımcı', s: 'UI/UX, akışlar, marka', k: 'ci', c: C.pink },
    { n: 'Büyüme', s: 'Pazarlama, içerik, satış', k: 'tr', c: C.teal }, { n: 'Ürün', s: 'Keşif, kapsam, önceliklendirme', k: 'st', c: C.amb },
  ];
  function drawRoles(ctx, t, b) {
    stage(ctx, b, C.v1, C.v2, C.mid, { a1: 0.5, a2: 0.5 });
    mono(ctx, decode('EKİP MASASI · 4 KİŞİ', prog(b, 48.1, 48.6), 2, t), 90, 322, 24, C.lav, { align: 'left' });
    rise(ctx, 'Ekipte', 90, 415, 92, C.lav, en(b, 48.2, 0.7), { align: 'left', w: 900, tr: -3 });
    rise(ctx, 'yerin ne?', 90, 415 + 108, 92, C.amb, en(b, 48.4, 0.7), { align: 'left', w: 900, tr: -3 });
    ROLES.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 90 + col * 460, y = 600 + row * 270, w = 430, h = 248;
      const p = E.outBack(prog(b, 48.7 + i * 0.4, 49.3 + i * 0.4), 1.7); if (p <= 0) return;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(p, p); ctx.rotate((1 - p) * (col ? 0.2 : -0.2)); ctx.translate(-(x + w / 2), -(y + h / 2));
      card(ctx, x, y, w, h, 48, r.c, null, true);
      shape(ctx, r.k, x + 82, y + 78, 88, Math.sin(b * 1.3 + i) * 0.12, C.bg);
      word(ctx, r.n, x + 34, y + 162, Math.min(50, fitSize(ctx, r.n, DISP, 360, 800)), C.bg, { align: 'left', w: 900, tr: -1 });
      body(ctx, r.s, x + 34, y + 210, 27, V.rgba(C.bg, 0.8), { align: 'left', w: 600 });
      ctx.restore();
    });
    const sp = E.outBack(prog(b, 50.6, 51.1), 2.4);
    if (sp > 0) { ctx.save(); ctx.translate(90 + 320, 600 - 8); ctx.scale(sp, sp); pill(ctx, -58, -28, 116, 56, C.org); word(ctx, 'SEN', 0, 1, 28, C.bg, { w: 900 }); ctx.restore(); }
    const bb = E.outBack(prog(b, 50.5, 51.0), 2);
    if (bb > 0) { ctx.save(); ctx.translate(800, 1290); ctx.scale(bb, bb); card(ctx, -150, -75, 300, 150, 40, C.lav, null, true); ctx.beginPath(); ctx.moveTo(-90, 70); ctx.lineTo(-130, 118); ctx.lineTo(-40, 74); ctx.closePath(); ctx.fillStyle = C.lav; ctx.fill(); body(ctx, 'Ürünü ayağa', 0, -22, 32, C.bg, { w: 800 }); body(ctx, 'kaldırırsın.', 0, 24, 32, C.bg, { w: 800 }); ctx.restore(); }
    // Buve peeks up from the bottom edge
    const pp = E.outBack(prog(b, 48.5, 49.4), 1.5), id = idle(b, 4);
    buve(ctx, { x: 500, y: 1980 - pp * 250 + 0, h: 610, sx: id.sx, sy: id.sy, rot: id.rot, wave: 1, phase: b * 7 + 4, shadow: false });
  }

  /* =========================================================
     APPLY (b 52–56): Sezon 1'de yerini al.
     ========================================================= */
  function drawApply(ctx, t, b) {
    stage(ctx, b, C.cream, C.v4, '#fde68a', { a1: 0.45, a2: 0.35, dots: 0.09, dotCol: '#6d28d9' });
    mono(ctx, decode('SEZON 01 · ÜCRETSİZ', prog(b, 52.1, 52.6), 8, t), 90, 322, 24, C.bg, { align: 'left' });
    const sz = Math.min(108, fitSize(ctx, "Sezon 1'de", DISP, 860, 900));
    rise(ctx, "Sezon 1'de", 90, 440, sz, C.bg, en(b, 52.2, 0.75), { align: 'left', w: 900, tr: -2 });
    rise(ctx, 'yerini al.', 90, 440 + sz * 1.22, sz, C.v1, en(b, 52.45, 0.75), { align: 'left', w: 900, tr: -2 });
    [['ÜCRETSİZ', C.teal, C.bg, 90, 240], ['ONLINE', C.bg, C.lav, 350, 210], ['3 DK BAŞVURU', C.v1, C.lav, 580, 330]].forEach(([s, bg, fg, x, w], i) => {
      const p = E.outBack(prog(b, 52.9 + i * 0.22, 53.4 + i * 0.22), 2); if (p <= 0) return;
      ctx.save(); ctx.translate(x + w / 2, 760); ctx.scale(p, p); pill(ctx, -w / 2, -38, w, 76, bg); mono(ctx, s, 0, 0, 26, fg, { w: 700 }); ctx.restore();
    });
    body(ctx, 'Fikir şart değil,', 90, 880, 48, C.bg, { align: 'left', w: 700, alpha: en(b, 53.2, 0.5, E.outCubic) });
    body(ctx, 'taahhüt şart.', 90, 944, 48, C.v1, { align: 'left', w: 800, alpha: en(b, 53.4, 0.5, E.outCubic) });
    // button + cursor
    const bp = E.outBack(prog(b, 53.5, 54.1), 1.8), press = V.hit(t, B(54.75), 0.14) * (b >= 54.75 ? 1 : 0), by = 1090;
    ctx.save(); ctx.translate(90 + 280, by); ctx.scale(bp * (1 - 0.05 * press), bp * (1 - 0.05 * press));
    ctx.shadowColor = V.rgba(C.v1, 0.5); ctx.shadowBlur = 40 + press * 20; ctx.shadowOffsetY = 14; pill(ctx, -280, -66, 560, 132, C.v1); ctx.shadowColor = 'transparent';
    word(ctx, "Sezon 1'e başvur →", 0, 0, 40, C.lav, { fam: SANS, w: 800 }); ctx.restore();
    if (b >= 54.75) ring(ctx, 90 + 400, by + 10, 30 + 260 * E.outExpo(prog(b, 54.75, 55.4)), 6, C.v1, 1 - prog(b, 54.75, 55.4));
    const cp = E.inOutCubic(prog(b, 54.0, 54.75)), cx = lerp(W + 100, 90 + 400, cp), cy = lerp(H - 300, by + 10, cp);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 - 0.12 * press, 1 - 0.12 * press); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 62); ctx.lineTo(16, 48); ctx.lineTo(30, 78); ctx.lineTo(44, 71); ctx.lineTo(30, 42); ctx.lineTo(52, 42); ctx.closePath();
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.cream; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore();
    // dates
    [['Son başvuru', '19 Ekim', C.org], ['Sprint başlar', '26 Ekim', C.v1], ['Demo Day', '25 Kasım', C.amb]].forEach(([l, d, c], i) => {
      const p = E.outCubic(prog(b, 54.3 + i * 0.3, 54.9 + i * 0.3)), y = 1270 + i * 78; if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0); dot(ctx, 108, y, 14, c); body(ctx, l, 140, y, 32, C.bg, { align: 'left', w: 600 }); word(ctx, d, 600, y, 32, C.bg, { align: 'right', fam: SANS, w: 800 }); ctx.restore();
    });
    // Buve, bottom right
    const jp = prog(b, 52.3, 53.1), id = idle(b, 5), land = V.hit(t, B(53.1), 0.12) * (b >= 53.1 ? 1 : 0);
    buve(ctx, { x: 860, y: 1560 + (1 - E.outBack(jp, 1.3)) * 700, h: 500, sx: (1 + 0.16 * land) * id.sx, sy: (1 - 0.14 * land) * id.sy, rot: id.rot, wave: 1, phase: b * 7 + 5, gy: 1560 });
  }

  /* =========================================================
     LOCKUP (b 56–60): the mascot + wordmark
     ========================================================= */
  function drawLock(ctx, t, b) {
    V.bg(ctx, C.v1);
    const g = ctx.createRadialGradient(CX, 1050, 0, CX, 1050, 1250); g.addColorStop(0, V.rgba(C.v2, 0.55)); g.addColorStop(1, V.rgba(C.bg, 0.72)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const p = V.fract((b - 56) * 0.25 - i * 0.33); ring(ctx, CX, 1120, 260 + p * 800, 3, C.v3, (1 - p) * 0.35); }
    mono(ctx, decode("SEZON 01 · BAŞVURULAR AÇIK · 19 EKİM'E KADAR", prog(b, 56.6, 57.3), 6, t), CX, 322, 21, C.v4);
    const wy = 450, s = fitSize(ctx, 'crewupa', DISP, 880, 800), G = glyphsOf(ctx, 'crewupa', DISP, s, 800, -s * 0.04), cap = capH(ctx, DISP, 800) * s;
    ctx.save(); ctx.beginPath(); ctx.rect(0, wy - cap * 1.3, W, cap * 3); ctx.clip();
    for (const g2 of G) { const p = E.outBack(clamp((b - 56.5 - g2.i * 0.06) / 0.5), 1.7); word(ctx, g2.ch, CX + g2.x, wy + (1 - p) * cap * 1.7, s, C.lav, { w: 800 }); }
    ctx.restore();
    rise(ctx, 'Ekibini kur.', CX, wy + 150, 56, C.v4, en(b, 57.0, 0.6), { w: 800, tr: -1 });
    rise(ctx, '30 günde çık.', CX, wy + 225, 56, C.lav, en(b, 57.2, 0.6), { w: 800, tr: -1 });
    const up = E.outBack(prog(b, 57.5, 58.1), 1.8);
    if (up > 0) { ctx.save(); ctx.translate(CX, wy + 340); ctx.scale(up, up); pill(ctx, -270, -50, 540, 100, C.lav); mono(ctx, 'crewupa.com', 0, 2, 44, C.bg, { w: 800, tr: 2 }); ctx.restore(); }
    // Buve, big and waving
    const jp = prog(b, 56.3, 57.2), e = E.outBack(jp, 1.25), land = V.hit(t, B(57.2), 0.12) * (b >= 57.2 ? 1 : 0), id = idle(b, 6);
    buve(ctx, { x: CX, y: 1460 + (1 - e) * 900, h: 640, sx: (1 + 0.16 * land) * id.sx, sy: (1 - 0.14 * land) * id.sy, rot: id.rot, wave: 1, phase: b * 7 + 6, gy: 1460 });
    [[190, 1000], [900, 960], [150, 1300], [940, 1330]].forEach(([sxp, syp], i) => sparkle(ctx, sxp, syp + Math.sin(b * 1.6 + i) * 12, 24 + 9 * Math.sin(b * 2 + i), C.lav, 0.8 * en(b, 57.4 + i * 0.15, 0.5), b * 0.5 + i));
  }

  /* ---------------- master ---------------- */
  const SC = [
    { b0: 0, fn: drawIntro }, { b0: 8, fn: drawProblem, w: [CX, CY] }, { b0: 16, fn: drawRescue, w: [CX, CY] }, { b0: 20, fn: drawMatch, w: [0, 900] },
    { b0: 28, fn: drawCheck, w: [W, 400] }, { b0: 32, fn: drawJourney, w: [0, 1700] }, { b0: 44, fn: drawDemo }, { b0: 48, fn: drawRoles, w: [CX, CY] },
    { b0: 52, fn: drawApply, w: [CX, 1900] }, { b0: 56, fn: drawLock, w: [370, 1090] },
  ];
  const WL = 0.75;
  V.reel({
    title: 'crewupa · Buve ile 30 gün',
    duration: 37.5, fps: 60, bpm: BPM, sidechain: 0.5,
    blur: { samples: 4, shutter: (t) => (t / SPB > 43.2 && t / SPB < 44.15 ? 0.18 : 0.5) },
    async setup() {
      const [body_, hand] = await Promise.all([loadImg('assets/buve-body.png'), loadImg('assets/buve-hand.png')]);
      IM.body = body_; IM.hand = hand;
    },
    draw(ctx, t) {
      const b = t / SPB;
      let k = 0; for (let i = 0; i < SC.length; i++) if (b >= SC[i].b0) k = i;
      const s = SC[k];
      if (s.w && b < s.b0 + WL) {
        SC[k - 1].fn(ctx, t, b);
        ctx.save(); const p = E.inOutCubic(prog(b, s.b0, s.b0 + WL)); ctx.beginPath(); ctx.arc(s.w[0], s.w[1], p * 3000, 0, TAU); ctx.clip();
        s.fn(ctx, t, b); ctx.restore();
      } else s.fn(ctx, t, b);
    },
    post(ctx, t) {
      const b = t / SPB;
      const ch = V.hit(t, B(0.8), 0.1) * 8 + V.hit(t, B(16), 0.1) * 10 + V.hit(t, B(44.05), 0.12) * 12 + V.hit(t, B(57.2), 0.1) * 8;
      if (ch > 0.5) V.chroma(ctx, ch, 0);
      V.vignette(ctx, 0.26, '11,8,22');
      V.grain(ctx, t, b > 58.5 ? 0.03 : 0.045);
    },
    music(m) {
      const F = [65, 69, 72, 76], Am = [57, 60, 64, 67], Fm = [53, 57, 60, 64], G = [55, 59, 62, 67], Cc = [60, 64, 67, 71];
      const kick2 = (a, z, g = 0.9) => { for (let b = a; b < z; b += 2) m.kick(b, { gain: g }); };
      const clap2 = (a, z, g = 0.5) => { for (let b = a + 1; b < z; b += 2) m.clap(b, { gain: g }); };
      // ---- intro: Buve's theme (C–E–G–C) on landing, groove under the title
      m.chord(0, 3.7, F, { attack: 0.3, gain: 0.14, cutoff: 700, env: 1500, fdecay: 2, release: 0.8, verb: 0.5 });
      [[0.55, 72], [0.68, 76], [0.81, 79], [0.94, 84]].forEach(([b, n]) => m.lead(b, 0.7, n, { gain: 0.12, decay: 3, verb: 0.5 }));
      m.whoosh(0, 0.9, { gain: 0.3 }); m.impact(0.8, { gain: 0.6 }); m.kick(0.8, { gain: 0.8 });
      m.tick(2.62, { freq: 2200, gain: 0.25 }); kick2(2, 4); m.hat(2.5, { gain: 0.12 }); m.hat(3.5, { gain: 0.12 });
      m.whoosh(3.7, 0.8, { gain: 0.4 }); m.impact(4.2, { gain: 0.6 });
      kick2(4, 8); clap2(4, 8); for (let b = 4.5; b < 8; b += 1) m.hat(b, { gain: 0.16 });
      m.chord(4, 4, F, { gain: 0.15, cutoff: 900, env: 2500, fdecay: 3, release: 0.4 }); [41, 41, 48, 41, 43, 43, 50, 43].forEach((n, i) => m.bass(4 + i * 0.5, 0.4, n, { gain: 0.4 }));
      for (let i = 0; i < 30; i++) m.tick(5.0 + i * 0.075, { freq: 1400 + i * 45, gain: 0.05, pan: Math.sin(i) * 0.5 });
      m.tick(5.3, { freq: 900, gain: 0.2 });
      // ---- problem: sparse minor, ticks for every message, heartbeat
      m.chord(8, 8, Am, { attack: 0.5, gain: 0.12, cutoff: 500, env: 800, fdecay: 2, release: 0.8 }); m.bass(8, 3.9, 33, { type: 'sub', gain: 0.34 }); m.bass(12, 3.8, 33, { type: 'sub', gain: 0.34 });
      MSGS.forEach(([mb, side]) => m.tick(mb, { freq: side === 'L' ? 1900 : 2500, gain: 0.22, pan: side === 'L' ? -0.5 : 0.5 }));
      for (let b = 8; b < 15.6; b += 2) m.kick(b, { gain: 0.5, decay: 9 });
      [13.6, 13.9, 14.2, 14.5].forEach((b) => m.tick(b, { freq: 800, gain: 0.08 }));
      m.riser(12.5, 16, { gain: 0.38 }); for (let b = 14.9; b < 15.6; b += 0.125) m.snare(b, { gain: 0.12 + (b - 14.9) * 0.4, verb: 0.1 });
      m.mute(15.6, 16);
      // ---- rescue: the drop with Buve's entrance
      m.impact(16, { gain: 0.9 }); m.subdrop(16, { gain: 0.5 }); kick2(16, 20); clap2(16, 20, 0.55); for (let b = 16.5; b < 20; b += 1) m.hat(b, { gain: 0.16 });
      m.whoosh(16.1, 0.9, { gain: 0.35 }); m.kick(17.1, { gain: 0.8 });
      m.chord(16, 4, F, { gain: 0.18, cutoff: 1200, env: 4500, fdecay: 4, verb: 0.4 }); [41, 41, 48, 41, 43, 43, 50, 43].forEach((n, i) => m.bass(16 + i * 0.5, 0.4, n, { gain: 0.42 }));
      [[17.2, 72], [18.0, 76], [18.8, 79]].forEach(([b, n]) => { m.lead(b, 0.6, n, { gain: 0.13, decay: 3.5 }); m.tick(b, { freq: 2600, gain: 0.25 }); });
      // ---- match: bouncy
      kick2(20, 28); clap2(20, 28, 0.5); for (let b = 20.5; b < 28; b += 1) m.hat(b, { gain: 0.15 }); for (let b = 20.25; b < 28; b += 0.5) m.hat(b, { gain: 0.06, pan: 0.3 });
      [[20, F, 41], [24, Am, 45]].forEach(([b, ch, root]) => { m.chord(b, 4, ch, { gain: 0.16, cutoff: 1100, env: 3000, fdecay: 3, release: 0.4, verb: 0.35 }); for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.4, i % 4 === 3 ? root + 12 : root, { gain: 0.42, cutoff: 420, env: 1000 }); });
      [20.7, 21.1, 21.5, 21.9].forEach((b, i) => m.lead(b, 0.4, [72, 76, 79, 84][i], { gain: 0.11, decay: 4 }));
      m.impact(24.4, { gain: 0.4 }); m.lead(24.4, 0.8, 88, { gain: 0.12, decay: 2 }); m.zap(25.0, { gain: 0.1, from: 900 });
      // ---- check-in: bell and breath
      m.impact(28, { gain: 0.5 }); m.kick(28, { gain: 0.8 }); kick2(30, 32, 0.7); m.clap(29, { gain: 0.4 }); m.clap(31, { gain: 0.4 }); m.chord(28, 4, Fm, { gain: 0.14, cutoff: 900, env: 2500, fdecay: 3, release: 0.5, verb: 0.5 });
      m.lead(29.3, 1.2, 88, { gain: 0.14, decay: 2, verb: 0.7 }); m.tick(29.3, { freq: 3200, gain: 0.3 }); [29.8, 30.15, 30.5].forEach((b, i) => m.tick(b, { freq: 1800 + i * 300, gain: 0.2 }));
      for (let b = 28.5; b < 32; b += 1) m.hat(b, { gain: 0.13 }); m.whoosh(31.5, 0.6, { gain: 0.3 });
      // ---- journey: steady groove, dip in the hard week, bell, build
      kick2(32, 43.4, 0.9); clap2(32, 43.4, 0.5); for (let b = 32.5; b < 39; b += 1) m.hat(b, { gain: 0.15 }); for (let b = 40.6; b < 43.4; b += 0.5) m.hat(b, { gain: 0.15 });
      [[32, F, 41], [36, Am, 45], [40, Fm, 41]].forEach(([b, ch, root]) => { m.chord(b, 4, ch, { gain: 0.16, cutoff: b === 36 || b === 40 ? 700 : 1100, env: 2600, fdecay: 3, release: 0.4, verb: 0.35 }); for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.4, i % 4 === 3 ? root + 12 : root, { gain: 0.42, cutoff: 420, env: 1000 }); });
      JM.forEach((mm, i) => { m.tick(mm.b, { freq: 1800 + i * 150, gain: 0.26 }); m.lead(mm.b, 0.5, [72, 76, 79, 81, 76, 88, 84, 91][i], { gain: 0.1, decay: 4 }); });
      m.kick(38.6, { gain: 0.5, decay: 9 }); m.kick(39.4, { gain: 0.5, decay: 9 }); m.kick(40.0, { gain: 0.5, decay: 9 });
      m.riser(41.8, 44, { gain: 0.36 }); for (let b = 42.9; b < 43.95; b += 0.125) m.snare(b, { gain: 0.14 + (b - 42.9) * 0.3, verb: 0.1 }); m.mute(43.93, 44);
      // ---- demo day
      m.impact(44, { gain: 0.95 }); m.subdrop(44, { gain: 0.5 }); m.kick(44, { gain: 1 }); kick2(44, 48, 0.9); clap2(44, 48, 0.55); for (let b = 44.5; b < 48; b += 1) m.hat(b, { gain: 0.15 });
      m.chord(44, 4, [53, 65, 69, 72, 76, 81], { gain: 0.22, attack: 0.005, cutoff: 1800, env: 4500, fdecay: 1.5, release: 0.9, verb: 0.6 }); [41, 41, 48, 41].forEach((n, i) => m.bass(44 + i * 0.5, 0.4, n, { gain: 0.4 }));
      [[44.3, 84], [44.55, 88], [44.8, 91], [45.05, 96], [45.3, 91], [45.55, 88], [46, 84], [46.25, 88], [46.5, 91], [47, 96]].forEach(([b, n]) => m.lead(b, 0.4, n, { gain: 0.06, decay: 5, verb: 0.7 }));
      m.whoosh(47.4, 0.6, { gain: 0.3 });
      // ---- roles + apply: pared back, warm
      kick2(48, 56, 0.8); clap2(48, 56, 0.45); for (let b = 48.5; b < 56; b += 1) m.hat(b, { gain: 0.13 });
      [[48, Cc, 36], [52, F, 41]].forEach(([b, ch, root]) => { m.chord(b, 4, ch, { gain: 0.15, cutoff: 1000, env: 2500, fdecay: 3, release: 0.4, verb: 0.35 }); for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.4, i % 4 === 3 ? root + 12 : root, { gain: 0.4 }); });
      [48.7, 49.1, 49.5, 49.9].forEach((b, i) => { m.tick(b, { freq: 2000 + i * 300, gain: 0.22 }); m.lead(b, 0.4, [72, 76, 79, 84][i], { gain: 0.1, decay: 4 }); });
      m.tick(50.6, { freq: 1100, gain: 0.3 }); [52.9, 53.12, 53.34].forEach((b, i) => m.tick(b, { freq: 2200 + i * 300, gain: 0.18 }));
      m.tick(54.75, { freq: 1100, gain: 0.35 }); m.tick(54.77, { freq: 2200, gain: 0.2 });
      m.riser(54.8, 56, { gain: 0.32 }); for (let b = 55.2; b < 55.93; b += 0.125) m.snare(b, { gain: 0.12 + (b - 55.2) * 0.5, verb: 0.1 }); m.mute(55.93, 56);
      // ---- lockup: the theme returns
      m.impact(56, { gain: 0.9 }); m.subdrop(56, { gain: 0.5 }); m.kick(56, { gain: 1, decay: 4 });
      m.chord(56, 4, [53, 65, 69, 72, 76, 81], { gain: 0.24, attack: 0.005, cutoff: 1800, env: 4500, fdecay: 1.5, release: 1.2, verb: 0.7 }); m.bass(56, 4, 29, { type: 'sub', gain: 0.4 });
      [[56.9, 72], [57.05, 76], [57.2, 79], [57.35, 84]].forEach(([b, n]) => m.lead(b, 0.9, n, { gain: 0.11, decay: 2.5, verb: 0.7 }));
      [[57.8, 88], [58.3, 91], [58.8, 96]].forEach(([b, n]) => m.lead(b, 0.9, n, { gain: 0.06, decay: 1.6, verb: 0.8 }));
      m.tick(57.5, { freq: 3000, gain: 0.15 });
    },
  });
})();
