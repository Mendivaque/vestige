/* REEL 01 — KINETIC TYPE
 * Swiss / brutalist kinetic typography. Every word performs its own meaning:
 * SLAM slams, SLICE gets sliced, STRETCH stretches, ECHO echoes, the drop LOOPs,
 * TYPE becomes a window (MASK), a word ladder SEQUENCEs, then the name decodes.
 * 128 BPM → 15 s = 32 beats = 8 bars. All timing lives on the beat grid.
 */
(() => {
  const C = V.clock(128), SPB = C.spb, E = V.ease, cl = V.clamp;
  const K = '#0b0b0c', W = '#f2efe8', R = '#ff3b1f';
  const NAME = ((globalThis.PARAMS && globalThis.PARAMS.name) || 'CREWUPA').toUpperCase();
  const TB = (b) => b * SPB;                               // beat → seconds
  const pb = (b, b0, b1) => cl((b - b0) / (b1 - b0));     // progress in beats
  const CUTS = [4, 8, 12, 15, 16, 20, 24, 28];             // hard cuts (beats)

  /* ---------------- type system ---------------- */
  const ANTON = { fam: 'Anton', weight: 400, style: 'normal' };
  const SERIF = { fam: 'Instrument Serif', weight: 400, style: 'italic' };
  const MONO = { fam: 'JetBrains Mono', weight: 800, style: 'normal' };
  const MONO5 = { fam: 'JetBrains Mono', weight: 500, style: 'normal' };
  const INTER = { fam: 'Inter', weight: 900, style: 'normal' };
  const fontStr = (f, s) => `${f.style} ${f.weight} ${s}px "${f.fam}"`;
  const BASE = 200;
  const LC = new Map();

  /** Measured per-glyph layout at BASE size (advance + ink boxes), cached. */
  function lay(str, f) {
    const key = fontStr(f, BASE) + '|' + str;
    let L = LC.get(key);
    if (L) return L;
    const [, x] = V.buffer('measure', 4, 4);
    x.font = fontStr(f, BASE); x.letterSpacing = '0px'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    const chars = [...str];
    const ch = chars.map((c, i) => {
      const pre = x.measureText(chars.slice(0, i).join('')).width;
      const m = x.measureText(c);
      return { c, i, x: pre, adv: m.width, l: pre - m.actualBoundingBoxLeft, r: pre + m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    });
    const m = x.measureText(str);
    L = { ch, adv: m.width, l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    L.w = L.r - L.l; L.h = L.asc + L.desc;
    LC.set(key, L);
    return L;
  }
  /** Font size whose cap height equals capH. */
  const capSize = (f, capH) => capH * BASE / lay('H', f).asc;
  /** Transform that maps the word's ink box onto (x, y, w, h). */
  const fitBox = (L, x, y, w, h) => {
    const sx = w / L.w, sy = h / L.h;
    return { sx, sy, ox: x - L.l * sx, oy: y + L.asc * sy, top: y, bot: y + h };
  };
  function wordDraw(ctx, str, f, F, fill) {
    ctx.save();
    ctx.translate(F.ox, F.oy); ctx.scale(F.sx, F.sy);
    ctx.font = fontStr(f, BASE); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    ctx.fillStyle = fill; ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  /** Draw glyph g of a fitted word with its own scale (kx, ky) about anchor (ax, ay). */
  function glyph(ctx, f, F, g, fill, o = {}) {
    const ax = o.ax ?? F.ox + ((g.l + g.r) / 2) * F.sx, ay = o.ay ?? F.oy;
    ctx.save();
    ctx.translate(ax + (o.dx || 0), ay + (o.dy || 0));
    ctx.scale(o.kx ?? 1, o.ky ?? 1);
    ctx.translate(-ax, -ay);
    ctx.translate(F.ox, F.oy); ctx.scale(F.sx, F.sy);
    ctx.font = fontStr(o.font || f, BASE); ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fill;
    if (o.c && o.c !== g.c) { ctx.textAlign = 'center'; ctx.fillText(o.c, (g.l + g.r) / 2, 0); }
    else { ctx.textAlign = 'left'; ctx.fillText(g.c, g.x, 0); }
    ctx.restore();
  }
  const gx = (F, g) => [F.ox + g.l * F.sx, F.ox + g.r * F.sx];
  const SCR = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&';
  const scramble = (t, i, pool = SCR) => pool[Math.floor(V.hash(Math.floor(t * 24) * 7.13 + i * 3.7) * pool.length)];

  /* ---------------- HUD (Swiss chrome) ---------------- */
  const pad = (n, k = 2) => String(n).padStart(k, '0');
  const tc = (t) => `00:${pad(Math.floor(t))}:${pad(Math.floor((t % 1) * 60))}`;
  function hud(ctx, t, b, o) {
    ctx.save();
    ctx.font = fontStr(MONO5, 22); ctx.letterSpacing = '2px'; ctx.textBaseline = 'middle';
    const item = (str, x, y, align) => {
      ctx.textAlign = align;
      if (o.chip) {
        const w = ctx.measureText(str).width, x0 = align === 'left' ? x : x - w;
        ctx.fillStyle = o.chip; ctx.fillRect(x0 - 10, y - 19, w + 18, 38);
      }
      ctx.fillStyle = o.ink; ctx.fillText(str, x, y);
    };
    if (o.top !== false) { item('REEL 01 / KINETIC TYPE', 90, 300, 'left'); item(tc(t), 990, 300, 'right'); }
    const y = 1490, cur = ((Math.floor(b) % 4) + 4) % 4;
    if (o.chip) { ctx.fillStyle = o.chip; ctx.fillRect(80, y - 19, 96, 38); }
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 22;
      ctx.fillStyle = o.ink; ctx.strokeStyle = o.ink; ctx.lineWidth = 2;
      if (i === cur) ctx.fillRect(x, y - 7, 14, 14); else ctx.strokeRect(x + 1, y - 6, 12, 12);
    }
    item('128 BPM', 190, y, 'left');
    item(o.label, 990, y, 'right');
    ctx.restore();
  }

  /* ================= 01 SLAM  (beats 0–4) ================= */
  function sSlam(ctx, t, b) {
    const red = b >= 2, flash = b < 0.2;
    V.bg(ctx, red || flash ? R : K);
    const ink = red || flash ? K : W;
    const top = 400, bot = 1420;
    const L = lay('SLAM', ANTON), F = fitBox(L, 90, top, 900, bot - top);
    // floor + ceiling rules shoot out on the first two impacts
    ctx.fillStyle = ink;
    const r1 = E.outExpo(pb(b, 0, 0.9)), r2 = E.outExpo(pb(b, 0.25, 1.1));
    const ex = E.inQuart(pb(b, 3.5, 3.9));
    ctx.fillRect(0, bot + 22, 1080 * r1 * (1 - ex), 4);
    ctx.fillRect(1080 * (1 - r2) + 1080 * ex, top - 26, 1080 * r2, 4);
    L.ch.forEach((g, i) => {
      const land = i * 0.25, lt = t - TB(land), fromTop = i % 2 === 0;
      const pre = TB(0.32);
      if (lt < -pre) return;
      let dy = 0, kx = 1, ky = 1;
      if (lt < 0) {                       // accelerate in, stretched along travel
        const p = 1 + lt / pre;
        dy = (fromTop ? -1 : 1) * 1500 * (1 - E.inQuad(p));
        ky = 1 + 0.45 * p; kx = 1 - 0.12 * p;
      } else {                            // squash on impact, springy settle
        const s = Math.exp(-lt * 11) * Math.cos(lt * 32);
        ky = 1 - 0.3 * s; kx = 1 + 0.16 * s;
      }
      for (const kb of [1, 2, 3]) {       // kick bumps ripple across the letters
        const h = V.hit(t, TB(kb) + i * 0.035, 0.11);
        ky *= 1 + 0.1 * h; kx *= 1 - 0.04 * h;
      }
      const out = E.inBack(pb(b, 3.45 + i * 0.07, 3.85 + i * 0.07), 2.4);
      ky *= 1 - out;
      if (ky <= 0.002) return;
      const [x0, x1] = gx(F, g);
      const col = red || flash ? K : (lt >= 0 && lt < 0.14 ? R : W);
      glyph(ctx, ANTON, F, g, col, { ax: (x0 + x1) / 2, ay: fromTop ? bot : top, kx, ky, dy });
    });
    // caption: small serif aside, Swiss annotation
    const cap = E.outExpo(pb(b, 2, 2.6)) * (1 - E.inQuart(pb(b, 3.4, 3.7)));
    if (cap > 0) {
      ctx.save();
      ctx.globalAlpha = cap;
      V.text(ctx, 'the landing.', 990, top - 64 + (1 - cap) * 20, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 46, fill: K, align: 'right' });
      ctx.restore();
    }
    // wipe-through panel (continues into scene 02)
    const pw = E.inQuart(pb(b, 3.5, 4));
    if (pw > 0) { ctx.fillStyle = K; ctx.fillRect(0, 1920 * (1 - pw), 1080, 1920 * pw + 2); }
  }

  /* ================= 02 SLICE  (beats 4–8) ================= */
  function sSlice(ctx, t, b) {
    V.bg(ctx, W);
    const y0 = 600, y1 = 1240;
    const L = lay('SLICE', ANTON), F = fitBox(L, 90, y0, 900, y1 - y0);
    const [bc, bx] = V.buffer('wd');
    bx.clearRect(0, 0, V.W, V.H);
    wordDraw(bx, 'SLICE', ANTON, F, K);

    const l1 = { x: 540, y: y0 + (y1 - y0) * 0.56, a: -0.05 };
    const l2 = { x: 600, y: 920, a: 1.16 };
    const d1 = [Math.cos(l1.a), Math.sin(l1.a)], n1 = [-d1[1], d1[0]];
    const d2 = [Math.cos(l2.a), Math.sin(l2.a)], n2 = [-d2[1], d2[0]];
    const e1 = E.outExpo(pb(b, 6, 6.7)), e2 = E.outExpo(pb(b, 7, 7.7)), ex = E.inExpo(pb(b, 7.45, 8));

    // red blades (behind pieces once cut)
    const blade = (l, d, head, tail, w) => {
      ctx.save(); ctx.strokeStyle = R; ctx.lineWidth = w; ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(l.x + d[0] * tail, l.y + d[1] * tail); ctx.lineTo(l.x + d[0] * head, l.y + d[1] * head);
      ctx.stroke(); ctx.restore();
    };
    const h1 = V.lerp(-700, 700, E.inOutExpo(pb(b, 5.3, 6)));
    const h2 = V.lerp(-1200, 1200, E.inOutExpo(pb(b, 6.3, 7)));
    const tail1 = V.lerp(-700, 700, E.inExpo(pb(b, 7.45, 8)));
    const tail2 = V.lerp(-1200, 1200, E.inExpo(pb(b, 7.45, 8)));

    if (b < 5.25) {
      // entry: word assembles from 7 interleaved strips
      const N = 7, top = y0 - 30, sh = Math.ceil((y1 - y0 + 60) / N);
      for (let k = 0; k < N; k++) {
        const ys = top + k * sh;
        const e = E.outExpo(pb(b, 4.05 + k * 0.05, 4.85 + k * 0.05));
        const dx = (k % 2 ? 1 : -1) * 1300 * (1 - e);
        ctx.drawImage(bc, 0, ys, V.W, sh, Math.round(dx), ys, V.W, sh);
      }
    } else {
      if (b >= 5.3) blade(l1, d1, h1, b >= 7.45 ? tail1 : -700, b < 6 ? 10 : 6);
      if (b >= 6.3) blade(l2, d2, h2, b >= 7.45 ? tail2 : -1200, b < 7 ? 10 : 6);
      const S1 = b >= 6 ? [-1, 1] : [0], S2 = b >= 7 ? [-1, 1] : [0];
      for (const s1 of S1) for (const s2 of S2) {
        let ox = 0, oy = 0;
        ox += s1 * (d1[0] * 70 + n1[0] * 16) * e1; oy += s1 * (d1[1] * 70 + n1[1] * 16) * e1;
        ox += s2 * (d2[0] * 60 + n2[0] * 14) * e2; oy += s2 * (d2[1] * 60 + n2[1] * 14) * e2;
        ox += (s1 * d1[0] * -1500 + s2 * n2[0] * 900) * ex; oy += (s1 * n1[1] * 900 + s2 * d2[1] * 300) * ex;
        ctx.save();
        const half = (l, d, n, s) => {
          const Lx = 6000;
          ctx.beginPath();
          ctx.moveTo(l.x - d[0] * Lx, l.y - d[1] * Lx); ctx.lineTo(l.x + d[0] * Lx, l.y + d[1] * Lx);
          ctx.lineTo(l.x + d[0] * Lx + n[0] * s * Lx, l.y + d[1] * Lx + n[1] * s * Lx);
          ctx.lineTo(l.x - d[0] * Lx + n[0] * s * Lx, l.y - d[1] * Lx + n[1] * s * Lx);
          ctx.closePath(); ctx.clip();
        };
        if (s1) half(l1, d1, n1, s1);
        if (s2) half(l2, d2, n2, s2);
        ctx.drawImage(bc, ox, oy);
        ctx.restore();
      }
      // sweeping blade heads sit on top while cutting
      if (b >= 5.3 && b < 6) blade(l1, d1, h1, h1 - 260, 10);
      if (b >= 6.3 && b < 7) blade(l2, d2, h2, h2 - 320, 10);
    }
    // annotations
    const lab = (str, x, y, b0, align = 'left') => {
      const n = Math.floor(str.length * pb(b, b0, b0 + 0.3)), a = 1 - E.inQuart(pb(b, 7.4, 7.7));
      if (n <= 0 || a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      V.text(ctx, str.slice(0, n), x, y, { family: 'JetBrains Mono', weight: 500, size: 22, fill: R, align, tracking: 2 });
      ctx.restore();
    };
    lab('CUT 01 / 003°', 90, l1.y - 44 + 90 * Math.sin(-l1.a) * 0, 6);
    lab('CUT 02 / 066°', l2.x + 150, 470, 7);
    // wipe-through panel exiting upward
    const pe = E.outQuart(pb(b, 4, 4.5));
    if (pe < 1) { ctx.fillStyle = K; ctx.fillRect(0, 0, 1080, 1920 * (1 - pe)); }
  }

  /* ================= 03 STRETCH  (beats 8–12) ================= */
  function sStretch(ctx, t, b) {
    V.bg(ctx, K);
    const L = lay('STRETCH', ANTON), n = L.ch.length;
    const base = 1420;
    const baseH = L.h * (900 / L.w) * 1.7;
    const F = fitBox(L, 90, base - baseH, 900, baseH);
    const exE = E.inExpo(pb(b, 11.45, 12));
    const waves = [[9, 1, 1.25], [9.5, -1, 0.5], [10, -1, 1.3], [10.5, 1, 0.5], [11, 1, 1.45]];
    let maxW = 0, maxTop = base;
    const cx0 = F.ox + L.l * F.sx, cx1 = F.ox + L.r * F.sx, mid = (cx0 + cx1) / 2;
    L.ch.forEach((g, i) => {
      const ent = E.outBack(pb(b, 8 + i * 0.0625, 8.6 + i * 0.0625), 2.2);
      let w = 0;
      for (const [kb, dir, amp] of waves) {
        const j = dir > 0 ? i : n - 1 - i, dt = t - TB(kb) - j * 0.028;
        if (dt > 0) w += amp * (1 - Math.exp(-dt / 0.022)) * Math.exp(-dt / 0.17);
      }
      let ky = ent * (1 + w);
      if (ky > 1 + maxW && exE === 0) { maxW = ky - 1; maxTop = base - baseH * ky; }
      ky = V.lerp(ky, 2600 / baseH, exE);
      const [x0, x1] = gx(F, g), c = (x0 + x1) / 2;
      const kx = 1 + 0.2 * exE;
      const ax = V.lerp(c, mid + (c - mid) * 1.02, exE);
      const col = w > 0.62 && exE === 0 ? R : W;
      if (ky > 0.002) glyph(ctx, ANTON, F, g, col, { ax, ay: base, dy: 700 * exE, kx, ky });
    });
    // measurement: hairline + readout riding on the tallest letter
    const vis = pb(b, 8.7, 9) * (1 - pb(b, 11.3, 11.45));
    if (vis > 0) {
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.fillStyle = V.rgba(W, 0.35); ctx.fillRect(0, maxTop - 1, 1080, 2);
      V.text(ctx, `SCALE.Y  ${pad(Math.round((1 + maxW) * 100), 3)}%`, 990, maxTop - 30, { family: 'JetBrains Mono', weight: 800, size: 30, fill: R, align: 'right', tracking: 2 });
      V.text(ctx, 'elastic.', 90, maxTop - 34, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 52, fill: W, align: 'left' });
      ctx.restore();
    }
  }

  /* ================= 04 ECHO  (beats 12–15) ================= */
  const ST = [12, 13, 13.5, 14, 14.25, 14.5, 14.625, 14.75, 14.875];
  function echoX(tt) {
    let x = 1700, prev = 1700;
    for (let k = 0; k < ST.length; k++) {
      const tgt = (k % 2 ? -1 : 1) * (k === 0 ? 0 : 150 + 40 * (k % 3));
      const dur = TB(Math.min(0.6, (ST[k + 1] ?? 15) - ST[k]));
      x += (tgt - prev) * E.outExpo(cl((tt - TB(ST[k])) / dur));
      prev = tgt;
    }
    return x;
  }
  function sEcho(ctx, t, b) {
    const flick = b >= 14.5 && Math.floor((b - 14.5) * 4) % 2 === 1;
    const bg = flick ? K : W, ink = flick ? W : K;
    V.bg(ctx, bg);
    const rh = V.lerp(160, 104, E.inQuad(pb(b, 13.4, 15)));
    const size = capSize(ANTON, rh * 0.74);
    ctx.save();
    ctx.font = fontStr(ANTON, size); ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const unit = 'ECHO ', uw = ctx.measureText(unit).width;
    const rows = Math.ceil(960 / rh) + 1;
    let step = 0; for (let k = 0; k < ST.length; k++) if (b >= ST[k]) step = k;
    for (let r = -rows; r <= rows; r++) {
      const y = 960 + r * rh + rh * 0.37;
      const tt = t - Math.abs(r) * 0.042;
      const x0 = 540 + echoX(tt) + (Math.abs(r) % 2 ? uw / 2 : 0) - uw * 0.5 * 0.82;
      const hot = r === 0 || (step > 0 && Math.abs(r) === (step % 6) + 1);
      let x = x0 - Math.ceil((x0 + 200) / uw) * uw;
      ctx.lineWidth = 2;
      while (x < 1180) {
        if (r === 0) { ctx.fillStyle = ink; ctx.fillText(unit, x, y); }
        else if (hot) { ctx.fillStyle = R; ctx.fillText(unit, x, y); }
        else { ctx.strokeStyle = V.rgba(flick ? W : K, 0.42); ctx.strokeText(unit, x, y); }
        x += uw;
      }
    }
    ctx.restore();
  }

  /* ================= gap  (beat 15–16, audio muted) ================= */
  function sGap(ctx, t, b) {
    V.bg(ctx, K);
    const e = E.outExpo(pb(b, 15, 16));
    ctx.fillStyle = R; ctx.fillRect(540 - 450 * e, 958, 900 * e, 4);
    V.text(ctx, 'wait for it.', 540, 880, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 76, fill: W });
  }

  /* ================= 05 LOOP  (beats 16–20, the drop) ================= */
  const BANDS = [
    { f: ANTON, s: 'MOTION DESIGN  /  ', bg: R, fg: K, cap: 0.56 },
    { f: SERIF, s: 'kinetic typography  —  ', bg: K, fg: W, cap: 0.62 },
    { f: ANTON, s: 'TYPE IN MOTION  /  ', bg: W, fg: K, cap: 0.56 },
    { f: MONO, s: '128 BPM  15 SEC  60 FPS  ', bg: K, fg: R, cap: 0.42 },
    { f: ANTON, s: 'RHYTHM  /  TIMING  /  ', bg: W, fg: K, cap: 0.56 },
    { f: SERIF, s: 'every frame on purpose  —  ', bg: R, fg: K, cap: 0.62 },
    { f: ANTON, s: 'KINETIC  /  ', bg: K, fg: W, cap: 0.56 },
  ];
  function drawBands(ctx, t, b) {
    const rot = b < 18 ? V.lerp(-26, -12, E.outExpo(pb(b, 16, 17))) : V.lerp(-12, 11, E.inOutExpo(pb(b, 17.9, 18.45)));
    const sc = V.lerp(1.25, 1, E.outExpo(pb(b, 16, 17)));
    ctx.save();
    ctx.translate(540, 960); ctx.rotate(rot * Math.PI / 180); ctx.scale(sc, sc);
    const bh = 200, n = 13, tt = Math.max(0, t - TB(16));
    let surge = 0;
    for (let kb = 16; kb < 24; kb++) { const d = t - TB(kb); if (d > 0) surge += 1 - Math.exp(-d / 0.06); }
    ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (let k = 0; k < n; k++) {
      const d = BANDS[k % BANDS.length], y = (k - (n - 1) / 2) * bh, dir = k % 2 ? -1 : 1;
      const stag = Math.abs(k - (n - 1) / 2) * 0.018;
      const ent = -dir * 2000 * (1 - E.outExpo(pb(b, 16 + stag, 16.45 + stag)));
      ctx.fillStyle = d.bg; ctx.fillRect(-1400 + ent, y - bh / 2 - 0.5, 2800, bh + 1);
      const capH = bh * d.cap, size = capSize(d.f, capH);
      ctx.font = fontStr(d.f, size); ctx.fillStyle = d.fg;
      const uw = ctx.measureText(d.s).width;
      const speed = 0.75 + 0.6 * V.hash(k * 3.1 + 1);
      const scroll = dir * speed * (110 * tt + 170 * surge) + V.hash(k) * uw;
      let x = -1400 - uw + ((scroll % uw) + uw) % uw;
      while (x < 1400) { ctx.fillText(d.s, x + ent, y + capH / 2); x += uw; }
    }
    ctx.restore();
  }
  function sLoop(ctx, t, b) {
    V.bg(ctx, K);
    drawBands(ctx, t, b);
    const f = V.hit(t, TB(16), 0.05);
    if (f > 0.01) { ctx.fillStyle = V.rgba(W, f * 0.5); ctx.fillRect(0, 0, 1080, 1920); }
  }

  /* ================= 06 MASK  (beats 20–24) ================= */
  let PROBE = null;
  function probe() {
    if (PROBE) return PROBE;
    const L = lay('TYPE', ANTON), h = 860, F = fitBox(L, 90, 920 - h / 2, 900, h);
    const [, x] = V.buffer('probe', V.W, V.H);
    x.clearRect(0, 0, V.W, V.H);
    wordDraw(x, 'TYPE', ANTON, F, '#000');
    const img = x.getImageData(0, 0, V.W, V.H).data;
    const A = (px, py) => img[(Math.round(py) * V.W + Math.round(px)) * 4 + 3] > 128;
    const top = F.top, bot = F.bot, hh = bot - top;
    // T: a point inside the stem
    const gT = L.ch[0];
    let tx = F.ox + ((gT.l + gT.r) / 2) * F.sx, ty = top + hh * 0.7;
    // P: centre of the counter
    const gP = L.ch[2], [p0, p1] = gx(F, gP);
    let cx = (p0 + p1) / 2, cy = top + hh * 0.25;
    const row = top + hh * 0.25;
    let st = 0, s0 = 0;
    for (let px = p0; px <= p1; px++) {
      const on = A(px, row);
      if (st === 0 && on) st = 1;
      else if (st === 1 && !on) { st = 2; s0 = px; }
      else if (st === 2 && on) { cx = (s0 + px) / 2; break; }
    }
    st = 0;
    for (let py = top; py <= bot; py++) {
      const on = A(cx, py);
      if (st === 0 && on) st = 1;
      else if (st === 1 && !on) { st = 2; s0 = py; }
      else if (st === 2 && on) { cy = (s0 + py) / 2; break; }
    }
    PROBE = { L, F, T: [tx, ty], P: [cx, cy] };
    return PROBE;
  }
  function sMask(ctx, t, b) {
    const P = probe();
    let S = 1, ax = 540, ay = 920, px = 540, py = 920, shad = 18;
    if (b < 21.4) {
      const e = E.outExpo(pb(b, 20, 21.4));
      S = Math.exp(Math.log(45) * (1 - e)); [px, py] = P.T;
      ax = V.lerp(540, px, e); ay = V.lerp(960, py, e);
      shad = 18 * e;
    } else if (b >= 23) {
      const e = E.inExpo(pb(b, 23, 24));
      S = Math.exp(Math.log(220) * e); [px, py] = P.P;
      ax = V.lerp(px, 540, e); ay = V.lerp(py, 960, e);
      shad = 18 * (1 - pb(b, 23, 23.6));
    } else {
      S = 1 + 0.018 * C.pulse(t, 1, 0.09);
    }
    shad += 8 * C.pulse(t, 1, 0.12) * pb(b, 21.4, 21.6) * (1 - pb(b, 23, 23.2));
    const zoom = (x) => { x.translate(ax, ay); x.scale(S, S); x.translate(-px, -py); };
    const [bc, bx] = V.buffer('bands');
    V.bg(bx, K); drawBands(bx, t, b);
    const [mc, mx] = V.buffer('mask');
    mx.clearRect(0, 0, V.W, V.H);
    mx.save(); zoom(mx); wordDraw(mx, 'TYPE', ANTON, P.F, '#000'); mx.restore();
    mx.globalCompositeOperation = 'source-in'; mx.drawImage(bc, 0, 0);
    V.bg(ctx, W);
    // caption in the negative space
    const cap = E.outExpo(pb(b, 21.2, 21.8)) * (1 - E.inQuart(pb(b, 22.8, 23.1)));
    if (cap > 0) {
      ctx.save(); ctx.globalAlpha = cap;
      V.text(ctx, 'a word is a window.', 990, 400 + (1 - cap) * 24, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 54, fill: K, align: 'right' });
      ctx.restore();
    }
    if (shad > 0.3) { ctx.save(); ctx.translate(shad, shad); zoom(ctx); wordDraw(ctx, 'TYPE', ANTON, P.F, R); ctx.restore(); }
    ctx.drawImage(mc, 0, 0);
  }

  /* ================= 07 SEQUENCE  (beats 24–28) ================= */
  const ROWS = [
    { s: 'MOVE', f: ANTON }, { s: 'shape', f: SERIF }, { s: 'TIME', f: MONO }, { s: 'RHYTHM', f: ANTON },
  ];
  function sLadder(ctx, t, b) {
    V.bg(ctx, W);
    const top0 = 392, rowH = 258, ink = 206;
    let barY = top0;
    for (let i = 1; i < 4; i++) barY += rowH * E.outExpo(pb(b, 24 + i, 24.4 + i));
    const barW = 1080 * E.outExpo(pb(b, 24, 24.45));
    const barC = b >= 27 ? R : K;
    ctx.fillStyle = barC; ctx.fillRect(0, barY, barW, rowH - 10);
    ROWS.forEach((row, i) => {
      const b0 = 24 + i;
      if (b < b0) return;
      const rt = top0 + i * rowH;
      const on = Math.abs(barY - rt) < rowH / 2 && barW > 540;
      const fill = on ? (b >= 27 ? K : W) : K;
      // rule + index
      ctx.fillStyle = K;
      ctx.fillRect(0, rt + rowH - 4, 1080 * E.outExpo(pb(b, b0, b0 + 0.6)), 2);
      V.text(ctx, pad(i + 1), 990, rt + 34, { family: 'JetBrains Mono', weight: 800, size: 24, fill: on ? (b >= 27 ? K : R) : K, align: 'right' });
      const L = lay(row.s, row.f);
      let s = ink / L.h, sx = s;
      if (L.w * sx > 800) sx = 800 / L.w;
      const F = { sx, sy: s, ox: 90 - L.l * sx, oy: rt + (rowH - 10 - L.h * s) / 2 + L.asc * s };
      ctx.save();
      ctx.beginPath(); ctx.rect(0, rt, 1080, rowH - 10); ctx.clip();
      L.ch.forEach((g, j) => {
        const e = E.outExpo(pb(b, b0 + j * 0.04, b0 + 0.5 + j * 0.04));
        let dx = 0, dy = 0, kx = 1, ky = 1, c = g.c, ay;
        if (i === 0) { dx = (1 - e) * 900; kx = 1 + (1 - e) * 0.6; }
        else dy = (1 - e) * rowH;
        if (i === 2 && b < b0 + 0.18 + j * 0.09) c = scramble(t, j + 40, '0123456789:/');
        if (i === 3) {
          let h = 0;
          for (let k = 0; k < 4; k++) h += V.hit(t, TB(27.25 + k * 0.125) + j * 0.012, 0.07) * (k % 2 ? -1 : 1);
          ky = 1 + 0.35 * h; kx = 1 - 0.1 * h;
          ay = (j % 2 ? F.oy - L.asc * s : F.oy);
        }
        glyph(ctx, row.f, F, g, fill, { dx, dy, kx, ky, c, ay });
      });
      ctx.restore();
    });
    // wipe-in panel from the right
    const pw = E.inQuart(pb(b, 27.5, 28));
    if (pw > 0) { ctx.fillStyle = K; ctx.fillRect(1080 * (1 - pw), 0, 1080 * pw + 2, 1920); }
  }

  /* ================= 08 END CARD  (beats 28–32) ================= */
  function sEnd(ctx, t, b) {
    V.bg(ctx, K);
    const L = lay(NAME, ANTON);
    const sx = Math.min(900 / L.w, 560 / (2.1 * L.h)), sy = 2.1 * sx;
    const nTop = 548, F = { sx, sy, ox: 90 - L.l * sx, oy: nTop + L.asc * sy };
    const nBot = nTop + L.h * sy;
    const n = L.ch.length, step = Math.min(0.0625, 0.7 / n);
    // meta row + rule
    const meta = (str, x, align, b0) => {
      const k = Math.floor(str.length * pb(b, b0, b0 + 0.5));
      if (k > 0) V.text(ctx, str.slice(0, k), x, 470, { family: 'JetBrains Mono', weight: 500, size: 24, fill: W, align, tracking: 3 });
    };
    meta('SHOWREEL 2026', 90, 'left', 28.1);
    meta('15 SEC / 128 BPM', 990, 'right', 28.3);
    ctx.fillStyle = W; ctx.fillRect(90, 505, 900 * E.outExpo(pb(b, 28, 28.9)), 2);
    // name: scramble → lock with a slam
    L.ch.forEach((g, i) => {
      const appear = 28 + i * step * 0.5, lock = 28 + 0.12 + (i + 1) * step;
      if (b < appear) return;
      if (b < lock) {
        glyph(ctx, ANTON, F, g, V.rgba(W, 0.55), { c: scramble(t, i), ay: nBot, ky: 0.8 + 0.2 * pb(b, appear, lock) });
      } else {
        const lt = t - TB(lock), s = Math.exp(-lt * 12) * Math.cos(lt * 30);
        glyph(ctx, ANTON, F, g, lt < 0.07 ? R : W, { ay: nBot, ky: 1 + 0.16 * s, kx: 1 - 0.07 * s });
      }
    });
    // role bar
    const barY = nBot + 44, barH = 96, bw = 900 * E.outExpo(pb(b, 28.3, 29));
    if (bw > 0) {
      ctx.fillStyle = R; ctx.fillRect(90, barY, bw, barH);
      ctx.save(); ctx.beginPath(); ctx.rect(90, barY, bw, barH); ctx.clip();
      const tx = 116 - 60 * (1 - E.outExpo(pb(b, 28.4, 29.1)));
      V.text(ctx, 'MOTION DESIGNER', tx, barY + barH / 2 + 2, { family: 'Inter', weight: 900, size: 54, fill: K, align: 'left', tracking: 5 });
      ctx.restore();
    }
    // serif line, rising out of a clip
    const sy2 = barY + barH + 96, se = E.outExpo(pb(b, 28.6, 29.3));
    ctx.save(); ctx.beginPath(); ctx.rect(0, sy2 - 70, 1080, 100); ctx.clip();
    V.text(ctx, 'type, time & rhythm.', 90, sy2 + (1 - se) * 90, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 66, fill: W, align: 'left' });
    ctx.restore();
    // blinking cursor on the beat
    ctx.fillStyle = V.rgba(W, 0.35); ctx.fillRect(90, sy2 + 60, 900 * E.outExpo(pb(b, 28.8, 29.6)), 2);
    // URL line, typed on
    const url = 'crewupa.com', uk = Math.floor((url.length + 1) * pb(b, 28.9, 29.4));
    if (uk > 0) {
      V.text(ctx, url.slice(0, uk), 90, sy2 + 112, { family: 'JetBrains Mono', weight: 800, size: 34, fill: W, align: 'left', tracking: 2 });
      const uw = V.measure(ctx, url.slice(0, uk), { family: 'JetBrains Mono', weight: 800, size: 34, tracking: 2 });
      if (b < 29.4 || Math.floor(b * 2) % 2 === 0) { ctx.fillStyle = R; ctx.fillRect(90 + uw + 6, sy2 + 96, 18, 32); }
      V.text(ctx, '\u2197', 990, sy2 + 112, { family: 'JetBrains Mono', weight: 800, size: 34, fill: R, align: 'right', alpha: pb(b, 29.2, 29.4) });
    }
  }

  /* ================= reel ================= */
  const SCENES = [
    [4, sSlam, (b) => ({ ink: b < 2 ? W : K, label: '01 / 08  SLAM' })],
    [8, sSlice, () => ({ ink: K, label: '02 / 08  SLICE' })],
    [12, sStretch, () => ({ ink: W, label: '03 / 08  STRETCH' })],
    [15, sEcho, (b) => ({ ink: b >= 14.5 && Math.floor((b - 14.5) * 4) % 2 === 1 ? W : K, label: '04 / 08  ECHO' })],
    [16, sGap, () => ({ ink: W, label: '·  ·  ·' })],
    [20, sLoop, () => ({ ink: W, chip: K, label: '05 / 08  LOOP' })],
    [24, sMask, () => ({ ink: K, chip: W, label: '06 / 08  MASK' })],
    [28, sLadder, () => ({ ink: K, label: '07 / 08  SEQUENCE' })],
    [99, sEnd, () => ({ ink: W, top: false, label: '08 / 08  END' })],
  ];

  V.reel({
    title: 'KINETIC TYPE',
    duration: 15, fps: 60, bpm: 128,
    blur: {
      samples: 4,
      shutter: (t) => (CUTS.some((c) => Math.abs(t - TB(c)) < 1 / 60) ? 0 : 0.5),
    },
    draw(ctx, t) {
      const b = t / SPB;
      const amp = 16 * V.hit(t, TB(16), 0.18) + 10 * V.hit(t, TB(28), 0.15) + 6 * V.hit(t, 0, 0.12);
      ctx.save();
      if (amp > 0.3) { const [dx, dy] = V.shake(t, amp, 22); ctx.translate(dx, dy); }
      const sc = SCENES.find((s) => b < s[0]);
      sc[1](ctx, t, b);
      ctx.restore();
      hud(ctx, t, b, sc[2](b));
    },
    post(ctx, t) {
      const b = t / SPB;
      const ch = 10 * V.hit(t, TB(16), 0.09) + 9 * V.hit(t, TB(28), 0.1) + 3 * V.hit(t, 0, 0.08);
      if (ch > 0.6) V.chroma(ctx, ch, 0);
      if (b > 14.72 && b < 15) V.slices(ctx, t, 50, 9, 4);
      V.grain(ctx, t, 0.07);
      V.vignette(ctx, 0.2);
    },
    music(m) {
      const ROOT = [33, 29, 36, 31];                                  // A F C G
      const CH = [[57, 60, 64, 67], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]];
      const bar = (b) => Math.floor(b / 4) % 4;
      // ---- drums
      for (let b = 0; b < 28; b++) if (b !== 15) m.kick(b, { gain: b >= 16 ? 1 : 0.95 });
      m.kick(14.5, { gain: 0.75 }); m.kick(14.75, { gain: 0.8 });
      m.kick(28, { gain: 1, decay: 4 });
      for (const b of [1, 3, 5, 7, 9, 11, 13, 17, 19, 21, 23, 25, 27]) m.clap(b, { gain: 0.7 });
      for (let b = 0; b < 15; b++) m.hat(b + 0.5, { gain: 0.22, open: b % 4 === 3 });
      for (let s = 4 * 4; s < 15 * 4; s++) if (s % 2) m.hat(s / 4, { gain: 0.08, pan: -0.3 });
      for (let s = 16 * 4; s < 28 * 4; s++) if (s % 4) m.hat(s / 4, { gain: s % 4 === 2 ? 0.26 : 0.12, pan: s % 2 ? 0.3 : -0.2, open: s % 16 === 14 });
      for (let i = 0; i < 8; i++) m.snare(14 + i * 0.125, { gain: 0.12 + i * 0.06, verb: 0.2 });
      for (let i = 0; i < 4; i++) m.snare(27 + i * 0.25, { gain: 0.25 + i * 0.08, verb: 0.2 });
      // hook: every letter slam gets a hit
      [0, 0.25, 0.5, 0.75].forEach((x, i) => { m.tick(x, { freq: 1300 + i * 250, gain: 0.3 }); if (i % 2) m.snare(x, { gain: 0.4 }); });
      // ---- bass
      for (let b = 0; b < 15; b++) m.bass(b + 0.5, 0.42, ROOT[bar(b)] + (b % 4 === 3 ? 12 : 0), { type: 'saw', cutoff: 360, env: 1500, gain: 0.42 });
      for (let s = 16 * 4; s < 28 * 4; s++) {
        if (s % 4 === 0) continue;
        m.bass(s / 4, 0.22, ROOT[bar(s / 4)] + (s % 4 === 3 ? 12 : 0), { type: 'reese', cutoff: 280, env: 2400, fdecay: 16, gain: 0.42 });
      }
      // ---- chords
      m.chord(0, 2, CH[0], { gain: 0.2, pluck: 2.2, verb: 0.6, cutoff: 1400 });
      for (let br = 1; br < 4; br++) for (const o of [0.5, 2, 3.5]) {
        const b = br * 4 + o; if (b >= 15) continue;
        m.chord(b, 0.35, CH[br % 4], { gain: 0.15, pluck: 7, cutoff: 900, env: 3500, verb: 0.35 });
      }
      for (let br = 4; br < 6; br++) for (const o of [0.5, 2, 3.5]) m.chord(br * 4 + o, 0.4, CH[br % 4], { gain: 0.2, pluck: 5, cutoff: 1400, env: 6000, verb: 0.45 });
      for (let i = 0; i < 4; i++) m.chord(24 + i, 0.5, CH[i], { gain: 0.2, pluck: 5, cutoff: 1500, env: 6000, verb: 0.45 });
      for (let s = 16 * 4; s < 24 * 4; s++) {
        const c = CH[bar(s / 4)];
        m.lead(s / 4, 0.24, c[[0, 2, 1, 3][s % 4]] + 12, { gain: 0.06, decay: 9, pan: s % 2 ? 0.4 : -0.4, verb: 0.3 });
      }
      // ---- fx
      m.impact(0, { gain: 0.55 }); m.subdrop(0, { gain: 0.35, len: 0.8 });
      m.whoosh(3.4, 0.6); m.zap(6); m.zap(7, { from: 4200 }); m.whoosh(7.4, 0.6, { dir: -1 });
      m.whoosh(11.3, 0.7); m.riser(11, 15, { gain: 0.38 }); m.glitch(14.5, 0.5, { gain: 0.18 });
      m.mute(15, 16);
      m.impact(16, { gain: 0.9 }); m.subdrop(16); m.downlifter(16, 3);
      m.whoosh(17.85, 0.6); m.whoosh(20, 1.4, { dir: -1 }); m.riser(22.5, 24, { gain: 0.2 }); m.whoosh(23.2, 0.8);
      for (let i = 0; i < 6; i++) m.tick(26 + i / 8, { freq: 3000 + i * 180, gain: 0.12 });
      m.riser(26, 28, { gain: 0.2 }); m.whoosh(27.45, 0.55, { dir: -1 });
      m.impact(28); m.subdrop(28);
      for (let i = 0; i < 8; i++) m.tick(28 + i / 16, { freq: 2200 + (i % 3) * 400, gain: 0.1 });
      m.chord(28, 4, [45, 57, 60, 64, 67, 71], { gain: 0.24, attack: 0.01, release: 1.2, cutoff: 1800, env: 4000, fdecay: 1.5, verb: 0.9 });
      m.lead(28, 3, 81, { gain: 0.06, decay: 1.2, verb: 0.8 });
      m.lead(28.5, 3, 76, { gain: 0.05, decay: 1.2, verb: 0.8, pan: 0.3 });
    },
  });
})();
