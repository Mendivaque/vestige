/* Reel 5 — "crewupa · 30 GÜN".
 * 15s / 9:16 promo for crewupa.com, all copy and facts taken from the live site.
 * Story: hook (Ekibini kur. 30 günde çık.) → the problem (a group chat going silent)
 * → the 30-day sprint as a camera ride down a road of day-tiles → four mechanics
 * as colour-shifting UI scenes → roles / apply → clean wordmark lockup.
 * 128 BPM, 32 beats, every cut and pop is on the grid. Music is scored below and
 * the chat pops are shared with the score via MSGS.
 */
(function () {
  const BPM = 128, SPB = 60 / BPM, B = (b) => b * SPB;
  const E = V.ease, W = V.W, H = V.H, CX = W / 2, CY = H / 2;
  const C = {
    bg: '#0b0816', bg2: '#141026', bg3: '#1e1b3a', deep: '#3b1486', mid: '#5b21b6', v1: '#6d28d9', v2: '#8b5cf6',
    v3: '#a78bfa', v4: '#c4b5fd', lav: '#f1ebff', cream: '#fbf7f2', teal: '#2cc9a8', mint: '#6ee7b7', org: '#f97316',
    amb: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
  };
  const DISP = 'Unbounded', SANS = 'Geist', MONO = 'Geist Mono';

  /* ---------------- helpers ---------------- */
  const memo = {};
  const once = (k, fn) => (k in memo ? memo[k] : (memo[k] = fn()));
  const capH = (ctx, fam, w) => once(`cap|${fam}|${w}`, () => {
    ctx.save(); V.font(ctx, 100, fam, w); const m = ctx.measureText('H').actualBoundingBoxAscent / 100; ctx.restore(); return m;
  });
  const widthOf = (ctx, s, fam, w) => once(`w|${s}|${fam}|${w}`, () => V.measure(ctx, s, { size: 100, family: fam, weight: w }) / 100);
  const fitSize = (ctx, s, fam, target, w = 800, max = 9999) => Math.min(max, target / widthOf(ctx, s, fam, w));
  const glyphsOf = (ctx, s, fam, size, w = 800, tr = 0) => once(`g|${s}|${fam}|${size.toFixed(1)}|${w}|${tr}`, () => V.glyphs(ctx, s, { size, family: fam, weight: w, tracking: tr }));
  const prog = V.prog, clamp = V.clamp, lerp = V.lerp;
  const en = (b, t0, d = 0.35, e = E.outExpo) => e(prog(b, t0, t0 + d));

  /** Text centred vertically on its cap height at (x,y). */
  function word(ctx, s, x, y, size, fill, o = {}) {
    const fam = o.fam || DISP, w = o.w || 800;
    ctx.save();
    V.font(ctx, size, fam, w);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = (o.tr || 0) + 'px';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const yy = y + (capH(ctx, fam, w) * size) / 2;
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 3; ctx.lineJoin = 'round'; ctx.strokeText(s, x, yy); }
    if (fill) { ctx.fillStyle = fill; ctx.fillText(s, x, yy); }
    ctx.restore();
  }
  const mono = (ctx, s, x, y, size, fill, o = {}) => word(ctx, s, x, y, size, fill, Object.assign({ fam: MONO, w: 500, tr: size * 0.12 }, o));
  const body = (ctx, s, x, y, size, fill, o = {}) => word(ctx, s, x, y, size, fill, Object.assign({ fam: SANS, w: 600 }, o));
  /** Line that rises out of a mask. p in 0..1. */
  function rise(ctx, s, x, y, size, fill, p, o = {}) {
    if (p <= 0.001) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 0.72, W, size * 1.44); ctx.clip();
    word(ctx, s, x, y + (1 - p) * size * 1.1, size, fill, o);
    ctx.restore();
  }
  function dot(ctx, x, y, r, col, sx = 1, sy = 1) {
    if (r <= 0.2) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.beginPath(); ctx.arc(0, 0, r, 0, V.TAU); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function ring(ctx, x, y, r, lw, col, a = 1) {
    if (a <= 0.001 || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, V.TAU); ctx.stroke(); ctx.restore();
  }
  const pill = (ctx, x, y, w, h, fill, stroke, lw = 2) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  };
  const card = (ctx, x, y, w, h, r, fill, stroke) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };
  const SCR = 'ABCDEF0123456789#/<>*+=';
  const decode = (s, p, seed = 0, tb = 0) => {
    let out = ''; const q = p * 1.3;
    for (let i = 0; i < s.length; i++) {
      const k = i / s.length;
      if (q >= k + 0.3 || s[i] === ' ') out += s[i];
      else if (q > k) out += SCR[Math.floor(V.hash(i * 7.3 + seed + Math.floor(tb * 30)) * SCR.length)];
    }
    return out;
  };
  const circleWipe = (ctx, b, b0, d, ox, oy, col) => {
    const p = E.outExpo(prog(b, b0, b0 + d));
    if (p > 0) dot(ctx, ox, oy, p * 2700, col);
  };
  function confetti(ctx, b, b0, ox, oy, n, seed, cols) {
    const tau = (b - b0) * SPB; if (tau < 0 || tau > 1.6) return;
    const r = V.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6, sp = 500 + r() * 1100, rot = r() * 6 + tau * (r() - 0.5) * 14, sz = 10 + r() * 16;
      const x = ox + Math.cos(a) * sp * tau * (1 - 0.35 * tau), y = oy + Math.sin(a) * sp * tau + 1500 * tau * tau;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = clamp(1.6 - tau) ; ctx.fillStyle = cols[i % cols.length];
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, sz * 0.5, 0, V.TAU); ctx.fill(); } else ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
      ctx.restore();
    }
  }
  const brandMini = (ctx, col, a = 1) => word(ctx, 'crewupa', 990, 312, 36, col, { align: 'right', tr: -1.2, alpha: a });
  const eyebrow = (ctx, s, b, b0, col, t) => mono(ctx, decode(s, prog(b, b0, b0 + 0.4), 3, t), 90, 312, 26, col, { align: 'left' });

  /* ---------------- structure ---------------- */
  const S_HOOK = 0, S_PROB = 4, S_SPRINT = 8, S_MECH = 16, S_CTA = 24;
  // Chat messages: [beat, side, text]. Shared with the score so every pop has a tick.
  const MSGS = [
    [4.05, 'L', 'ilk toplantı ne zaman?'], [4.3, 'R', 'cumartesi olur'], [4.55, 'L', 'ben landing\'e bakarım'],
    [4.8, 'R', 'ben tasarımı çıkarırım'], [5.3, 'L', 'bu hafta biraz yoğunum'], [5.9, 'R', 'tamam sorun değil'],
    [6.3, 'L', 'hafta sonu bakarım…'],
  ];

  /* =========================================================
     HOOK — Ekibini kur. 30 günde çık.
     ========================================================= */
  function kurLayout(ctx) {
    return once('kur', () => {
      const w = widthOf(ctx, 'KUR', DISP, 900), r0 = 0.12, g0 = 0.06, unit = w + g0 + 2 * r0, size = 900 / unit;
      const cap = capH(ctx, DISP, 900) * size, left = CX - (unit * size) / 2;
      return { size, cap, left, r: r0 * size, dotX: left + (w + g0 + r0) * size, dotY: 0 };
    });
  }
  function drawHook(ctx, t, b) {
    const lp = b + 0.1; // start mid-move so frame 0 is already a strong image
    if (b < 2) {
      const flip = b >= 1.5;
      const bg = flip ? C.lav : C.v1, fg = flip ? C.bg : C.lav;
      V.bg(ctx, bg);
      // giant circle behind
      dot(ctx, CX, CY + 60, lerp(900, 640, E.outExpo(clamp(lp * 1.2))) * (flip ? 1.3 : 1), flip ? C.v4 : C.mid);
      ring(ctx, CX, CY, E.outExpo(clamp(lp / 0.8)) * 1300, 14, C.lav, 1 - clamp(lp / 0.8));
      // EKİBİNİ banner
      const s1 = fitSize(ctx, 'EKİBİNİ', DISP, 900, 900), cap1 = capH(ctx, DISP, 900) * s1;
      const G = glyphsOf(ctx, 'EKİBİNİ', DISP, s1, 900);
      const y1 = CY - 330;
      ctx.save(); ctx.beginPath(); ctx.rect(0, y1 - cap1, W, cap1 * 2.4); ctx.clip();
      for (const g of G) {
        const p = E.outExpo(clamp((lp - g.i * 0.03) / 0.32));
        word(ctx, g.ch, CX + g.x, y1 + (1 - p) * cap1 * 1.6, s1, fg, { w: 900 });
      }
      ctx.restore();
      // KUR. giant, drops in on the second eighth
      const L = kurLayout(ctx), kb = lp - 0.5;
      if (kb > 0) {
        const k = E.outBack(clamp(kb / 0.28), 2.4), by = CY + 130 + L.cap / 2;
        ctx.save(); ctx.translate(CX, by); ctx.scale(lerp(1.4, 1, k), lerp(0.5, 1, k));
        V.font(ctx, L.size, DISP, 900); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = fg;
        ctx.fillText('KUR', L.left - CX, 0);
        ctx.restore();
        const dp = clamp((kb - 0.1) / 0.5), dy = lerp(-500, by - L.r, E.outBounce(dp));
        const land = V.hit(b, 1.1 + 0.0, 0.05) * (dp >= 1 ? 1 : 0);
        dot(ctx, L.dotX, dy, L.r, C.org, 1 + land * 0.3, 1 - land * 0.25);
        if (dp >= 1) ring(ctx, L.dotX, by - L.r, L.r + 320 * E.outExpo(prog(b, 1.1, 1.7)), 6, C.org, 1 - prog(b, 1.1, 1.7));
      }
      mono(ctx, 'SEZON 01 · BAŞVURULAR AÇIK', CX, 312, 22, fg, { alpha: en(lp, 0.3, 0.3, E.outCubic) });
    } else {
      const flip = b >= 3;
      const lb = b - 2;
      V.bg(ctx, flip ? C.org : C.bg);
      if (!flip) {
        // 30 — count up, with expanding echo outlines
        const val = Math.round(30 * E.outExpo(clamp(lb / 0.4)));
        const s = fitSize(ctx, '30', DISP, 800, 900), cap = capH(ctx, DISP, 900) * s;
        for (let k = 5; k >= 1; k--) {
          const e = E.outExpo(clamp((lb - k * 0.03) / 0.5));
          ctx.save(); ctx.globalAlpha = (1 - k / 6) * 0.9;
          word(ctx, '30', CX, CY - 130, s * (1 + k * 0.05 * e), null, { w: 900, stroke: C.v2, lw: 3 });
          ctx.restore();
        }
        const sq = E.outBack(clamp(lb / 0.3), 2.2);
        ctx.save(); ctx.translate(CX, CY - 130); ctx.scale(lerp(1.3, 1, sq), lerp(0.7, 1, sq)); ctx.translate(-CX, -(CY - 130));
        word(ctx, String(val).padStart(2, '0') === '00' ? '0' : String(val), CX, CY - 130, s, C.lav, { w: 900 });
        ctx.restore();
        // GÜNDE banner
        const s2 = fitSize(ctx, 'GÜNDE', DISP, 800, 900), cap2 = capH(ctx, DISP, 900) * s2;
        rise(ctx, 'GÜNDE', CX, CY - 130 + cap / 2 + 140, s2, C.v3, en(lb, 0.5, 0.35), { w: 900, tr: 8 });
        // beat counter squares
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i <= Math.floor(b) % 4 ? C.v2 : C.bg3; ctx.fillRect(90 + i * 34, 1440, 24, 10); }
      } else {
        const lc = b - 3;
        const L = once('cik', () => {
          const w = widthOf(ctx, 'ÇIK', DISP, 900), r0 = 0.12, g0 = 0.06, unit = w + g0 + 2 * r0, size = 900 / unit;
          return { size, cap: capH(ctx, DISP, 900) * size, left: CX - (unit * size) / 2, r: r0 * size, dotX: CX - (unit * size) / 2 + (w + g0 + r0) * size };
        });
        const k = E.outBack(clamp((lc + 0.1) / 0.3), 2.2), by = CY + L.cap / 2 - 60;
        ctx.save(); ctx.translate(CX, by); ctx.scale(lerp(1.4, 1, k), lerp(0.55, 1, k));
        V.font(ctx, L.size, DISP, 900); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C.bg;
        ctx.fillText('ÇIK', L.left - CX, 0); ctx.restore();
        const dp = clamp((lc - 0.05) / 0.35), dy = lerp(-400, by - L.r, E.outBounce(dp));
        dot(ctx, L.dotX, dy, L.r, C.v1);
        mono(ctx, '30 GÜN · 4 ROL · 1 ÜRÜN', CX, by + 170, 24, C.bg, { alpha: en(lc, 0.25, 0.3, E.outCubic) });
        // dark circle grows out of the dot into the next scene
        const w = E.inOutExpo(prog(b, 3.5, 4));
        if (w > 0) dot(ctx, L.dotX, by - L.r, w * 2600, C.bg);
      }
    }
  }

  /* =========================================================
     PROBLEM — the group chat goes silent
     ========================================================= */
  function bubble(ctx, x, y, w, h, side, fill, txt, txtCol, a, sc) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= a;
    const ox = side === 'L' ? x : x + w;
    ctx.translate(ox, y + h); ctx.scale(sc, sc); ctx.translate(-ox, -(y + h));
    card(ctx, x, y, w, h, 34, fill);
    body(ctx, txt, x + 30, y + h / 2 + 1, 36, txtCol, { align: 'left', w: 500 });
    ctx.restore();
  }
  function drawProblem(ctx, t, b) {
    V.bg(ctx, C.bg);
    const lb = b - S_PROB;
    // ambient glow
    const g = ctx.createRadialGradient(CX, 1050, 0, CX, 1050, 900); g.addColorStop(0, V.rgba(C.v1, 0.28)); g.addColorStop(1, V.rgba(C.v1, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const silent = b >= 7, dim = en(b, 7, 0.3, E.outCubic);
    // headline (two acts)
    const s1 = fitSize(ctx, 'fikirsizlikten', DISP, 860, 800, 70), lh = s1 * 1.32;
    const act1 = b < 6.0;
    const Lx = 90;
    const l1 = act1 ? ['Yan projeler', 'fikirsizlikten', 'ölmez.'] : ['Üçüncü haftada', 'sessizleşen', 'gruplarda ölür.'];
    const t0 = act1 ? 4 : 6.0;
    const sHead = fitSize(ctx, 'Üçüncü haftada', DISP, 860, 800, 70), sz = Math.min(s1, sHead);
    const out = act1 ? 1 - en(b, 5.8, 0.2, E.inCubic) : 1;
    l1.forEach((s, i) => {
      const p = en(b, t0 + i * 0.12, 0.35) * out;
      const pink = !act1 && i === 2;
      rise(ctx, s, Lx, 380 + i * lh, sz, pink ? C.pink : C.lav, p, { align: 'left', w: 800, tr: -1 });
    });
    // strike-through on "ölmez." at the hinge
    if (act1) {
      const sp = en(b, 5.35, 0.3, E.inOutCubic);
      if (sp > 0) { ctx.fillStyle = C.pink; ctx.fillRect(Lx - 6, 380 + 2 * lh - 3, (widthOf(ctx, 'ölmez.', DISP, 800) * sz + 12) * sp, 8); }
    }

    // chat card
    const cx0 = 90, cy0 = 670, cw = 900, ch = 830;
    const cardIn = en(b, 3.9, 0.4);
    ctx.save();
    ctx.translate(0, (1 - cardIn) * 120); ctx.globalAlpha = cardIn;
    card(ctx, cx0, cy0, cw, ch, 44, C.bg2, V.rgba(C.v2, 0.35));
    // header
    [C.amb, C.teal, C.sky, C.pink].forEach((c, i) => { dot(ctx, cx0 + 64 + i * 34, cy0 + 60, 26, c); ring(ctx, cx0 + 64 + i * 34, cy0 + 60, 26, 4, C.bg2); });
    body(ctx, 'Yan proje ekibi', cx0 + 220, cy0 + 48, 34, C.lav, { align: 'left', w: 700 });
    mono(ctx, '4 KİŞİ', cx0 + 220, cy0 + 84, 18, C.v3, { align: 'left' });
    const wk = b < 5 ? 1 : b < 6 ? 2 : 3;
    const wkTxt = decode(`${wk}. HAFTA`, prog(b, [4, 5, 6][wk - 1], [4, 5, 6][wk - 1] + 0.3), wk, t);
    pill(ctx, cx0 + cw - 210, cy0 + 34, 170, 52, wk === 3 ? V.rgba(C.pink, 0.25) : V.rgba(C.v2, 0.3), wk === 3 ? C.pink : C.v2);
    mono(ctx, wkTxt, cx0 + cw - 125, cy0 + 61, 20, wk === 3 ? C.pink : C.v4);
    ctx.fillStyle = V.rgba(C.v2, 0.25); ctx.fillRect(cx0 + 30, cy0 + 118, cw - 60, 2);
    // messages
    MSGS.forEach(([mb, side, txt], i) => {
      const p = clamp((b - mb) / 0.28); if (p <= 0) return;
      const w = V.measure(ctx, txt, { size: 36, family: SANS, weight: 500 }) + 60, h = 70;
      const y = cy0 + 150 + i * 86, x = side === 'L' ? cx0 + 30 : cx0 + cw - 30 - w;
      bubble(ctx, x, y, w, h, side, side === 'L' ? '#2a2550' : C.v1, txt, C.lav, E.outCubic(p), lerp(0.6, 1, E.outBack(p, 2.4)));
    });
    // typing dots
    const ty = clamp((b - 6.55) / 0.2) * (1 - prog(b, 7.0, 7.12));
    if (ty > 0) {
      const y = cy0 + 150 + 7 * 86 - 6;
      card(ctx, cx0 + 30, y, 130, 58, 29, '#2a2550');
      for (let i = 0; i < 3; i++) dot(ctx, cx0 + 66 + i * 28, y + 29 - Math.abs(Math.sin(b * 9 - i * 0.7)) * 9, 7, C.v4, 1, 1);
    }
    // silence: everything dims and the last message stays unanswered
    if (dim > 0) { ctx.fillStyle = V.rgba(C.bg, 0.72 * dim); ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch, 44); ctx.fill(); }
    ctx.restore();
    if (silent) mono(ctx, 'SESSİZLİK', CX, cy0 + ch / 2 + 60, 30, C.pink, { alpha: dim * (b < 7.5 ? 1 : 0), tr: 10 });

    // finish line: the drop is coming
    if (b >= 7.45) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      const p = E.inExpo(prog(b, 7.5, 8));
      const hh = 5 + 24 * p * p;
      ctx.fillStyle = C.lav; ctx.fillRect(CX - (W / 2) * (0.02 + p), CY - hh / 2, W * (0.02 + p), hh);
      ring(ctx, CX, CY, 20 + p * 60, 3, C.v3, p);
    }
  }

  /* =========================================================
     SPRINT — a camera ride down 30 day-tiles
     ========================================================= */
  const KD = [[8, 1], [9, 3], [10, 7], [11, 15], [12, 18], [13, 22], [14, 27], [15, 30], [16, 30]];
  function dayAt(b) {
    if (b <= KD[0][0]) return 1;
    for (let i = 0; i < KD.length - 1; i++) {
      const [b0, d0] = KD[i], [b1, d1] = KD[i + 1];
      if (b < b1) { const p = (b - b0) / (b1 - b0); return lerp(d0, d1, lerp(p, E.outCubic(p), 0.6)); }
    }
    return 30;
  }
  const MILES = [
    { b: 8, d: 1, t: 'Tanışma', s: 'Herkes aynı gün başlar.' }, { b: 9, d: 3, t: 'Fikir kilitlenir', s: 'Tek cümlelik ürün tanımı.' },
    { b: 10, d: 7, t: 'İlk check-in', s: 'Beş dakika, her hafta.' }, { b: 11, d: 15, t: 'Yarı yol', s: 'Çalışan ilk sürüm.' },
    { b: 12, d: 18, t: 'Zor hafta', s: 'Ritim tam burada devreye girer.' }, { b: 14, d: 27, t: 'Cila', s: 'Landing yazılır, demo çekilir.' },
    { b: 15, d: 30, t: 'Demo Day', s: 'Ürün vitrine çıkar.' },
  ];
  const tileCol = (d) => (d <= 7 ? C.v2 : d <= 14 ? C.teal : d <= 21 ? C.org : d <= 28 ? C.pink : C.amb);
  const roadX = (z) => Math.sin(z * 0.0011) * 300;
  const PR = V.rng(555);
  const PARTS = Array.from({ length: 260 }, () => ({ x: (PR() - 0.5) * 3200, y: -900 + PR() * 1330, z: PR() * 9000, c: [C.lav, C.v3, C.v4, C.teal, C.pink][Math.floor(PR() * 5)], r: 3 + PR() * 5 }));

  function drawSprint(ctx, t, b) {
    const day = dayAt(b);
    const warm = V.win(b, 11.95, 13.7, 0.12, 0.6);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, C.bg); sky.addColorStop(0.5, V.mix(C.bg2, C.org, warm * 0.35)); sky.addColorStop(0.62, V.mix('#2a1560', C.org, warm * 0.55)); sky.addColorStop(1, C.bg);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    const zc = 650 * (day - 1) - 800;
    const sh = V.shake(t, 16 * V.hit(t, B(12), 0.35), 30);
    const roll = 0.035 * Math.sin(b * 1.1) + 0.2 * E.inOutCubic(prog(b, 11.92, 12.15)) * (1 - E.inOutCubic(prog(b, 12.5, 13.7)));
    const whip = E.inExpo(prog(b, 15.7, 16)) * 1.1;
    const pulse = V.clock(BPM).pulse(t, 1, 0.12);
    const cam = {
      x: roadX(zc + 500) * 0.9 + sh[0] * 0.6, y: -150 + sh[1] * 0.6, z: zc,
      rx: 0.015, ry: Math.atan2(roadX(zc + 1200) - roadX(zc + 500) * 0.9, 1200) * 0.8 + whip, rz: roll,
      fov: 1250 * (1 + 0.06 * pulse) * (1 + 0.25 * E.outExpo(prog(b, 15, 15.4)) * (1 - prog(b, 15.4, 16))),
    };
    const GY = 430;
    const P = (x, y, z) => V.project([x, y, z], cam);
    const hz = P(0, GY, zc + 30000);
    const hy = clamp(hz.y, 200, 1600);
    // horizon glow
    const hg = ctx.createRadialGradient(CX, hy, 0, CX, hy, 950);
    hg.addColorStop(0, V.mix(C.v2, C.org, warm, 0.55)); hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = V.rgba(C.lav, 0.35); ctx.fillRect(0, hy - 1, W, 2);

    const fog = (z) => clamp(1 - (z - zc) / 9500) ** 1.4;
    // road edge rails
    ctx.save(); ctx.lineWidth = 3;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); let started = false;
      for (let z = zc + 80; z < zc + 9000; z += 250) {
        const p = P(roadX(z) + sd * 470, GY, z); if (!p.vis) continue;
        started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); started = true;
      }
      ctx.strokeStyle = V.rgba(V.mix(C.v3, C.org, warm), 0.45); ctx.stroke();
    }
    ctx.restore();

    // day tiles, far → near
    const i0 = Math.max(0, Math.floor((zc - 200) / 650) - 1);
    for (let i = Math.min(29, i0 + 15); i >= i0; i--) {
      const d = i + 1, z0 = 650 * i, z1 = z0 + 520;
      if (z1 - zc < 90) continue;
      const zz0 = Math.max(z0, zc + 90);
      const xc0 = roadX(zz0), xc1 = roadX(z1);
      const pts = [P(xc0 - 300, GY, zz0), P(xc0 + 300, GY, zz0), P(xc1 + 300, GY, z1), P(xc1 - 300, GY, z1)];
      if (pts.some((p) => !p.vis)) continue;
      const f = fog(z0), col = tileCol(d), passed = d < day - 0.4, cur = Math.abs(d - day) < 0.6;
      ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      ctx.save();
      if (cur) { ctx.fillStyle = V.mix(C.lav, col, 0.3, 0.9 * f); ctx.fill(); }
      else if (passed) { ctx.fillStyle = V.rgba(col, 0.9 * f); ctx.fill(); }
      else { ctx.fillStyle = V.rgba(col, 0.24 * f); ctx.fill(); ctx.strokeStyle = V.rgba(col, 0.85 * f); ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // milestone pillars
      const ms = MILES.find((m) => m.d === d);
      if (ms || d === 30) {
        const zm = (z0 + z1) / 2, xm = roadX(zm), base = P(xm, GY, zm), top = P(xm, GY - (d === 30 ? 520 : 300), zm);
        if (base.vis && top.vis) {
          ctx.save(); ctx.globalAlpha = f; ctx.lineCap = 'round';
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, 30 * base.s); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
          V.star(ctx, top.x, top.y, 55 * top.s * (d === 30 ? 1.6 : 1), 24 * top.s * (d === 30 ? 1.6 : 1), 4, b * 0.6); ctx.fillStyle = C.lav; ctx.fill();
          ctx.restore();
        }
      }
    }
    // drifting particles (speed streaks)
    ctx.save(); ctx.lineCap = 'round';
    for (const p of PARTS) {
      const zz = zc + ((((p.z - zc * 0.85) % 9000) + 9000) % 9000) + 80;
      const a = P(p.x + roadX(zz) * 0.5, p.y, zz); if (!a.vis) continue;
      const bb = P(p.x + roadX(zz) * 0.5, p.y, zz + 90);
      ctx.globalAlpha = fog(zz) * 0.8; ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1, p.r * a.s * 2.2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.vis ? bb.x : a.x, bb.vis ? bb.y : a.y); ctx.stroke();
    }
    ctx.restore();

    // --- overlays (screen space) ---
    ctx.save();
    if (warm > 0) { const wg = ctx.createRadialGradient(CX, CY, 200, CX, CY, 1100); wg.addColorStop(0, 'rgba(249,115,22,0)'); wg.addColorStop(1, V.rgba(C.org, 0.22 * warm)); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    const dd = Math.round(day), wkN = dd <= 7 ? 1 : dd <= 14 ? 2 : dd <= 21 ? 3 : dd <= 28 ? 4 : 5;
    const tc = tileCol(dd);
    mono(ctx, 'GÜN', 90, 330, 24, C.v4, { align: 'left', alpha: en(b, 8, 0.2) });
    word(ctx, String(dd).padStart(2, '0'), 90, 440, 200, C.lav, { align: 'left', w: 900, tr: -6, alpha: en(b, 8, 0.2) });
    mono(ctx, '/30', 90 + widthOf(ctx, String(dd).padStart(2, '0'), DISP, 900) * 200 - 12 + 30, 500, 34, tc, { align: 'left', alpha: en(b, 8, 0.2) });
    pill(ctx, 90, 570, 210, 52, V.rgba(tc, 0.2), tc);
    mono(ctx, `HAFTA ${wkN}`, 195, 597, 20, C.lav, { alpha: en(b, 8, 0.2) });
    brandMini(ctx, C.lav, en(b, 8, 0.3));
    // milestone card
    for (const m of MILES) {
      const a = m.b, e = m.d === 30 ? 16 : a + 0.95;
      if (b < a || b > e) continue;
      const pin = E.outExpo(prog(b, a, a + 0.22)), pout = 1 - E.inCubic(prog(b, e - 0.2, e));
      const col = tileCol(m.d), y = 770 + (1 - pin) * 80;
      ctx.save(); ctx.globalAlpha = pin * pout;
      card(ctx, 90, y - 50, 900, 250, 36, V.rgba(C.bg, 0.72), V.rgba(col, 0.6));
      ctx.fillStyle = col; ctx.fillRect(126, y - 14, 120, 8);
      mono(ctx, `GÜN ${String(m.d).padStart(2, '0')}`, 126, y + 30, 22, col, { align: 'left' });
      const sz = Math.min(84, fitSize(ctx, m.t, DISP, 800, 800));
      word(ctx, m.t, 126, y + 96, sz, C.lav, { align: 'left', tr: -1 });
      body(ctx, m.s, 126, y + 168, 34, C.v4, { align: 'left', w: 500 });
      ctx.restore();
    }
    // DEMO DAY stamp + confetti
    if (b >= 15) {
      const k = E.outBack(prog(b, 15.02, 15.3), 2.6), out = 1 - E.inCubic(prog(b, 15.8, 16));
      const s = fitSize(ctx, 'DEMO', DISP, 860, 900);
      ctx.save(); ctx.globalAlpha = out; ctx.translate(CX, 1230); ctx.rotate(-0.06); ctx.scale(k, k);
      word(ctx, 'DEMO', 0, -110, s, C.lav, { w: 900 }); word(ctx, 'DAY', 0, 110, s, C.amb, { w: 900 });
      ctx.restore();
      confetti(ctx, b, 15, CX, 1200, 150, 21, [C.amb, C.pink, C.teal, C.lav, C.v2]);
      const fl = V.hit(t, B(15), 0.08); if (fl > 0.01) { ctx.save(); ctx.globalAlpha = fl * 0.55; ctx.fillStyle = C.lav; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    // 30-segment progress bar
    const seg = (900 - 29 * 6) / 30;
    for (let i = 0; i < 30; i++) {
      const d = i + 1, x = 90 + i * (seg + 6);
      ctx.fillStyle = d < day - 0.4 ? tileCol(d) : Math.abs(d - day) < 0.6 ? C.lav : V.rgba(C.lav, 0.14);
      ctx.fillRect(x, 1462, seg, Math.abs(d - day) < 0.6 ? 20 : 12);
    }
  }

  /* =========================================================
     MECHANICS — four UI scenes, each a colour shift
     ========================================================= */
  const MECH = [
    { bg: C.v1, prev: C.bg, ox: CX, oy: CY, ink: C.lav, sub: C.v4, t: ['Taahhüde göre', 'eşleşme'] },
    { bg: C.teal, prev: C.v1, ox: W, oy: 250, ink: C.bg, sub: '#0f5a4c', t: ['Haftalık', 'check-in'] },
    { bg: C.org, prev: C.teal, ox: 0, oy: H - 200, ink: C.bg, sub: '#5a2408', t: ['Güven', 'puanı'] },
    { bg: C.bg, prev: C.org, ox: CX, oy: CY, ink: C.lav, sub: C.v3, t: ['Demo Day', 'oylaması'] },
  ];
  function mechTitle(ctx, m, lb, b0) {
    const sz = Math.min(96, fitSize(ctx, m.t[0].length > m.t[1].length ? m.t[0] : m.t[1], DISP, 860, 800));
    m.t.forEach((s, i) => rise(ctx, s, 90, 430 + i * sz * 1.28, sz, m.ink, en(lb, 0.12 + i * 0.1, 0.4), { align: 'left', tr: -1 }));
    return sz;
  }
  function drawMech(ctx, t, b) {
    const k = Math.min(3, Math.floor((b - S_MECH) / 2)), lb = b - S_MECH - 2 * k, b0 = S_MECH + 2 * k, m = MECH[k];
    V.bg(ctx, m.prev); circleWipe(ctx, b, b0, 0.5, m.ox, m.oy, m.bg);
    const inA = en(lb, 0.05, 0.3, E.outCubic);
    ctx.save(); ctx.globalAlpha = inA;
    eyebrow(ctx, `MEKANİK 0${k + 1} / 04`, b, b0 + 0.05, m.ink, t);
    brandMini(ctx, m.ink);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 1;
    mechTitle(ctx, m, lb, b0);
    ctx.restore();

    if (k === 0) { // ----- matching by commitment
      const P = [
        { n: 'Mert', h: 15, c: C.amb, from: [190, 760], to: [CX - 165, 910] },
        { n: 'Zeynep', h: 12, c: C.teal, from: [880, 690], to: [CX + 160, 940] },
        { n: 'Deniz', h: 14, c: C.sky, from: [560, 1240], to: [CX, 1100] },
        { n: 'Can', h: 4, c: C.pink, from: [820, 1180], to: [820, 1375] },
      ];
      const ep = E.inOutCubic(prog(lb, 0.55, 1.2)), teamIn = en(lb, 1.0, 0.4);
      // team ring
      ctx.save(); ctx.translate(CX, 990); ctx.rotate(b * 0.6); ctx.setLineDash([26, 18]);
      ring(ctx, 0, 0, 300 * teamIn, 4, C.lav, 0.7 * teamIn); ctx.restore();
      P.slice(0, 3).forEach((p, i) => { const q = P[(i + 1) % 3]; const x0 = lerp(p.from[0], p.to[0], ep), y0 = lerp(p.from[1], p.to[1], ep), x1 = lerp(q.from[0], q.to[0], ep), y1 = lerp(q.from[1], q.to[1], ep); ctx.strokeStyle = V.rgba(C.lav, 0.6 * teamIn); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
      P.forEach((p, i) => {
        const pin = E.outBack(prog(lb, 0.15 + i * 0.08, 0.5 + i * 0.08), 2), r = (30 + p.h * 4.2) * pin * (i === 3 ? 1 : lerp(1, 0.88, ep));
        const x = lerp(p.from[0], p.to[0], ep), y = lerp(p.from[1], p.to[1], ep) + Math.sin(b * 3 + i) * 6 * (1 - ep);
        dot(ctx, x, y, r, p.c);
        word(ctx, p.n[0], x, y, r * 0.9, C.bg, { w: 900 });
        mono(ctx, `${p.h} sa/hf`, x, y + r + 36, 26, C.lav, { alpha: pin });
        body(ctx, p.n, x, y + r + 76, 32, C.v4, { w: 600, alpha: pin });
      });
      mono(ctx, 'EKİP 07', CX, 720, 28, C.lav, { alpha: teamIn });
      // Can is routed to a lighter band
      const cp = en(lb, 1.2, 0.4, E.outCubic);
      if (cp > 0) { ctx.save(); ctx.globalAlpha = cp; card(ctx, 520, 1275, 470, 175, 34, null, V.rgba(C.lav, 0.7)); mono(ctx, '5 SAATLİK BANT', 755, 1305, 22, C.v4); ctx.restore(); }
      body(ctx, 'Rol dengesi, seviye ve saat', 90, 1445, 34, C.v4, { align: 'left', w: 500, alpha: en(lb, 1.3, 0.3, E.outCubic) });
      body(ctx, 'aynı anda bakılır.', 90, 1490, 34, C.v4, { align: 'left', w: 500, alpha: en(lb, 1.4, 0.3, E.outCubic) });
    }

    if (k === 1) { // ----- weekly check-in
      const nin = E.outBack(prog(lb, 0.25, 0.7), 1.8);
      ctx.save(); ctx.translate(0, (1 - nin) * -300); ctx.globalAlpha = clamp(nin * 2);
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
      card(ctx, 90, 650, 900, 190, 40, C.cream); ctx.shadowColor = 'transparent';
      card(ctx, 124, 686, 84, 84, 22, C.v1); dot(ctx, 166, 728, 12, C.lav);
      mono(ctx, 'CREWUPA · ŞİMDİ', 236, 700, 18, '#6b6480', { align: 'left' });
      body(ctx, 'Ekip 07, 2. hafta check-in zamanı.', 236, 745, 32, C.bg, { align: 'left', w: 700 });
      body(ctx, '5 dakika sürer.', 236, 790, 32, C.bg, { align: 'left', w: 500 });
      mono(ctx, '20:00', 950, 700, 22, C.v1, { align: 'right', w: 700 });
      ctx.restore();
      // ring timer
      const rp = E.inOutCubic(prog(lb, 0.5, 1.75)), R = 210, ry = 1140;
      ring(ctx, CX, ry, R, 26, V.rgba(C.bg, 0.18));
      ctx.save(); ctx.strokeStyle = C.bg; ctx.lineWidth = 26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(CX, ry, R, -Math.PI / 2, -Math.PI / 2 + V.TAU * rp); ctx.stroke(); ctx.restore();
      const secs = Math.round(300 * (1 - rp)), mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
      word(ctx, `${mm}:${ss}`, CX, ry - 10, 120, C.bg, { w: 800, tr: -3, fam: MONO });
      mono(ctx, '5 DAKİKA · HER HAFTA', CX, ry + 90, 20, C.bg);
      // three prompts
      ['Yapılanlar', 'Sıradaki adım', 'Engeller'].forEach((s, i) => {
        const p = E.outBack(prog(lb, 0.9 + i * 0.22, 1.25 + i * 0.22), 2), y = 890 + i * 0;
        const xs = [90, 405, 770], w = [270, 330, 220];
        ctx.save(); ctx.translate(xs[i] + w[i] / 2, 900); ctx.scale(p, p); ctx.translate(-(xs[i] + w[i] / 2), -900);
        pill(ctx, xs[i], 870, w[i], 62, C.bg); body(ctx, '✓ ' + s, xs[i] + w[i] / 2, 902, 26, C.lav, { w: 700 });
        ctx.restore();
      });
    }

    if (k === 2) { // ----- trust score
      const rows = [['1', 'Kampüs Bilet', 128], ['2', 'Ev Arkadaşım', 96], ['3', 'Stüdyo Takvim', 61]];
      rows.forEach(([rk, nm, sc], i) => {
        const p = E.outExpo(prog(lb, 0.25 + i * 0.14, 1.0 + i * 0.14)), y = 700 + i * 170;
        card(ctx, 90, y, 900, 140, 36, V.rgba(C.bg, 0.16));
        card(ctx, 90, y, Math.max(140, 900 * (sc / 128) * p), 140, 36, C.bg);
        word(ctx, rk, 150, y + 70, 54, C.org, { w: 900 });
        body(ctx, nm, 220, y + 70, 40, C.lav, { align: 'left', w: 700 });
        word(ctx, String(Math.round(sc * p)), 950, y + 70, 64, i === 0 ? C.amb : C.lav, { align: 'right', w: 900 });
      });
      const c1 = E.outBack(prog(lb, 1.05, 1.4), 2), c2 = E.outBack(prog(lb, 1.3, 1.65), 2);
      [['+ 4/4 check-in', C.bg, C.mint, 90, c1], ['− 2 hafta sessizlik', C.bg, C.pink, 470, c2]].forEach(([s, bg, col, x, p]) => {
        const w = V.measure(ctx, s, { size: 28, family: SANS, weight: 700 }) + 64;
        ctx.save(); ctx.translate(x + w / 2, 1270); ctx.scale(p, p); ctx.translate(-(x + w / 2), -1270);
        pill(ctx, x, 1240, w, 60, bg); body(ctx, s, x + w / 2, 1271, 28, col, { w: 700 }); ctx.restore();
      });
      body(ctx, 'Bitirmek ve düzenli olmak puanı yükseltir.', 90, 1370, 30, C.bg, { align: 'left', w: 600, alpha: en(lb, 1.2, 0.3, E.outCubic) });
    }

    if (k === 3) { // ----- Demo Day voting
      const cols = [{ x: 260, h: 300, c: C.v2, n: 2 }, { x: CX, h: 470, c: C.amb, n: 1 }, { x: 820, h: 210, c: C.pink, n: 3 }];
      const base = 1300;
      cols.forEach((c, i) => {
        const grow = E.outExpo(prog(lb, 0.25 + i * 0.12, 1.2 + i * 0.12));
        const h = c.h * grow;
        card(ctx, c.x - 120, base - h, 240, h, 26, c.c);
        word(ctx, String(c.n), c.x, base - h + 70, 84, C.bg, { w: 900, alpha: grow });
        mono(ctx, `ÜRÜN ${c.n}`, c.x, base + 40, 20, C.v3);
      });
      // votes fly into the columns
      const r = V.rng(77);
      for (let i = 0; i < 26; i++) {
        const tgt = i % 5 === 0 ? 0 : i % 5 === 1 || i % 5 === 2 ? 1 : i % 7 === 0 ? 2 : 1, st = 0.3 + (i / 26) * 1.0, pp = prog(lb, st, st + 0.45);
        if (pp <= 0 || pp >= 1) continue;
        const sx = 90 + r() * 900, sy = 1440 + r() * 30, tx = cols[tgt].x + (r() - 0.5) * 120, ty = base - cols[tgt].h * 0.6;
        dot(ctx, lerp(sx, tx, E.inOutCubic(pp)), lerp(sy, ty, pp) - Math.sin(pp * Math.PI) * 220, 9 * (1 - pp * 0.4), [C.lav, C.mint, C.pink][i % 3]);
      }
      // winner badge
      const bp = E.outBack(prog(lb, 1.2, 1.6), 2.4);
      if (bp > 0) {
        ctx.save(); ctx.translate(CX, base - 470 - 100); ctx.scale(bp, bp); ctx.rotate(Math.sin(b * 4) * 0.05);
        V.star(ctx, 0, 0, 78, 34, 5, 0); ctx.fillStyle = C.amb; ctx.fill(); ctx.restore();
        mono(ctx, 'DEMO DAY BİRİNCİSİ', CX, base - 470 - 200, 20, C.amb, { alpha: bp });
      }
      mono(ctx, '3 SEZON · 3 ÜRÜN · 1 KAZANAN', CX, 1490, 20, C.v4, { alpha: en(lb, 0.9, 0.3) });
    }
  }

  /* =========================================================
     CTA — roles → apply → lockup
     ========================================================= */
  function drawCTA(ctx, t, b) {
    const lb = b - S_CTA;
    if (b < 26) { // ----- roles
      V.bg(ctx, C.bg); circleWipe(ctx, b, 24, 0.5, CX, CY, C.v1);
      mono(ctx, decode('EKİP MASASI · 4 KİŞİ', prog(b, 24.05, 24.45), 5, t), 90, 312, 22, C.lav, { align: 'left' });
      brandMini(ctx, C.lav);
      ['Ekipte', 'yerin ne?'].forEach((s, i) => rise(ctx, s, 90, 430 + i * 122, 96, C.lav, en(lb, 0.12 + i * 0.1, 0.4), { align: 'left', tr: -1 }));
      const ty = 1090, tp = E.outBack(prog(lb, 0.3, 0.8), 1.6);
      dot(ctx, CX, ty, 230 * tp, C.mid); ring(ctx, CX, ty, 230 * tp, 5, C.v4, 0.7);
      mono(ctx, '~12 SA/HAFTA', CX, ty + 4, 32, C.lav, { alpha: tp });
      const roles = [
        { n: 'Yazılımcı', c: C.lav, ink: C.bg, from: [-400, 760], to: [300, 800], w: 400 },
        { n: 'Tasarımcı', c: C.pink, ink: C.bg, from: [W + 400, 800], to: [780, 830], w: 400 },
        { n: 'Büyüme', c: C.teal, ink: C.bg, from: [-400, 1420], to: [270, 1350], w: 330 },
        { n: 'Ürün', c: C.amb, ink: C.bg, from: [W + 400, 1440], to: [830, 1360], w: 250 },
      ];
      roles.forEach((r, i) => {
        const p = E.outBack(prog(lb, 0.3 + i * 0.16, 0.85 + i * 0.16), 1.7);
        const x = lerp(r.from[0], r.to[0], p), y = lerp(r.from[1], r.to[1], p);
        ctx.save(); ctx.translate(x, y); if (i === 0) { const pu = 1 + 0.05 * V.clock(BPM).pulse(t, 1, 0.15) * (lb > 1 ? 1 : 0); ctx.scale(pu, pu); }
        if (i === 0 && lb > 0.9) { ring(ctx, 0, 0, 90 + 30 * V.fract(lb * 2), 3, C.lav, 1 - V.fract(lb * 2)); }
        pill(ctx, -r.w / 2, -56, r.w, 112, r.c);
        word(ctx, r.n, 0, 0, 42, r.ink, { w: 800 });
        ctx.restore();
        // connector into the table
        ctx.strokeStyle = V.rgba(C.lav, 0.35 * p); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, CX, 0.55), lerp(y, ty, 0.55)); ctx.stroke();
      });
      // SEN
      const sp = E.outBack(prog(lb, 1.15, 1.5), 2.5);
      if (sp > 0) { ctx.save(); ctx.translate(300 + 150, 800 - 92); ctx.scale(sp, sp); pill(ctx, -60, -28, 120, 56, C.org); word(ctx, 'SEN', 0, 0, 28, C.bg, { w: 900 }); ctx.restore(); }
      body(ctx, 'Ürünü ayağa kaldırırsın.', CX, 1475, 44, C.lav, { w: 600, alpha: en(lb, 1.3, 0.3, E.outCubic) });
    } else if (b < 28) { // ----- apply
      V.bg(ctx, C.v1); circleWipe(ctx, b, 26, 0.5, CX, 1090, C.cream);
      const lc = b - 26;
      mono(ctx, decode('SEZON 01 · ÜCRETSİZ', prog(b, 26.05, 26.45), 8, t), 90, 312, 22, C.bg, { align: 'left' });
      brandMini(ctx, C.bg);
      const sz = Math.min(110, fitSize(ctx, "Sezon 1'de", DISP, 860, 900));
      ["Sezon 1'de", 'yerini al.'].forEach((s, i) => rise(ctx, s, 90, 450 + i * sz * 1.3, sz, i === 1 ? C.v1 : C.bg, en(lc, 0.12 + i * 0.1, 0.4), { align: 'left', w: 900, tr: -2 }));
      const pp = E.outBack(prog(lc, 0.5, 0.9), 2);
      [['ÜCRETSİZ', C.teal, 90, 200], ['ONLİNE', C.bg, 310, 180]].forEach(([s, c, x, w], i) => {
        ctx.save(); ctx.translate(x + w / 2, 850); ctx.scale(pp, pp); ctx.translate(-(x + w / 2), -850);
        pill(ctx, x, 820, w, 60, c); mono(ctx, s, x + w / 2, 851, 20, i ? C.lav : C.bg, { w: 800 }); ctx.restore();
      });
      body(ctx, 'Fikir şart değil,', 90, 1000, 46, C.bg, { align: 'left', w: 700, alpha: en(lc, 0.6, 0.3, E.outCubic) });
      body(ctx, 'taahhüt şart.', 90, 1060, 46, C.v1, { align: 'left', w: 800, alpha: en(lc, 0.75, 0.3, E.outCubic) });
      // the button + cursor
      const bp = E.outBack(prog(lc, 0.85, 1.25), 1.8), press = V.hit(b, 27.4, 0.12) * (b >= 27.4 ? 1 : 0), by = 1250;
      ctx.save(); ctx.translate(CX, by); ctx.scale(bp * (1 - 0.05 * press), bp * (1 - 0.05 * press));
      ctx.shadowColor = V.rgba(C.v1, 0.5); ctx.shadowBlur = 40 + press * 20; ctx.shadowOffsetY = 14;
      pill(ctx, -400, -70, 800, 140, C.v1); ctx.shadowColor = 'transparent';
      word(ctx, "Sezon 1'e başvur →", 0, 0, 42, C.lav, { fam: SANS, w: 800 });
      ctx.restore();
      if (b >= 27.4) ring(ctx, CX + 120, by + 10, 30 + 280 * E.outExpo(prog(b, 27.4, 27.95)), 6, C.v1, 1 - prog(b, 27.4, 27.95));
      const cp = E.inOutCubic(prog(lc, 1.0, 1.4)), cx = lerp(W + 100, CX + 120, cp), cy = lerp(H - 200, by + 10, cp);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1 - 0.12 * press, 1 - 0.12 * press);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 62); ctx.lineTo(16, 48); ctx.lineTo(30, 78); ctx.lineTo(44, 71); ctx.lineTo(30, 42); ctx.lineTo(52, 42); ctx.closePath();
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.cream; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore();
      mono(ctx, 'SON BAŞVURU 19 EKİM', CX, 1420, 24, C.bg, { alpha: en(lc, 1.2, 0.3, E.outCubic) });
    } else { // ----- lockup
      const lc = b - 28;
      V.bg(ctx, C.bg);
      const fl = E.outExpo(prog(b, 28, 28.4));
      // the purple button floods the frame, then settles into a deep radial
      const flood = 1 - E.inOutExpo(prog(b, 28.25, 28.9));
      dot(ctx, CX, 1250, fl * 2700 * (0.25 + 0.75 * flood) + 0, C.v1);
      const g = ctx.createRadialGradient(CX, 900, 0, CX, 900, 1200); g.addColorStop(0, V.rgba(C.v2, 0.55 * (1 - flood))); g.addColorStop(1, V.rgba(C.bg, 0.85 * (1 - flood)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // concentric beat rings
      for (let i = 0; i < 3; i++) {
        const p = V.fract(lc * 0.5 - i * 0.33); ring(ctx, CX, 800, 200 + p * 900, 3, C.v3, (1 - p) * 0.35 * en(b, 28.6, 0.4, E.outCubic));
      }
      const s = fitSize(ctx, 'crewupa', DISP, 900, 800), G = glyphsOf(ctx, 'crewupa', DISP, s, 800, -s * 0.04), cap = capH(ctx, DISP, 800) * s;
      const wy = 800;
      ctx.save(); ctx.beginPath(); ctx.rect(0, wy - cap * 1.2, W, cap * 2.9); ctx.clip();
      for (const g2 of G) {
        const p = E.outBack(clamp((b - 28.35 - g2.i * 0.05) / 0.4), 1.8);
        word(ctx, g2.ch, CX + g2.x, wy + (1 - p) * cap * 1.6, s, C.lav, { w: 800 });
      }
      ctx.restore();
      const tg = en(b, 28.9, 0.45);
      rise(ctx, 'Ekibini kur.', CX, wy + 190, 62, C.v4, tg, { w: 800, tr: -1 });
      rise(ctx, '30 günde çık.', CX, wy + 275, 62, C.lav, en(b, 29.05, 0.45), { w: 800, tr: -1 });
      const up = E.outBack(prog(b, 29.3, 29.75), 1.8);
      if (up > 0) {
        ctx.save(); ctx.translate(CX, 1250); ctx.scale(up, up);
        pill(ctx, -270, -52, 540, 104, C.lav); mono(ctx, 'crewupa.com', 0, 2, 44, C.bg, { w: 800, tr: 2 }); ctx.restore();
        mono(ctx, decode('BAŞVURULAR AÇIK · 19 EKİM\'E KADAR', prog(b, 29.5, 30), 4, t), CX, 1380, 26, C.v4);
      }
    }
  }

  /* ---------------- master ---------------- */
  const HARD = [1.5, 2, 3, 4, 8, 16, 18, 20, 22, 24, 26].map(B);
  V.reel({
    title: 'crewupa · 30 GÜN',
    duration: 15, fps: 60, bpm: BPM, sidechain: 0.6,
    blur: { samples: 4, shutter: (t) => (HARD.some((c) => Math.abs(t - c) < 1.2 / 60) ? 0 : 0.55) },
    draw(ctx, t) {
      const b = t / SPB;
      if (b < S_PROB) drawHook(ctx, t, b);
      else if (b < S_SPRINT) drawProblem(ctx, t, b);
      else if (b < S_MECH) drawSprint(ctx, t, b);
      else if (b < S_CTA) drawMech(ctx, t, b);
      else drawCTA(ctx, t, b);
    },
    post(ctx, t) {
      const b = t / SPB;
      const ch = V.hit(t, B(8), 0.1) * 14 + V.hit(t, B(12), 0.16) * 12 + V.hit(t, B(15), 0.1) * 12 + V.hit(t, B(16), 0.08) * 8 + V.hit(t, B(28), 0.12) * 12 + V.hit(t, B(0), 0.08) * 8;
      if (ch > 0.5) V.chroma(ctx, ch, 0);
      if (b > 7.0 && b < 7.5) V.slices(ctx, t, 26 * Math.sin(prog(b, 7, 7.5) * Math.PI), 8, 5);
      if (b >= S_SPRINT && b < S_MECH) V.vignette(ctx, 0.5, '11,8,22');
      V.grain(ctx, t, b > 29.6 ? 0.03 : 0.055);
    },
    music(m) {
      const Dm = [62, 65, 69], Bb = [58, 62, 65], F = [60, 65, 69], Cc = [60, 64, 67];
      const bars = [[8, Dm, 38], [12, Bb, 34], [16, F, 41], [20, Cc, 36], [24, Bb, 34], [28, Dm, 38]];
      // ---- HOOK
      m.impact(0, { gain: 0.8 });
      for (let b = 0; b < 4; b++) { m.kick(b); m.hat(b + 0.5, { gain: 0.22 }); }
      [0, 0.5, 1, 1.5, 2, 2.5, 3].forEach((b, i) => m.chord(b, 0.4, i % 2 ? Dm.map((n) => n + 12) : Dm, { pluck: 9, gain: 0.26, cutoff: 900, env: 7000, verb: 0.25 }));
      [38, 38, 41, 38, 45, 38, 41, 43].forEach((n, i) => m.bass(i * 0.5, 0.42, n, { gain: 0.45 }));
      m.clap(1.5, { gain: 0.6 }); m.clap(3, { gain: 0.7 }); m.zap(0.5, { gain: 0.12 });
      m.whoosh(1.7, 0.3, { gain: 0.3 }); m.whoosh(3.5, 0.5, { gain: 0.45 }); m.impact(2, { gain: 0.35 }); m.impact(3, { gain: 0.35 });
      // ---- PROBLEM: sparse; every chat pop gets a tick; riser into the gap
      for (let b = 4; b < 7.5; b++) m.kick(b, { gain: 0.6, decay: 9 });
      MSGS.forEach(([mb, side], i) => m.tick(mb, { freq: side === 'L' ? 1900 : 2500, gain: 0.22, pan: side === 'L' ? -0.5 : 0.5 }));
      for (let b = 4.5; b < 7; b += 1) m.hat(b, { gain: 0.14 });
      m.chord(4, 4, Dm, { attack: 0.3, gain: 0.12, cutoff: 500, env: 800, fdecay: 2, release: 0.6 });
      m.bass(4, 1.9, 26, { type: 'sub', gain: 0.35 }); m.bass(6, 1.4, 26, { type: 'sub', gain: 0.35 });
      m.riser(5, 8, { gain: 0.4 });
      for (let b = 7; b < 7.5; b += 0.125) m.snare(b, { gain: 0.16 + (b - 7) * 0.5, verb: 0.1 });
      m.tick(6.6, { freq: 900, gain: 0.1 }); m.tick(6.8, { freq: 900, gain: 0.1 });
      m.mute(7.5, 8);
      // ---- SPRINT: the drop
      m.impact(8, { gain: 0.9 }); m.subdrop(8, { gain: 0.5 });
      for (let b = 8; b < 16; b++) { m.kick(b); m.hat(b + 0.5, { gain: 0.2, open: true }); }
      for (let b = 8; b < 16; b += 0.25) m.hat(b, { gain: 0.07, pan: 0.3 });
      [9, 11, 13, 15].forEach((b) => { m.clap(b); m.snare(b, { gain: 0.3 }); });
      bars.filter(([b]) => b >= 8 && b < 16).forEach(([b, ch, root]) => {
        m.chord(b, 4, ch, { gain: 0.2, cutoff: 1300, env: 5000, fdecay: 4, verb: 0.4 });
        for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.45, i % 4 === 3 ? root + 12 : root, { gain: 0.42, cutoff: 500, env: 1400 });
      });
      [[8, 69], [9, 72], [10, 74], [11, 77], [12, 76], [14, 79], [15, 81]].forEach(([b, n]) => m.lead(b, 0.6, n, { gain: 0.13, decay: 4 }));
      const arp = [69, 72, 76, 74, 77, 72, 81, 76];
      for (let i = 0; i < 16; i++) m.lead(8 + i * 0.5 + 0.25, 0.2, arp[i % arp.length] + (i >= 8 ? -2 : 0), { gain: 0.06, decay: 8, pan: Math.sin(i) * 0.5 });
      m.whoosh(8.05, 0.8, { gain: 0.3 });
      m.impact(12, { gain: 0.4 }); m.glitch(11.85, 0.15, { gain: 0.12 });
      m.impact(15, { gain: 0.8 });
      for (let b = 15.25; b < 16; b += 0.125) m.snare(b, { gain: 0.16 + (b - 15.25) * 0.4, verb: 0.1 });
      m.whoosh(15.6, 0.4, { gain: 0.4 });
      // ---- MECHANICS
      for (let b = 16; b < 24; b++) { m.kick(b); m.hat(b + 0.5, { gain: 0.2 }); if (b % 2) { m.clap(b); } }
      for (let b = 16; b < 24; b += 0.25) m.hat(b, { gain: 0.06, pan: -0.3 });
      bars.filter(([b]) => b >= 16 && b < 24).forEach(([b, ch, root]) => {
        m.chord(b, 4, ch, { gain: 0.2, cutoff: 1500, env: 5000, fdecay: 4, verb: 0.4 });
        for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.45, i % 4 === 3 ? root + 12 : root, { gain: 0.42, cutoff: 500, env: 1400 });
      });
      [16, 18, 20, 22].forEach((b) => { m.impact(b, { gain: 0.35 }); m.whoosh(b - 0.25, 0.3, { gain: 0.3 }); });
      [16.5, 16.7, 16.9, 17.15, 17.4].forEach((b, i) => m.tick(b, { freq: 1500 + i * 300, gain: 0.2, pan: (i - 2) * 0.3 }));
      m.zap(18.3, { gain: 0.18 }); [19, 19.22, 19.44].forEach((b, i) => m.tick(b, { freq: 2400 + i * 400, gain: 0.2 }));
      [20.3, 20.44, 20.58].forEach((b) => m.tick(b, { freq: 1200, gain: 0.16 })); m.tick(21.05, { freq: 3000, gain: 0.2 }); m.zap(21.3, { gain: 0.14, from: 800 });
      for (let i = 0; i < 12; i++) m.tick(22.3 + i * 0.1, { freq: 1800 + (i % 3) * 250, gain: 0.12, pan: Math.sin(i) * 0.6 });
      m.lead(22.9, 0.4, 81, { gain: 0.14 }); m.lead(23.0, 0.5, 84, { gain: 0.16 });
      // ---- CTA
      for (let b = 24; b < 28; b++) { m.kick(b); m.hat(b + 0.5, { gain: 0.2 }); if (b % 2) m.clap(b); }
      bars.filter(([b]) => b === 24).forEach(([b, ch, root]) => {
        m.chord(b, 4, ch.map((n) => n + 12), { gain: 0.2, cutoff: 1600, env: 5000, fdecay: 4, verb: 0.5 });
        for (let i = 0; i < 8; i++) m.bass(b + i * 0.5, 0.45, i % 4 === 3 ? root + 12 : root, { gain: 0.42 });
      });
      m.whoosh(23.8, 0.3, { gain: 0.3 }); m.impact(24, { gain: 0.4 });
      m.riser(26, 28, { gain: 0.4 });
      for (let b = 27; b < 28; b += 0.125) m.snare(b, { gain: 0.14 + (b - 27) * 0.5, verb: 0.1 });
      m.tick(27.4, { freq: 1100, gain: 0.35 }); m.tick(27.42, { freq: 2200, gain: 0.2 });
      m.mute(27.9, 28);
      m.impact(28, { gain: 0.95 }); m.subdrop(28, { gain: 0.6 }); m.kick(28, { gain: 1, decay: 4 });
      m.chord(28, 3.6, [50, 57, 62, 65, 69, 74], { gain: 0.24, attack: 0.005, cutoff: 1800, env: 4500, fdecay: 1.5, release: 1.2, verb: 0.7 });
      m.bass(28, 3.6, 26, { type: 'sub', gain: 0.4 });
      [[28.7, 81], [29.0, 84], [29.35, 86], [29.7, 93]].forEach(([b, n]) => m.lead(b, 0.8, n, { gain: 0.07, decay: 1.6, verb: 0.8 }));
      [28.85, 29.0, 29.15].forEach((b, i) => m.tick(b, { freq: 3000 + i * 300, gain: 0.08 }));
    },
  });
})();
