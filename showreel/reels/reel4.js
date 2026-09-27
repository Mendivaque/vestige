/* Reel 4 — "ONE DOT".
 * A 15s résumé reel in four chapters (TYPE / SHAPE / CAMERA / COLOUR) stitched
 * together by a single orange keyframe dot: it is born as the full stop of the
 * hook sentence, becomes a text cursor, a bouncing ball, the vanishing point of
 * a 3D fly-through, the centre of a colour wheel, and finally lands as the full
 * stop after the designer's name. 128 BPM, 8 bars, every cut on the grid.
 */
(function () {
  const BPM = 128;
  const SPB = 60 / BPM;
  const B = (b) => b * SPB;
  const E = V.ease;
  const W = V.W, H = V.H, CX = W / 2, CY = H / 2;

  const INK = '#0e0e10', PAPER = '#f3f0ea', ORANGE = '#ff4d17', COBALT = '#2340ff', LIME = '#d4ff3a', PINK = '#ff7ad9';
  const NAME = ((globalThis.PARAMS && globalThis.PARAMS.name) || 'CREWUPA').toUpperCase();

  // Chapter boundaries (beats)
  const HOOK = 0, TYPE = 4, SHAPE = 10, CAM = 16, COLOR = 22, END = 27;

  /* ---------------- helpers ---------------- */
  const memo = {};
  const once = (k, fn) => (k in memo ? memo[k] : (memo[k] = fn()));
  const capH = (ctx, fam, w = 400, st = 'normal') =>
    once(`cap|${fam}|${w}|${st}`, () => {
      ctx.save(); V.font(ctx, 100, fam, w, st);
      const m = ctx.measureText('H').actualBoundingBoxAscent / 100;
      ctx.restore(); return m;
    });
  const widthOf = (ctx, s, fam, w = 400, st = 'normal') =>
    once(`w|${s}|${fam}|${w}|${st}`, () => V.measure(ctx, s, { size: 100, family: fam, weight: w, style: st }) / 100);
  const fitSize = (ctx, s, fam, target, w = 400, st = 'normal') => target / widthOf(ctx, s, fam, w, st);
  const glyphsOf = (ctx, s, fam, size, w = 400, st = 'normal') =>
    once(`g|${s}|${fam}|${size.toFixed(2)}|${w}|${st}`, () => V.glyphs(ctx, s, { size, family: fam, weight: w, style: st }));

  /** Draw a word centred on (x, y) by its cap height. */
  function word(ctx, s, x, y, size, fill, fam = 'Anton', w = 400, st = 'normal', align = 'center') {
    ctx.save();
    V.font(ctx, size, fam, w, st);
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    ctx.fillStyle = fill;
    ctx.fillText(s, x, y + (capH(ctx, fam, w, st) * size) / 2);
    ctx.restore();
  }
  function dot(ctx, x, y, r, col = ORANGE, sx = 1, sy = 1) {
    if (r <= 0.2) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, V.TAU); ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }
  function ring(ctx, x, y, r, lw, col, a = 1) {
    if (a <= 0.001 || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, r, 0, V.TAU); ctx.stroke(); ctx.restore();
  }
  const mono = (ctx, s, x, y, o = {}) =>
    V.text(ctx, s, x, y, Object.assign({ size: 24, family: 'JetBrains Mono', weight: 500, align: 'left', tracking: 2 }, o));
  const SCRAMBLE = 'ABCDEF0123456789#/<>*+=';
  /** Decode effect: characters resolve left to right over p∈[0,1]. */
  function decode(s, p, seed = 0, tb = 0) {
    let out = '';
    const q = p * 1.3; // every glyph is resolved by p = 1
    for (let i = 0; i < s.length; i++) {
      const k = i / s.length;
      if (q >= k + 0.3 || s[i] === ' ') out += s[i];
      else if (q > k) out += SCRAMBLE[Math.floor(V.hash(i * 7.3 + seed + Math.floor(tb * 30)) * SCRAMBLE.length)];
      else out += '';
    }
    return out;
  }

  /* Polar shape morphing: every shape is a radius function of angle, so any two
     shapes can be blended point-for-point. */
  const polyR = (a, n) => {
    const seg = V.TAU / n, m = (((a % seg) + seg) % seg) - seg / 2;
    return Math.cos(Math.PI / n) / Math.cos(m);
  };
  const SHAPES = [
    () => 1, // circle
    (a) => polyR(a + Math.PI / 4, 4) * 0.92, // square
    (a) => polyR(a + Math.PI / 2, 3) * 1.12, // triangle (point up)
    (a) => { // star
      const n = 5, seg = V.TAU / n, f = Math.abs(((((a + Math.PI / 2) % seg) + seg) % seg) / seg - 0.5) * 2;
      return V.lerp(0.5, 1.12, Math.pow(f, 1.4));
    },
  ];
  /** kind is continuous: 0 circle, 1 square, 2 triangle, 3 star, wraps. */
  function morph(ctx, x, y, r, kind, rot = 0, steps = 72) {
    const n = SHAPES.length, i = ((Math.floor(kind) % n) + n) % n, f = kind - Math.floor(kind);
    const A = SHAPES[i], Bf = SHAPES[(i + 1) % n];
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * V.TAU;
      const rr = r * V.lerp(A(a), Bf(a), f);
      const X = x + Math.cos(a + rot) * rr, Y = y + Math.sin(a + rot) * rr;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }
  /** Snap-to-grid easing for stepped morphs: holds, then moves fast. */
  const stepEase = (x, sharp = 3) => Math.floor(x) + E.inOutCubic(V.clamp((V.fract(x) - 0.5) * sharp + 0.5));

  /* ---------------- HUD ---------------- */
  const CHAPTERS = [
    [TYPE, '01 / TYPE'], [SHAPE, '02 / SHAPE'], [CAM, '03 / CAMERA'], [COLOR, '04 / COLOUR'],
  ];
  function hud(ctx, t, b, col) {
    const a = V.win(b, TYPE, END - 0.1, 0.25, 0.3);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    let label = '', since = 0;
    for (const [cb, l] of CHAPTERS) if (b >= cb) { label = l; since = b - cb; }
    const p = V.clamp(since / 0.5);
    mono(ctx, decode(label, p, label.length, t), 90, 300, { fill: col, weight: 800 });
    const f = Math.floor(t * 60), sec = Math.floor(f / 60), fr = f % 60;
    mono(ctx, `TC 00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`, 990, 300, { fill: col, align: 'right' });
    // progress bar with bar ticks
    ctx.fillStyle = col;
    ctx.globalAlpha = a * 0.25;
    ctx.fillRect(90, 1512, 900, 2);
    ctx.globalAlpha = a;
    ctx.fillRect(90, 1512, 900 * (t / 15), 2);
    for (let i = 0; i <= 8; i++) ctx.fillRect(90 + (900 * i) / 8 - 1, 1506, 2, 14);
    ctx.restore();
  }

  /* =========================================================
     00 HOOK — "MOVE EVERY PIXEL ON THE BEAT." on eighth notes
     ========================================================= */
  const HOOK_WORDS = [
    { w: 'MOVE', b: 0.0, bg: ORANGE, fg: INK, mode: 'rise' },
    { w: 'EVERY', b: 0.5, bg: INK, fg: PAPER, mode: 'stretch' },
    { w: 'PIXEL', b: 1.0, bg: PAPER, fg: INK, mode: 'pixel' },
    { w: 'ON', b: 1.5, bg: COBALT, fg: PAPER, mode: 'spin' },
    { w: 'THE', b: 2.0, bg: INK, fg: ORANGE, mode: 'stack' },
    { w: 'BEAT', b: 2.5, bg: PAPER, fg: INK, mode: 'slam' },
  ];
  function hookLayout(ctx) {
    return once('beatLayout', () => {
      const size = fitSize(ctx, 'BEAT', 'Anton', 760);
      const w = widthOf(ctx, 'BEAT', 'Anton') * size;
      const r = size * 0.1, gap = size * 0.05;
      const left = CX - (w + gap + 2 * r) / 2;
      const cap = capH(ctx, 'Anton') * size;
      return { size, w, r, left, cap, cx: left + w / 2, dotX: left + w + gap + r, dotY: CY + cap / 2 - r };
    });
  }
  function drawHook(ctx, t, b) {
    let cur = HOOK_WORDS[0];
    for (const hw of HOOK_WORDS) if (b >= hw.b) cur = hw;
    // 0..1 across the eighth; the first word starts mid-move so frame 0 is already a strong image
    const lp = V.clamp((b - cur.b + (cur.b === 0 ? 0.14 : 0)) / 0.5);
    const e = E.outExpo(V.clamp(lp * 2.2));
    V.bg(ctx, cur.bg);

    if (cur.mode === 'rise') {
      const size = Math.min(fitSize(ctx, 'MOVE', 'Anton', 960), 900);
      const cap = capH(ctx, 'Anton') * size;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, CY - cap / 2 - 10, W, cap + 20); ctx.clip();
      word(ctx, 'MOVE', CX, CY + (1 - e) * cap * 1.1, size * (1 + lp * 0.04), cur.fg);
      ctx.restore();
      // opening shockwave
      ring(ctx, CX, CY, E.outExpo(V.clamp(t / 0.5)) * 1100, 18 * (1 - V.clamp(t / 0.5)) + 1, INK, 1 - V.clamp(t / 0.5));
    } else if (cur.mode === 'stretch') {
      const size = fitSize(ctx, 'EVERY', 'Anton', 960);
      ctx.save(); ctx.translate(CX, CY);
      ctx.scale(V.lerp(0.15, 1, E.outBack(e, 2.2)), V.lerp(2.4, 1, e));
      word(ctx, 'EVERY', 0, 0, size, cur.fg);
      ctx.restore();
    } else if (cur.mode === 'pixel') {
      // Resolve from chunky pixels to crisp in stepped resolution jumps
      const steps = [96, 48, 24, 12, 6, 1];
      const bs = steps[Math.min(steps.length - 1, Math.floor(V.clamp(lp * 1.6) * steps.length))];
      const size = fitSize(ctx, 'PIXEL', 'Anton', 960);
      if (bs === 1) word(ctx, 'PIXEL', CX, CY, size, cur.fg);
      else {
        const bw = Math.ceil(W / bs), bh = Math.ceil(H / bs);
        const [c, x] = V.buffer('px_' + bs, bw, bh);
        x.clearRect(0, 0, bw, bh);
        x.save(); x.scale(1 / bs, 1 / bs); word(x, 'PIXEL', CX, CY, size, cur.fg); x.restore();
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(c, 0, 0, bw * bs, bh * bs);
        ctx.restore();
      }
    } else if (cur.mode === 'spin') {
      const size = Math.min(fitSize(ctx, 'ON', 'Anton', 800), 1000);
      ctx.save(); ctx.translate(CX, CY);
      ctx.rotate(V.lerp(-Math.PI / 2, 0, E.outBack(e, 1.6)));
      ctx.scale(V.lerp(0.4, 1, e), V.lerp(0.4, 1, e));
      word(ctx, 'ON', 0, 0, size, cur.fg);
      ctx.restore();
    } else if (cur.mode === 'stack') {
      const size = fitSize(ctx, 'THE', 'Anton', 620);
      const cap = capH(ctx, 'Anton') * size;
      for (let k = -3; k <= 3; k++) {
        const d = Math.abs(k), ek = E.outExpo(V.clamp(lp * 2.4 - d * 0.18));
        if (ek <= 0) continue;
        const y = CY + k * cap * 1.12 * ek;
        ctx.save();
        if (k === 0) word(ctx, 'THE', CX, y, size, cur.fg);
        else {
          V.font(ctx, size, 'Anton', 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.strokeStyle = cur.fg; ctx.lineWidth = 3; ctx.globalAlpha = 1 - d * 0.18;
          ctx.strokeText('THE', CX, y + cap / 2);
        }
        ctx.restore();
      }
    } else if (cur.mode === 'slam') {
      const L = hookLayout(ctx);
      // BEAT slams in from huge; at b3 the full stop drops in; at 3.5 the frame splits open.
      const s = V.lerp(2.6, 1, E.outExpo(V.clamp((b - 2.5) / 0.3)));
      const split = E.inOutExpo(V.prog(b, 3.5, 4));
      const [sx, sy] = [V.shake(t, 14 * V.hit(t, B(2.5), 0.12))[0], V.shake(t, 14 * V.hit(t, B(2.5), 0.12))[1]];
      const drawBeat = (dy) => {
        ctx.save(); ctx.translate(L.cx + sx, CY + dy + sy); ctx.scale(s, s);
        word(ctx, 'BEAT', 0, 0, L.size, cur.fg);
        ctx.restore();
      };
      if (split <= 0) drawBeat(0);
      else {
        // ink slit opens from the centre line; halves travel off frame
        const gapH = split * H;
        V.bg(ctx, INK);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, CY - gapH / 2); ctx.clip();
        ctx.translate(0, -gapH / 2); V.bg(ctx, PAPER); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); drawBeat(0); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(0, CY + gapH / 2, W, H); ctx.clip();
        ctx.translate(0, gapH / 2); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); drawBeat(0); ctx.restore();
      }
      // the dot: drops into the full-stop slot on beat 3, then glides to centre as the frame opens
      if (b >= 3) {
        const drop = V.prog(b, 3, 3.35);
        let y = V.lerp(L.dotY - 700, L.dotY, E.outBounce(drop));
        let x = L.dotX;
        const go = E.inOutExpo(V.prog(b, 3.5, 4));
        x = V.lerp(x, CX, go); y = V.lerp(y, CY, go);
        const r = V.lerp(L.r, 26, go);
        const land = V.hit(t, B(3.2), 0.06);
        dot(ctx, x, y, r, ORANGE, 1 + land * 0.3, 1 - land * 0.25);
        ring(ctx, L.dotX, L.dotY, 40 + 260 * E.outExpo(V.prog(b, 3.1, 3.7)), 6, ORANGE, 1 - V.prog(b, 3.1, 3.7));
      }
    }
  }

  /* =========================================================
     01 TYPE — typing, echo ladder, weight→serif contrast, letters fall
     ========================================================= */
  function drawType(ctx, t, b) {
    V.bg(ctx, INK);
    const size = fitSize(ctx, 'KINETIC', 'Anton', 880);
    const cap = capH(ctx, 'Anton') * size;
    const typed = V.clamp(Math.floor((b - 4) / 0.25) + 1, 0, 7);
    const sinceKey = b - (4 + (typed - 1) * 0.25);
    const G = glyphsOf(ctx, 'KINETIC', 'Anton', size);
    // Recentre as the word grows: shift = half the width of untyped glyphs
    const shiftFor = (n) => (n <= 0 ? G.total / 2 : (G.total - (G[n - 1].x + G[n - 1].w / 2 + G.total / 2)) / 2);
    const shift = V.lerp(shiftFor(typed - 1), shiftFor(typed), E.outExpo(V.clamp(sinceKey / 0.2)));

    const ladder = E.outExpo(V.prog(b, 6, 6.6)) * (1 - E.inOutExpo(V.prog(b, 8, 8.5)));
    const serif = b >= 8.5;

    if (!serif) {
      // echo ladder rows (drawn behind the hero row)
      if (ladder > 0.001) {
        for (let k = -6; k <= 6; k++) {
          if (k === 0) continue;
          const y = CY + k * cap * 1.14 * ladder;
          const off = Math.sin(b * Math.PI * 0.9 - k * 0.55) * 150 * ladder;
          ctx.save();
          V.font(ctx, size, 'Anton', 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          if (Math.abs(k) % 3 === 0) { ctx.fillStyle = ORANGE; ctx.fillText('KINETIC', CX + off, y + cap / 2); }
          else if (Math.abs(k) % 2) { ctx.strokeStyle = PAPER; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9; ctx.strokeText('KINETIC', CX + off, y + cap / 2); }
          else { ctx.fillStyle = '#2b2b30'; ctx.fillText('KINETIC', CX + off, y + cap / 2); }
          ctx.restore();
        }
      }
      // hero row, letter by letter
      const kick = V.clock(BPM).pulse(t, 1, 0.1) * (b > 6 ? 1 : 0);
      for (let i = 0; i < typed; i++) {
        const g = G[i];
        const age = b - (4 + i * 0.25);
        const pop = E.outBack(V.clamp(age / 0.22), 2.4);
        const x = CX + g.x + shift - G.total / 2 + G.total / 2;
        ctx.save();
        ctx.translate(x + (b > 6 ? Math.sin(b * Math.PI * 0.9) * 150 * ladder * 0 : 0), CY + cap / 2);
        ctx.scale(pop * (1 + kick * 0.06), pop * (1 - kick * 0.04));
        V.font(ctx, size, 'Anton', 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = PAPER; ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }
      // cursor dot: rides the end of the typed word
      const endX = typed > 0 ? CX + G[typed - 1].x + G[typed - 1].w / 2 + shift + 40 : CX;
      const cx = b < 4.05 ? CX : endX;
      const blink = b >= 5.75 && b < 6 ? (Math.floor((b - 5.75) * 8) % 2 ? 0.35 : 1) : 1;
      dot(ctx, cx, CY + cap / 2 - 26, 26 * blink + (1 - blink) * 10, ORANGE);
    } else {
      // Serif contrast: heavy condensed → delicate italic, wave-bobbing, then gravity drop
      const s2 = fitSize(ctx, 'kinetic', 'Instrument Serif', 820, 400, 'italic');
      const cap2 = capH(ctx, 'Instrument Serif', 400, 'italic') * s2;
      const G2 = glyphsOf(ctx, 'kinetic', 'Instrument Serif', s2, 400, 'italic');
      const inn = E.outExpo(V.prog(b, 8.5, 8.8));
      for (let i = 0; i < G2.length; i++) {
        const g = G2[i];
        const bob = Math.sin((b - 8.5) * Math.PI * 2 - i * 0.7) * 26 * inn;
        const fall = V.clamp((b - 9.45 - i * 0.04) / 0.5);
        const fy = E.inQuad(fall) * 1300, rot = E.inQuad(fall) * (V.hash(i) - 0.5) * 2.2;
        ctx.save();
        ctx.translate(CX + g.x, CY + cap2 / 2 + bob + fy + (1 - inn) * 60);
        ctx.rotate(rot);
        ctx.globalAlpha = inn;
        V.font(ctx, s2, 'Instrument Serif', 400, 'italic'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = PAPER; ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }
      mono(ctx, 'WEIGHT 400 → ITALIC', CX, CY + 250, { fill: ORANGE, align: 'center', alpha: inn * (1 - V.prog(b, 9.3, 9.5)) });
      // dot returns to centre, then paper floods out from it
      const endX = CX + G2.total / 2 + 36;
      const go = E.inOutExpo(V.prog(b, 9.3, 9.8));
      const x = V.lerp(endX, CX, go), y = V.lerp(CY + cap2 / 2 - 22, CY, go);
      const flood = E.inOutExpo(V.prog(b, 9.6, 10));
      if (flood > 0) dot(ctx, CX, CY, flood * 1200, PAPER);
      dot(ctx, x, y, 26, ORANGE);
    }
    hud(ctx, t, b, V.prog(b, 9.6, 10) > 0.5 ? INK : PAPER);
  }

  /* =========================================================
     02 SHAPE — squash & stretch bounce, graph editor, morphing grid
     ========================================================= */
  const FLOOR = 1260;
  /** Ball height above floor (px) and contact info, analytic. Contacts on beats 11 and 12. */
  function ball(b) {
    // b10→11: fall from centre (with 0.15b anticipation lift); b11→12: bounce arc; b12→12.5: leap to grid centre
    const R = V.lerp(26, 70, E.outCubic(V.prog(b, 10, 10.5)));
    let y;
    if (b < 11) {
      const lift = Math.sin(V.prog(b, 10, 10.2) * Math.PI) * 40;
      const f = V.prog(b, 10.15, 11);
      y = V.lerp(CY, FLOOR - R, E.inQuad(f)) - lift;
    } else if (b < 12) {
      const p = b - 11;
      y = FLOOR - R - 4 * 430 * p * (1 - p);
    } else {
      const p = V.prog(b, 12, 12.5);
      y = V.lerp(FLOOR - R, GRID.cy(3), E.outBack(p, 1.3)) - Math.sin(p * Math.PI) * 260;
    }
    // squash on contact, stretch with speed
    const contact = Math.max(V.hit(b, 11, 0.07), V.hit(b, 12, 0.07));
    const vel = b < 11 ? E.inQuad(V.prog(b, 10.15, 11)) : b < 12 ? Math.abs(1 - 2 * (b - 11)) : 0;
    const sx = 1 + contact * 0.45 - vel * 0.12;
    const sy = 1 - contact * 0.38 + vel * 0.18;
    const kind = stepEase(V.clamp((b - 10.9) / 1.0) * 1 + (b >= 12 ? V.prog(b, 12, 12.4) : 0), 5);
    return { y, R, sx, sy, kind, contact };
  }
  const GRID = { cols: 5, rows: 7, cw: 180, ch: 172, x0: 90, y0: 318, cx: (c) => 90 + (c + 0.5) * 180, cy: (r) => 318 + (r + 0.5) * 172 };
  const GRID_COLS = [INK, ORANGE, COBALT, INK, INK];

  function drawShape(ctx, t, b) {
    const bgInk = b >= 15.5;
    V.bg(ctx, bgInk ? INK : PAPER);
    const bl = ball(b);

    if (b < 12.25) {
      // floor line draws out from centre, shadow, ripples
      const fl = E.outExpo(V.prog(b, 10.3, 11));
      ctx.fillStyle = INK; ctx.fillRect(CX - 450 * fl, FLOOR, 900 * fl, 3);
      const hgt = (FLOOR - bl.R - bl.y) / 430;
      ctx.save(); ctx.globalAlpha = 0.18 * fl * (1 - V.clamp(hgt));
      ctx.beginPath(); ctx.ellipse(CX, FLOOR + 10, bl.R * (1.3 - V.clamp(hgt) * 0.6), 12, 0, 0, V.TAU); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
      for (const cb of [11, 12]) {
        const p = V.prog(b, cb, cb + 0.8);
        if (p > 0 && p < 1) {
          ctx.save(); ctx.translate(CX, FLOOR); ctx.scale(1, 0.22);
          ring(ctx, 0, 0, 90 + E.outExpo(p) * 420, 8, INK, 1 - p);
          ctx.restore();
          // debris shapes burst
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI * (0.1 + 0.8 * (k / 6)), d = E.outExpo(p) * (180 + 90 * V.hash(k + cb));
            const x = CX + Math.cos(a) * d * 1.6, y = FLOOR + Math.sin(a) * d + E.inQuad(p) * 120;
            ctx.save(); ctx.globalAlpha = 1 - E.inQuad(p);
            morph(ctx, x, y, 16 * (1 - p * 0.5), k % 4, p * 6 + k); ctx.fillStyle = [ORANGE, COBALT, INK][k % 3]; ctx.fill(); ctx.restore();
          }
        }
      }
      // graph editor: plot of the ball's height with a playhead
      const ga = V.win(b, 10.4, 12.3, 0.3, 0.25);
      if (ga > 0) {
        ctx.save(); ctx.globalAlpha = ga;
        const gx = 90, gy = 1330, gw = 360, gh = 130;
        ctx.strokeStyle = V.rgba(INK, 0.25); ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
        mono(ctx, 'GRAPH / Y POS', gx, gy - 22, { fill: INK, size: 18 });
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const bb = 10 + (i / 120) * 2.3, by = ball(bb).y;
          const X = gx + (i / 120) * gw, Y = gy + gh - V.map(by, CY - 60, FLOOR, 0, 1) * gh * 0.9 - 6;
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        const ph = V.clamp((b - 10) / 2.3), px = gx + ph * gw;
        ctx.fillStyle = ORANGE; ctx.fillRect(px - 1.5, gy - 6, 3, gh + 12);
        const py = gy + gh - V.map(bl.y, CY - 60, FLOOR, 0, 1) * gh * 0.9 - 6;
        dot(ctx, px, py, 8, ORANGE);
        mono(ctx, 'EASE IN-QUAD · SQUASH 0.45', gx + gw + 26, gy + gh - 8, { fill: INK, size: 18, alpha: 0.7 });
        ctx.restore();
      }
      // the ball itself (orange, morphing circle → square on the second contact)
      ctx.save(); ctx.translate(CX, bl.y + bl.R * (1 - bl.sy)); ctx.scale(bl.sx, bl.sy);
      morph(ctx, 0, 0, bl.R, bl.kind, 0); ctx.fillStyle = ORANGE; ctx.fill(); ctx.restore();
      V.text(ctx, 'squash', 240, 820, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 96, fill: INK, alpha: V.win(b, 10.6, 12.2, 0.3, 0.2) });
      V.text(ctx, '& stretch', 800, 1030, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 96, fill: INK, alpha: V.win(b, 10.9, 12.2, 0.3, 0.2) });
    }

    if (b >= 12.25) {
      // Morphing grid. Cells pop in radially from the centre cell, then a diagonal morph wave rolls through.
      const collapse = E.inExpo(V.prog(b, 14.2, 15.5));
      const gRot = E.inOutCubic(V.prog(b, 14, 15.5)) * Math.PI * 0.75;
      const gScale = 1 - collapse;
      const kp = V.clock(BPM);
      ctx.save();
      ctx.translate(CX, GRID.cy(3)); ctx.rotate(gRot); ctx.scale(gScale, gScale); ctx.translate(-CX, -GRID.cy(3));
      for (let r = 0; r < GRID.rows; r++) for (let c = 0; c < GRID.cols; c++) {
        const d = Math.hypot(c - 2, r - 3);
        const pop = E.outBack(V.clamp((b - 12.25 - d * 0.09) / 0.35), 2);
        if (pop <= 0) continue;
        const phase = (b - 12.5) * 2 - (c + r) * 0.22;
        const kind = c === 2 && r === 3 ? stepEase(Math.max(0, phase) + 1, 4) : stepEase(Math.max(0, phase) + (c + r) % 4, 4);
        const beatHit = kp.pulse(t - d * 0.035, 1, 0.12) * (b > 12.5 ? 1 : 0);
        const col = c === 2 && r === 3 ? ORANGE : GRID_COLS[(c * 3 + r * 2 + Math.floor(Math.max(0, phase))) % GRID_COLS.length];
        const sz = 62 * pop * (1 + beatHit * 0.22) * (1 - V.clamp((collapse * 1.4 - d * 0.1)) * (c === 2 && r === 3 ? 0 : 1));
        if (sz <= 0.5) continue;
        morph(ctx, GRID.cx(c), GRID.cy(r), sz, kind, phase * 0.5 * (c % 2 ? 1 : -1));
        ctx.fillStyle = col; ctx.fill();
      }
      ctx.restore();
      // After the collapse: only the dot remains, charging up in the silence
      if (b >= 15.5) {
        const k = V.prog(b, 15.5, 16);
        const sh = V.shake(t, 6 * k, 40);
        dot(ctx, CX + sh[0], GRID.cy(3) + (CY - GRID.cy(3)) * E.outExpo(V.prog(b, 15.5, 15.7)) + sh[1], V.lerp(26, 10, E.inQuint(k)), ORANGE);
        ring(ctx, CX, CY, V.lerp(300, 12, E.inQuint(k)), 2, ORANGE, k);
      }
    }
    hud(ctx, t, b, bgInk ? PAPER : INK);
  }

  /* =========================================================
     03 CAMERA — stepped dolly pushes on every beat, twisting corridor,
     barrel roll, letters in space, whip pan out
     ========================================================= */
  const CR = V.rng(4242);
  const STARS = Array.from({ length: 520 }, () => [(CR() - 0.5) * 5200, (CR() - 0.5) * 9000, CR() * 26000]);
  // One word per beat: each dolly push comes to rest with the next word framed at ~860px wide.
  const CAM_WORDS = ['CAMERA', 'DEPTH', 'ROLL', 'DOLLY', 'SPIN', 'WHIP'];
  const CAM_D = 1500;
  const camWordZ = (i) => camAt(16 + i + 0.9).z + CAM_D;
  function camAt(b) {
    let z = -600;
    for (let j = 16; j < 22; j++) z += 1650 * E.outExpo(V.clamp((b - j) / 0.85));
    z += Math.max(0, b - 16) * 260;
    const rz = (Math.PI / 4) * E.inOutQuint(V.prog(b, 17.8, 18.3)) + V.TAU * E.inOutQuint(V.prog(b, 19.7, 20.5)) + (Math.PI / 4) * E.inOutQuint(V.prog(b, 20.8, 21.3));
    const ry = E.inExpo(V.prog(b, 21.45, 22)) * 1.35;
    const fov = 1150 * (1 + 0.1 * V.hit(b, Math.floor(b), 0.18) * (b >= 16 ? 1 : 0)) * V.lerp(1, 0.7, E.inOutCubic(V.prog(b, 18.5, 19.5))) * V.lerp(1, 1 / 0.7, E.inOutCubic(V.prog(b, 19.5, 19.9)));
    return { x: 0, y: 0, z, rx: 0, ry, rz, fov };
  }
  function drawCam(ctx, t, b) {
    V.bg(ctx, INK);
    const cam = camAt(b);
    const camPrev = camAt(b - 0.06);
    const speed = Math.max(0, cam.z - camPrev.z);
    // background glow at the vanishing point
    const vg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 900);
    vg.addColorStop(0, V.rgba(ORANGE, 0.22)); vg.addColorStop(1, V.rgba(ORANGE, 0));
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    dot(ctx, CX, CY, 10 + 8 * V.clock(BPM).pulse(t, 1, 0.12), ORANGE);
    const items = [];
    for (let k = 0; k < 48; k++) items.push({ type: 'frame', z: 400 + k * 620, k });
    CAM_WORDS.forEach((w, i) => items.push({ type: 'word', z: camWordZ(i), i, w }));
    items.sort((a, b2) => b2.z - a.z);
    const fog = (z) => V.clamp(1 - (z - cam.z) / 9000) ** 1.6 * V.clamp((z - cam.z - 60) / 500);

    // star streaks
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of STARS) {
      let z = s[2] - cam.z; z = ((z % 26000) + 26000) % 26000 + cam.z;
      const p = V.project([s[0], s[1], z], cam);
      if (!p.vis) continue;
      const q = V.project([s[0], s[1], z + 60 + speed * 1.2], cam);
      const a = fog(z) * 0.9;
      if (a <= 0.01) continue;
      ctx.strokeStyle = V.rgba(PAPER, a);
      ctx.lineWidth = Math.max(1, 5 * p.s);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.vis ? q.x : p.x, q.vis ? q.y : p.y); ctx.stroke();
    }
    ctx.restore();

    for (const it of items) {
      const a = fog(it.z);
      if (a <= 0.01) continue;
      if (it.type === 'frame') {
        const tw = it.k * 0.16 + Math.sin(b * 0.8 + it.k * 0.3) * 0.05;
        const pts = [[-470, -840], [470, -840], [470, 840], [-470, 840]].map(([x, y]) => {
          const [X, Y] = [x * Math.cos(tw) - y * Math.sin(tw), x * Math.sin(tw) + y * Math.cos(tw)];
          return V.project([X, Y, it.z], cam);
        });
        if (pts.some((p) => !p.vis)) continue;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = it.k % 6 === 0 ? ORANGE : PAPER;
        ctx.lineWidth = Math.max(1, (it.k % 6 === 0 ? 16 : 6) * pts[0].s);
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
        ctx.restore();
      } else {
        const p = V.project([0, 0, it.z], cam);
        if (!p.vis) continue;
        const size = fitSize(ctx, it.w, 'Anton', 860) * (CAM_D / 1150) * p.s;
        if (size > 9000) continue;
        const near = V.clamp((it.z - cam.z) / 900) * V.clamp(1 - (it.z - cam.z - CAM_D - 150) / 500);
        ctx.save();
        ctx.globalAlpha = a * near;
        ctx.translate(p.x, p.y); ctx.rotate(-cam.rz);
        word(ctx, it.w, 0, 0, size, it.i === 0 ? ORANGE : PAPER);
        ctx.restore();
      }
    }
    // vanishing-point dot + crosshair HUD
    const dotA = 1 - E.inExpo(V.prog(b, 21.4, 21.8));
    ctx.save(); ctx.globalAlpha = 0.8 * dotA; ctx.strokeStyle = PAPER; ctx.lineWidth = 2;
    const ch = 34;
    ctx.beginPath(); ctx.moveTo(CX - ch * 2, CY); ctx.lineTo(CX - ch, CY); ctx.moveTo(CX + ch, CY); ctx.lineTo(CX + ch * 2, CY);
    ctx.moveTo(CX, CY - ch * 2); ctx.lineTo(CX, CY - ch); ctx.moveTo(CX, CY + ch); ctx.lineTo(CX, CY + ch * 2); ctx.stroke();
    // corner brackets of the safe frame
    const br = 50;
    for (const [x, y, dx, dy] of [[90, 360, 1, 1], [990, 360, -1, 1], [90, 1460, 1, -1], [990, 1460, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * br); ctx.lineTo(x, y); ctx.lineTo(x + dx * br, y); ctx.stroke();
    }
    ctx.restore();
    mono(ctx, `Z ${Math.round(cam.z + 600).toLocaleString('en-US').padStart(6, ' ')}`, 90, 1440, { fill: PAPER, size: 22, alpha: dotA });
    mono(ctx, `FOV ${Math.round(cam.fov)}  ROLL ${Math.round((cam.rz * 180) / Math.PI)}°`, 990, 1440, { fill: PAPER, size: 22, align: 'right', alpha: dotA });
    // drop flash
    const fl = V.hit(t, B(16), 0.09);
    if (fl > 0.01) { ctx.save(); ctx.globalAlpha = fl * 0.9; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    hud(ctx, t, b, PAPER);
  }

  /* =========================================================
     04 COLOUR — beat-synced circle reveals, cycling letters, swatches, hue wheel
     ========================================================= */
  const SEQ = [
    { b: 22, c: COBALT, o: [CX, CY], ink: [PAPER, LIME, PINK, ORANGE] },
    { b: 23, c: LIME, o: [990, 330], ink: [INK, COBALT, ORANGE] },
    { b: 24, c: PINK, o: [90, 1500], ink: [INK, COBALT, PAPER] },
    { b: 25, c: ORANGE, o: [990, 1500], ink: [INK, PAPER, COBALT] },
    { b: 26, c: INK, o: [CX, CY], ink: [ORANGE, LIME, PINK, COBALT, PAPER] },
  ];
  const SWATCH = [[INK, '0E0E10'], [PAPER, 'F3F0EA'], [ORANGE, 'FF4D17'], [COBALT, '2340FF'], [LIME, 'D4FF3A'], [PINK, 'FF7AD9']];
  function drawColour(ctx, t, b) {
    let j = 0;
    for (let i = 0; i < SEQ.length; i++) if (b >= SEQ[i].b) j = i;
    const cur = SEQ[j], prev = j ? SEQ[j - 1].c : INK;
    const rp = E.outExpo(V.prog(b, cur.b, cur.b + 0.55));
    V.bg(ctx, prev);
    // previous stage's colour reveal still finishing is implicit: new circle over old flat
    dot(ctx, cur.o[0], cur.o[1], rp * 2300, cur.c);
    const dark = cur.c === INK || cur.c === COBALT;
    const inkCol = rp > 0.35 ? (dark ? PAPER : INK) : (prev === INK || prev === COBALT ? PAPER : INK);

    // soft gradient orbs
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const ox = CX + V.noise1(b * 0.5 + k * 10) * 380, oy = CY + V.noise1(b * 0.4 + k * 20 + 5) * 520;
      const col = cur.ink[(k + 1) % cur.ink.length];
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 520);
      g.addColorStop(0, V.rgba(col.startsWith('#') ? col : '#ffffff', 0.35 * rp)); g.addColorStop(1, V.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // big word, per-letter colour cycling on eighths + hop
    const out = E.inBack(V.prog(b, 26, 26.4), 2);
    const size = fitSize(ctx, 'COLOUR', 'Anton', 920);
    const cap = capH(ctx, 'Anton') * size;
    const G = glyphsOf(ctx, 'COLOUR', 'Anton', size);
    const inn = E.outExpo(V.prog(b, 22, 22.4));
    for (let i = 0; i < G.length; i++) {
      const g = G[i];
      const ph = b * 2 - i * 0.14, f = V.fract(ph);
      const hop = -34 * Math.pow(1 - f, 3) * (b > 22.2 ? 1 : 0);
      const col = cur.ink[(i + Math.floor(ph) + 64) % cur.ink.length];
      const sc = inn * (1 - out);
      if (sc <= 0.01) continue;
      ctx.save();
      ctx.translate(CX + g.x * (1 + out * 0.6), CY + cap / 2 + hop + (1 - inn) * 200 * (i % 2 ? 1 : -1));
      ctx.scale(sc, sc);
      V.font(ctx, size, 'Anton', 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = col; ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }
    // hex readout, decoding on every change
    const hex = SWATCH.find((s) => s[0] === cur.c)[1];
    const hp = V.clamp((b - cur.b) / 0.35);
    V.text(ctx, '#' + decode(hex, hp, j * 13, t), CX, 470, { family: 'JetBrains Mono', weight: 800, size: 64, fill: inkCol, tracking: 6, alpha: 1 - out });
    // swatch row
    const sw = 128, gap = (900 - 6 * sw) / 5;
    for (let i = 0; i < SWATCH.length; i++) {
      const [col, hx] = SWATCH[i];
      const e = E.outBack(V.clamp((b - 22.1 - i * 0.07) / 0.3), 1.8) * (1 - E.inBack(V.clamp((b - 26 - i * 0.03) / 0.3)));
      if (e <= 0.01) continue;
      const active = col === cur.c ? E.outBack(V.clamp((b - cur.b) / 0.3), 2) : 0;
      const x = 90 + i * (sw + gap), y = 1300 + (1 - e) * 240 - active * 34;
      ctx.save();
      V.rrect(ctx, x, y, sw, sw * 0.82, 16); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 3 + active * 3; ctx.strokeStyle = inkCol; ctx.globalAlpha = 0.35 + 0.65 * active; ctx.stroke();
      ctx.restore();
      mono(ctx, hx, x + sw / 2, y + sw * 0.82 + 28, { fill: inkCol, size: 18, align: 'center', alpha: e * (0.6 + 0.4 * active) });
    }
    // hue wheel: blooms from the centre, spins, collapses back into the dot
    if (b >= 26) {
      const grow = E.outBack(V.prog(b, 26.05, 26.5), 1.4), shrink = E.inExpo(V.prog(b, 26.5, 27));
      const r = 600 * grow * (1 - shrink) + 26 * shrink;
      const rot = E.inCubic(V.prog(b, 26, 27)) * V.TAU * 2.5;
      if (r > 27) {
        const cg = ctx.createConicGradient(rot, CX, CY);
        const hues = [ORANGE, PINK, COBALT, '#23c4ff', LIME, '#ffd23f', ORANGE];
        hues.forEach((h, i) => cg.addColorStop(i / (hues.length - 1), h));
        ctx.save();
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, V.TAU); ctx.arc(CX, CY, r * 0.56, 0, V.TAU, true);
        ctx.fillStyle = cg; ctx.fill();
        // spokes
        ctx.strokeStyle = INK; ctx.lineWidth = 6;
        for (let k = 0; k < 24; k++) {
          const a = rot + (k / 24) * V.TAU;
          ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r * 0.56, CY + Math.sin(a) * r * 0.56); ctx.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r); ctx.stroke();
        }
        ctx.restore();
      }
      dot(ctx, CX, CY, 26, ORANGE);
    }
    hud(ctx, t, b, inkCol);
  }

  /* =========================================================
     05 END — paper floods from the dot, name rises, the dot lands as the full stop
     ========================================================= */
  function endLayout(ctx) {
    return once('end|' + NAME, () => {
      const r0 = 0.1, g0 = 0.045;
      const unit = widthOf(ctx, NAME, 'Anton') + g0 + 2 * r0;
      const size = Math.min(900 / unit, 380);
      const cap = capH(ctx, 'Anton') * size;
      const w = widthOf(ctx, NAME, 'Anton') * size;
      const left = CX - (unit * size) / 2;
      const base = 900 + cap / 2;
      return { size, cap, w, left, base, r: r0 * size, dotX: left + w + g0 * size + r0 * size, dotY: base - r0 * size };
    });
  }
  function drawEnd(ctx, t, b) {
    V.bg(ctx, INK);
    const L = endLayout(ctx);
    const flood = E.outExpo(V.prog(b, 27, 27.6));
    dot(ctx, CX, CY, flood * 2300, PAPER);

    // name: letters rise through a mask, staggered
    const G = glyphsOf(ctx, NAME, 'Anton', L.size);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, L.base - L.cap - 30, W, L.cap + 60); ctx.clip();
    for (let i = 0; i < G.length; i++) {
      const p = E.outExpo(V.clamp((b - 27.3 - i * 0.09) / 0.75));
      if (p <= 0) continue;
      ctx.save();
      V.font(ctx, L.size, 'Anton', 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = INK;
      ctx.fillText(G[i].ch, L.left + G.total / 2 + G[i].x, L.base + (1 - p) * (L.cap + 40));
      ctx.restore();
    }
    ctx.restore();

    // the dot: leaps from centre in an arc and lands as the full stop on beat 28
    const jp = V.prog(b, 27.25, 28);
    const x = V.lerp(CX, L.dotX, E.inOutCubic(jp));
    const y = V.lerp(CY, L.dotY, E.inQuad(jp)) - Math.sin(jp * Math.PI) * 420;
    const land = V.hit(b, 28, 0.08) * (b >= 28 ? 1 : 0);
    const r = V.lerp(26, L.r, E.inOutCubic(jp));
    dot(ctx, x, y + land * r * 0.3, r, ORANGE, 1 + land * 0.5, 1 - land * 0.35);
    const rg = V.prog(b, 28, 28.9);
    if (rg > 0 && rg < 1) ring(ctx, L.dotX, L.dotY, L.r + E.outExpo(rg) * 240, 5 * (1 - rg) + 1, ORANGE, 1 - rg);

    // rule, role, meta row, availability pill
    const ru = E.inOutExpo(V.prog(b, 28.2, 28.9));
    ctx.fillStyle = INK; ctx.fillRect(90, L.base + 62, 900 * ru, 3);
    const rolP = E.outExpo(V.prog(b, 28.45, 29.1));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, L.base + 70, W, 170); ctx.clip();
    V.text(ctx, 'Motion Designer', 90, L.base + 200 + (1 - rolP) * 150, { family: 'Instrument Serif', style: 'italic', weight: 400, size: 124, fill: INK, align: 'left', baseline: 'alphabetic' });
    ctx.restore();
    const mp = V.prog(b, 28.7, 29.3);
    mono(ctx, decode('SHOWREEL 2026', mp, 3, t), 92, L.base + 280, { fill: INK, size: 24 });
    mono(ctx, decode('TYPE · SHAPE · CAMERA · COLOUR', mp, 9, t), 990, L.base + 280, { fill: INK, size: 24, align: 'right' });
    // the platform URL
    const up = V.prog(b, 29.0, 29.45);
    if (up > 0) {
      dot(ctx, 104, L.base + 372, 11 * E.outBack(V.clamp(up * 3), 2), ORANGE);
      mono(ctx, decode('crewupa.com', up, 21, t), 130, L.base + 373, { fill: INK, size: 40, weight: 800, tracking: 1 });
    }
    const pp = E.outBack(V.prog(b, 28.9, 29.35), 2);
    if (pp > 0) {
      const pw = 360, ph = 58, px = 90, py = L.base - L.cap - 118;
      ctx.save();
      ctx.translate(px, py + ph / 2); ctx.scale(pp, pp); ctx.translate(-px, -(py + ph / 2));
      V.rrect(ctx, px, py, pw, ph, 29); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      dot(ctx, px + 32, py + ph / 2, 9, ORANGE);
      mono(ctx, 'AVAILABLE FOR WORK', px + 54, py + ph / 2 + 1, { fill: INK, size: 21, weight: 800, tracking: 1.5 });
      ctx.restore();
    }
  }

  /* ---------------- master ---------------- */
  const CUTS = [0.5, 1, 1.5, 2, 2.5, 15.5, 16, 22].map(B);
  V.reel({
    title: 'ONE DOT — chaptered résumé reel',
    duration: 15,
    fps: 60,
    bpm: BPM,
    sidechain: 0.65,
    blur: {
      samples: 4,
      shutter: (t) => (CUTS.some((c) => Math.abs(t - c) < 1.5 / 60) ? 0 : 0.6),
    },
    draw(ctx, t) {
      const b = t / SPB;
      if (b < TYPE) drawHook(ctx, t, b);
      else if (b < SHAPE) drawType(ctx, t, b);
      else if (b < CAM) drawShape(ctx, t, b);
      else if (b < COLOR) drawCam(ctx, t, b);
      else if (b < END) drawColour(ctx, t, b);
      else drawEnd(ctx, t, b);
    },
    post(ctx, t) {
      const b = t / SPB;
      // RGB split on the drop and the whip pan
      const ch = V.hit(t, B(16), 0.12) * 16 + V.win(b, 21.5, 22.25, 0.35, 0.25) * 22 + V.hit(t, B(0), 0.1) * 10;
      if (ch > 0.5) V.chroma(ctx, ch, 0);
      if (b > 21.6 && b < 22.15) V.slices(ctx, t, 90 * V.win(b, 21.6, 22.15, 0.2, 0.2), 16, 3);
      if (b >= CAM && b < COLOR) V.vignette(ctx, 0.55);
      V.grain(ctx, t, b >= END + 2.5 ? 0.035 : 0.06);
    },
    music(m) {
      const Am = [57, 60, 64], F = [53, 57, 60], Cmaj = [55, 60, 64], G = [55, 59, 62];
      // ---- HOOK (b0–4): a stab on every word
      m.impact(0, { gain: 0.7 });
      [0, 0.5, 1, 1.5, 2, 2.5].forEach((b, i) => {
        m.chord(b, 0.4, i % 2 ? Am.map((n) => n + 12) : Am, { pluck: 9, gain: 0.26, cutoff: 900, env: 7000, verb: 0.25 });
      });
      for (let b = 0; b < 4; b++) m.kick(b);
      m.bass(0, 0.45, 33, { gain: 0.5 }); m.bass(1, 0.45, 33, { gain: 0.5 }); m.bass(2, 0.45, 36, { gain: 0.5 }); m.bass(3, 0.45, 31, { gain: 0.5 });
      m.zap(1, { gain: 0.14 });
      m.clap(2.5, { gain: 0.8 }); m.snare(2.5, { gain: 0.5 });
      m.tick(3.2, { freq: 3200, gain: 0.3 });
      m.whoosh(3.4, 0.6, { gain: 0.45 });

      // ---- TYPE (b4–10)
      for (let b = 4; b < 10; b++) { m.kick(b); m.hat(b + 0.5, { gain: 0.22 }); }
      [5, 7, 9].forEach((b) => m.clap(b));
      for (let i = 0; i < 7; i++) m.tick(4 + i * 0.25, { freq: 1600 + i * 320, gain: 0.26, pan: (i / 6 - 0.5) * 0.8 });
      m.chord(4, 2, Am, { attack: 0.02, gain: 0.16, cutoff: 700, env: 1800, fdecay: 3, release: 0.3 });
      m.chord(6, 2, F, { attack: 0.02, gain: 0.16, cutoff: 700, env: 2600, fdecay: 3, release: 0.3 });
      m.chord(8, 2, Cmaj, { attack: 0.02, gain: 0.16, cutoff: 700, env: 2600, fdecay: 3, release: 0.3 });
      const bassLine = [33, 33, 45, 33, 29, 29, 41, 29, 36, 36, 48, 36];
      bassLine.forEach((n, i) => m.bass(4 + i * 0.5, 0.42, n, { gain: 0.42, cutoff: 350, env: 1500 }));
      m.lead(8.5, 1, 76, { gain: 0.08, decay: 1.5, verb: 0.6 });
      m.downlifter(9.4, 0.6, { gain: 0.3 });
      m.whoosh(9.55, 0.5, { gain: 0.35, dir: -1 });

      // ---- SHAPE (b10–16): each bounce plays a note
      m.lead(10, 0.4, 69, { gain: 0.12 }); m.kick(11, { gain: 0.8 }); m.lead(11, 0.5, 72, { gain: 0.14 });
      m.kick(12, { gain: 0.9 }); m.lead(12, 0.5, 76, { gain: 0.14 });
      m.hat(10.5, { gain: 0.12 }); m.hat(11.5, { gain: 0.12 });
      for (let b = 12; b < 15.5; b++) m.kick(b);
      m.clap(13); m.clap(15);
      const arp = [69, 72, 76, 79, 76, 72];
      for (let i = 0; i < 12; i++) m.lead(12.5 + i * 0.25, 0.22, arp[i % arp.length] + (i >= 8 ? 2 : 0), { gain: 0.07, decay: 6, pan: Math.sin(i) * 0.5 });
      for (let b = 12; b < 15.5; b += 0.5) m.hat(b + 0.25, { gain: 0.14, pan: -0.3 });
      m.chord(12, 2, Cmaj, { attack: 0.01, gain: 0.13, cutoff: 900, env: 3000, fdecay: 4 });
      m.chord(14, 1.5, G, { attack: 0.01, gain: 0.13, cutoff: 900, env: 3000, fdecay: 4 });
      [36, 36, 48, 36, 43, 43, 55, 43].forEach((n, i) => m.bass(12 + i * 0.5, 0.42, n - 12, { gain: 0.4 }));
      m.riser(13.5, 15.5, { gain: 0.45 });
      for (let b = 14; b < 15; b += 0.5) m.snare(b, { gain: 0.35, verb: 0.1 });
      for (let b = 15; b < 15.5; b += 0.125) m.snare(b, { gain: 0.25 + (b - 15) * 0.6, verb: 0.1 });
      m.mute(15.5, 16);

      // ---- CAMERA (b16–22): the drop
      m.impact(16, { gain: 0.9 }); m.subdrop(16, { gain: 0.5 });
      for (let b = 16; b < 22; b++) { m.kick(b, { gain: 1 }); m.whoosh(b + 0.02, 0.6, { gain: 0.12, dir: b % 2 ? 1 : -1 }); }
      [17, 19, 21].forEach((b) => { m.clap(b); m.snare(b, { gain: 0.35 }); });
      for (let b = 16; b < 22; b += 0.25) m.hat(b, { gain: b % 1 === 0.5 ? 0.2 : 0.09, pan: 0.3 });
      m.chord(16, 2, Am, { gain: 0.2, cutoff: 1500, env: 5000, fdecay: 4, verb: 0.45 });
      m.chord(18, 2, F, { gain: 0.2, cutoff: 1500, env: 5000, fdecay: 4, verb: 0.45 });
      m.chord(20, 2, G, { gain: 0.2, cutoff: 1500, env: 5000, fdecay: 4, verb: 0.45 });
      const reese = [33, 33, 33, 36, 29, 29, 29, 31, 31, 31, 31, 34];
      reese.forEach((n, i) => m.bass(16 + i * 0.5, 0.48, n, { type: 'reese', gain: 0.4, cutoff: 500, env: 900 }));
      m.whoosh(17.75, 0.6, { gain: 0.4 }); m.whoosh(19.7, 0.8, { gain: 0.5, dir: -1 });
      m.whoosh(21.4, 0.6, { gain: 0.6, dir: -1 }); m.glitch(21.6, 0.4, { gain: 0.2 });

      // ---- COLOUR (b22–27): a chord per colour
      const prog = [Am, F, Cmaj, G, Am];
      prog.forEach((ch, i) => {
        m.chord(22 + i, 0.9, ch.map((n) => n + 12), { pluck: 5, gain: 0.22, cutoff: 1400, env: 6000, verb: 0.4 });
        m.chord(22 + i, 0.9, ch, { gain: 0.1, cutoff: 700, env: 1500 });
        m.kick(22 + i); m.hat(22 + i + 0.5, { gain: 0.2 });
        m.tick(22 + i + 0.05, { freq: 2800, gain: 0.12 });
      });
      [23, 25].forEach((b) => m.clap(b));
      [33, 45, 29, 41, 36, 48, 31, 43, 33, 45].forEach((n, i) => m.bass(22 + i * 0.5, 0.42, n, { gain: 0.4 }));
      m.riser(26, 27, { gain: 0.35, tone: 0.5 }); m.zap(26.9, { gain: 0.15 });

      // ---- END (b27–32): the dot lands
      m.whoosh(27, 1, { gain: 0.3 });
      m.kick(28, { gain: 1, decay: 4 }); m.impact(28, { gain: 0.75 });
      m.chord(28, 3.5, [45, 57, 64, 67, 71, 76], { gain: 0.22, attack: 0.005, cutoff: 1800, env: 4000, fdecay: 1.5, release: 1.2, verb: 0.7 });
      m.bass(28, 3.5, 33, { type: 'sub', gain: 0.35 });
      m.lead(29, 2, 81, { gain: 0.05, decay: 1, verb: 0.8 });
      [28.7, 28.8, 28.9, 29.0].forEach((b, i) => m.tick(b, { freq: 3000 + i * 200, gain: 0.08 }));
    },
  });
})();
