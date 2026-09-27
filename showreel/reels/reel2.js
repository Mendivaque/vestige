/* Reel 2 — SHAPE PLAY.
 * Flat Bauhaus colour, squash & stretch, "shape becomes the next scene" match-cuts.
 * 128 BPM, 8 bars. Every colour change happens through a moving shape.
 *
 *  bar 1  BOUNCE   ball drops onto the word, bounces letter-to-letter, leaps into camera → butter
 *  bar 2  SHAPE    circle → squircle → triangle → star, carousel satellites; star swallows frame → tomato
 *  bar 3  RHYTHM   6×11 grid ripples: pop-in, squares wave, rings wave, mint cells flood the frame
 *  bar 4  FLOW     Lissajous snake draws on, accelerates, coils into a single dot (riser + silence)
 *  bar 5  DROP     pink burst, confetti, SQUASH / STRETCH jelly type
 *  bar 6  COLOUR   one wipe per beat: clock, corner circle, bars, diamond — word restyles each time
 *  bar 7  SIGN     ball returns, bounces, splits into circle/square/triangle mark
 *  bar 8  END      cobalt iris from the mark, name + role, hold
 */
(() => {
  const BPM = 128, SPB = 60 / BPM, TAU = Math.PI * 2, PI = Math.PI;
  const E = V.ease, clamp = V.clamp, lerp = V.lerp, prog = V.prog;
  const at = (b) => b * SPB;
  const W = 1080, H = 1920;
  const P = {
    cobalt: '#2a4bff', tomato: '#ff5a36', butter: '#ffd23f', mint: '#3ddc97',
    pink: '#ff8fcf', ink: '#141414', cream: '#f6f1e7',
  };
  const NAME = ((globalThis.PARAMS && globalThis.PARAMS.name) || 'CREWUPA').toUpperCase();

  /* ---------- motion primitives (closed-form, pure functions of time) ---------- */
  /** Underdamped spring 0→1 (overshoots once, settles). x in seconds. */
  const sp = (x, f = 20, d = 8) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(f * x));
  /** Damped wobble impulse starting at 0, first lobe positive. */
  const wob = (x, f = 26, d = 9) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(f * x));

  /* ---------- text helpers ---------- */
  const gCache = {}, fCache = {};
  const okey = (s, o) => `${s}|${o.size}|${o.family}|${o.weight || 800}|${o.style || 'normal'}|${o.tracking || 0}`;
  function glyphs(ctx, str, o) {
    const k = okey(str, o);
    if (gCache[k]) return gCache[k];
    const g = V.glyphs(ctx, str, o);
    ctx.save();
    V.font(ctx, o.size, o.family, o.weight || 800, o.style || 'normal');
    ctx.letterSpacing = '0px';
    for (const q of g) {
      const mm = ctx.measureText(q.ch);
      q.asc = mm.actualBoundingBoxAscent; q.desc = mm.actualBoundingBoxDescent;
    }
    ctx.restore();
    return (gCache[k] = g);
  }
  function fit(ctx, str, o, maxW) {
    const k = okey(str, o) + '|' + maxW;
    if (fCache[k]) return fCache[k];
    const w = V.measure(ctx, str, o);
    return (fCache[k] = w > maxW ? (o.size * maxW) / w : o.size);
  }
  /** One glyph, anchored at its baseline centre, with squash (sx, sy) and rotation. */
  function letter(ctx, ch, x, y, o, fill, sx = 1, sy = 1, rot = 0, shadow = null) {
    if (sy <= 0.002 || sx <= 0.002) return;
    ctx.save();
    V.font(ctx, o.size, o.family, o.weight || 800, o.style || 'normal');
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    if (shadow) {
      ctx.save();
      ctx.translate(x + shadow[1], y + shadow[2]); if (rot) ctx.rotate(rot); ctx.scale(sx, sy);
      ctx.fillStyle = shadow[0]; ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.fillStyle = fill; ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  /* ---------- radial shape tables (morphable star-shaped outlines) ---------- */
  const NS = 360;
  const COS = new Float32Array(NS), SIN = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { COS[i] = Math.cos((i / NS) * TAU); SIN[i] = Math.sin((i / NS) * TAU); }
  const tab = (fn) => { const a = new Float32Array(NS); for (let i = 0; i < NS; i++) a[i] = fn((i / NS) * TAU); return a; };
  const regPts = (n, R, R2) => {
    const m = R2 ? n * 2 : n, pts = [];
    for (let i = 0; i < m; i++) {
      const a = -PI / 2 + (i / m) * TAU, r = R2 && i % 2 ? R2 : R;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  };
  /** Ray-cast radius of a star-shaped polygon (about the origin) at angle th. */
  const polyRad = (pts) => (th) => {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const r = (ax * ey - ay * ex) / den, s = (ax * dy - ay * dx) / den;
      if (r > 0 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.min(best, r);
    }
    return best;
  };
  const T_CIRCLE = tab(() => 1);
  const T_SQUIR = tab((th) => 0.94 / Math.pow(Math.pow(Math.abs(Math.cos(th)), 5) + Math.pow(Math.abs(Math.sin(th)), 5), 1 / 5));
  const T_TRI = tab(polyRad(regPts(3, 1.45)));
  const T_STAR = tab(polyRad(regPts(5, 1.4, 0.66)));
  const MORPH = [T_CIRCLE, T_SQUIR, T_TRI, T_STAR];
  const RBUF = new Float32Array(NS);
  function radPath(ctx, r, cx, cy, s, sx, sy, rot) {
    const c = Math.cos(rot), sn = Math.sin(rot);
    ctx.beginPath();
    for (let i = 0; i < NS; i++) {
      const px = COS[i] * r[i] * s, py = SIN[i] * r[i] * s;
      const X = cx + (px * c - py * sn) * sx, Y = cy + (px * sn + py * c) * sy;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }
  const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); };

  /* =====================================================================
   * SCENE 1 — BOUNCE (b0–4) cobalt
   * ===================================================================== */
  const B1 = { R: 92, hold: 0.075 };
  function s1Layout(ctx) {
    const o = { family: 'Syne', weight: 800, size: 250 };
    o.size = fit(ctx, 'BOUNCE', o, 900);
    const g = glyphs(ctx, 'BOUNCE', o);
    return { o, g, base: 1340 };
  }
  /** Letter j compression (positive = squashed down) at time t. */
  function s1Comp(j, t) {
    const hits = [[at(1), 1], [at(2), 3], [at(3), 5]];
    let c = 0;
    for (let h = 0; h < hits.length; h++) {
      const [ti, hj] = hits[h], d = Math.abs(j - hj), tau = t - ti;
      if (d === 0) {
        if (h < 2) {
          if (tau >= 0 && tau < B1.hold) c += Math.sin((PI * tau) / B1.hold) * 0.9;
          else c -= 0.55 * wob(tau - B1.hold, 22, 7);
        } else {
          // E: anticipation hold under the ball, then release as it launches
          const tL = at(3) + 0.16;
          if (tau >= 0 && t < tL) c += E.outCubic(clamp(tau / 0.06)) * 1.1;
          else c -= 0.9 * wob(t - tL, 20, 6.5);
        }
      } else if (d <= 2) {
        c += (d === 1 ? 0.38 : 0.14) * wob(tau - d * 0.045, 22, 8);
      }
    }
    return c;
  }
  /** Ball pose at time t: bottom-anchor point, axis squash, radius scale. */
  function s1BallPos(t, L) {
    const { g, base } = L;
    const idx = [1, 3, 5];
    const xs = idx.map((i) => 540 + g[i].x);
    const tops = idx.map((i) => base - g[i].asc);
    const t1 = at(1), t2 = at(2), t3 = at(3), t4 = at(4), tL = t3 + 0.16, hold = B1.hold;
    const Hs = [430, 330];
    let x, yb, q = 0, scale = 1, cy = null;
    if (t < t1) {
      const u = clamp(t / t1);
      x = lerp(540, xs[0], u);
      scale = 1 + 5 * (1 - E.outCubic(prog(t, 0, 0.3)));
      cy = lerp(620, tops[0] - B1.R, u) - 4 * 190 * u * (1 - u);
      yb = cy + B1.R * scale;
    } else if (t < t3) {
      const k = t < t2 ? 0 : 1, ti = k ? t2 : t1, tn = k ? t3 : t2;
      if (t < ti + hold) {
        const u = (t - ti) / hold;
        x = xs[k];
        yb = tops[k] + g[idx[k]].asc * 0.28 * s1Comp(idx[k], t);
        q = Math.sin(PI * u);
      } else {
        const u = (t - ti - hold) / (tn - ti - hold);
        x = lerp(xs[k], xs[k + 1], u);
        yb = lerp(tops[k], tops[k + 1], u) - 4 * Hs[k] * u * (1 - u);
      }
    } else if (t < tL) {
      x = xs[2];
      yb = tops[2] + g[5].asc * 0.28 * s1Comp(5, t);
      q = E.outCubic(clamp((t - t3) / 0.06)) * 1.25;
    } else {
      const p = prog(t, tL, t4);
      const c0y = tops[2] - B1.R;
      x = lerp(xs[2], 540, E.inOutCubic(p));
      cy = lerp(c0y, 930, E.inOutSine(p)) - Math.sin(PI * Math.min(1, p * 1.3)) * 260 * (1 - p);
      scale = 1 + 13.5 * E.inExpo(p);
      q = 1.25 * Math.exp(-Math.pow((t - tL) / 0.035, 2));
      yb = cy + B1.R * scale;
    }
    if (cy === null) cy = yb - B1.R;
    return { x, yb, cy, q, scale };
  }
  function s1Ball(ctx, t, L) {
    const s = s1BallPos(t, L);
    const R = B1.R * s.scale;
    // velocity by finite difference → stretch along motion
    const d = 1 / 240, a = s1BallPos(t - d, L), b = s1BallPos(t + d, L);
    const vx = (b.x - a.x) / (2 * d), vy = (b.cy - a.cy) / (2 * d);
    const speed = Math.hypot(vx, vy);
    const pL = prog(t, at(3) + 0.16, at(4));
    let st = Math.min(0.55, speed / 6500) * (1 - Math.min(1, s.q)) * Math.pow(1 - pL, 2);
    const ang = Math.atan2(vy, vx);
    const sy = 1 - 0.4 * Math.min(1.25, s.q), sx = 1 / Math.pow(sy, 0.85);
    // pop-in at the very start
    const pop = 1;
    const dark = V.mix('#e0a600', P.butter, clamp(pL * 1.6));
    ctx.save();
    ctx.translate(s.x, s.yb);
    ctx.scale(sx * pop, sy * pop);
    ctx.translate(0, -R);
    ctx.save();
    ctx.rotate(ang); ctx.scale(1 + st, 1 / (1 + st));
    circle(ctx, 0, 0, R);
    ctx.fillStyle = dark; ctx.fill();
    ctx.clip();
    ctx.scale(1 / (1 + st), 1 + st); ctx.rotate(-ang);
    circle(ctx, -R * 0.16, -R * 0.16, R * 1.02);
    ctx.fillStyle = P.butter; ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function S1(ctx, t) {
    V.bg(ctx, P.cobalt);
    const L = s1Layout(ctx), { o, g, base } = L;
    const hitT = [at(1), at(2), at(3)], hitJ = [1, 3, 5];
    // shockwave rings + dust at each contact (behind the letters)
    for (let h = 0; h < 3; h++) {
      const pr = prog(t, hitT[h], hitT[h] + 0.5);
      if (pr <= 0 || pr >= 1) continue;
      const x = 540 + g[hitJ[h]].x, y = base - g[hitJ[h]].asc;
      const rx = 50 + 230 * E.outCubic(pr);
      ctx.save();
      ctx.strokeStyle = V.rgba(P.cream, 1 - pr);
      ctx.lineWidth = 14 * (1 - pr);
      ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.26, 0, 0, TAU); ctx.stroke();
      const r = V.rng(11 + h);
      for (let k = 0; k < 7; k++) {
        const aa = -PI / 2 + (r() - 0.5) * 2.4, v = 500 + r() * 700, tt = pr * 0.5;
        const px = x + Math.cos(aa) * v * tt, py = y + Math.sin(aa) * v * tt + 2600 * tt * tt;
        circle(ctx, px, py, (6 + r() * 9) * (1 - pr));
        ctx.fillStyle = k % 2 ? P.butter : P.cream; ctx.fill();
      }
      ctx.restore();
    }
    // letters rise through a mask, then react to every hit
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, base + 40); ctx.clip();
    for (const q of g) {
      const rise = sp(t - 0.02 - q.i * 0.05, 15, 6.5);
      const c = s1Comp(q.i, t);
      const sy = 1 - 0.28 * c, sx = 1 + 0.15 * c;
      letter(ctx, q.ch, 540 + q.x, base + (1 - rise) * 320, o, P.cream, sx, sy, (1 - Math.min(1, rise)) * (q.i % 2 ? 0.25 : -0.25));
    }
    ctx.restore();
    // tiny kicker label
    const la = E.outCubic(prog(t, 0.15, 0.5)) * (1 - prog(t, at(3), at(3.5)));
    if (la > 0) {
      V.text(ctx, 'SHAPE  ·  COLOUR  ·  MOTION', 540, 360 + (1 - la) * 30, {
        size: 30, family: 'JetBrains Mono', weight: 500, tracking: 8, fill: V.rgba(P.cream, 0.85 * la),
      });
    }
    s1Ball(ctx, t, L);
  }

  /* =====================================================================
   * SCENE 2 — SHAPE (b4–8) butter
   * ===================================================================== */
  const S2C = { cx: 540, cy: 860, R: 225 };
  const S2NAMES = ['CIRCLE', 'SQUIRCLE', 'TRIANGLE', 'STAR'];
  function S2(ctx, t) {
    V.bg(ctx, P.butter);
    const { cx, cy, R } = S2C;
    const t4 = at(4), lt = t - t4, bb = t / SPB - 4;
    const pe = prog(t, at(7.45), at(8));                           // exit: star swallows the frame
    // radial morph with spring overshoot (extrapolates → jelly)
    const m = [0, sp(t - at(5), 19, 7.5), sp(t - at(6), 19, 7.5), sp(t - at(7), 19, 7.5)];
    for (let i = 0; i < NS; i++) {
      let r = MORPH[0][i];
      for (let k = 1; k < 4; k++) r += (MORPH[k][i] - MORPH[k - 1][i]) * m[k];
      RBUF[i] = r;
    }
    let rot = 0, w = wob(lt, 22, 7) * 0.1;
    for (let k = 1; k < 4; k++) {
      rot += (PI / 2) * E.outBack(prog(t, at(4 + k), at(4 + k) + 0.38), 2.2);
      w += wob(t - at(4 + k), 24, 8) * 0.13;
    }
    rot += 1.6 * PI * E.inCubic(pe);
    const pop = sp(lt, 15, 6.2);
    const scale = pop * (1 - 0.1 * Math.sin(PI * clamp(pe / 0.4))) * (1 + 11 * E.inExpo(pe));
    const sx = 1 + w, sy = 1 - w;

    // carousel satellites: step 120° every beat with a snappy overshoot
    const step = bb < 0 ? 0 : Math.floor(bb) + E.outBack(clamp((bb - Math.floor(bb)) / 0.42), 2);
    const sats = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3 + step * (TAU / 3) + 0.4 + lt * 0.35;
      const out = 1 + 3.5 * E.inBack(pe, 2);
      const ex = Math.cos(a) * 395 * out, ey = Math.sin(a) * 125 * out, tilt = -0.28;
      const x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const z = Math.sin(a);
      const s = sp(lt - 0.12 - i * 0.07, 18, 7) * (0.78 + 0.28 * (z + 1) / 2);
      sats.push({ i, x, y, z, s, a });
    }
    const drawSat = (st) => {
      if (st.s <= 0.001) return;
      ctx.save(); ctx.translate(st.x, st.y); ctx.scale(st.s, st.s);
      if (st.i === 0) { circle(ctx, 0, 0, 34); ctx.fillStyle = P.ink; ctx.fill(); }
      else if (st.i === 1) { ctx.rotate(st.a * 1.5); V.rrect(ctx, -30, -30, 60, 60, 8); ctx.fillStyle = P.cobalt; ctx.fill(); }
      else { circle(ctx, 0, 0, 30); ctx.lineWidth = 14; ctx.strokeStyle = P.cream; ctx.stroke(); }
      ctx.restore();
    };

    // label: slot-rolls to the new shape name on every beat
    const idx = clamp(Math.floor(bb), 0, 3);
    const roll = E.outBack(clamp((bb - idx) / 0.35), 1.6);
    ctx.save();
    ctx.beginPath(); ctx.rect(90, 395, 900, 70); ctx.clip();
    const lab = (k, dy, a) => {
      if (k < 0) return;
      V.text(ctx, `0${k + 1} — ${S2NAMES[k]}`, 540, 430 + dy, { size: 34, family: 'JetBrains Mono', weight: 500, tracking: 6, fill: V.rgba(P.ink, a) });
    };
    const lin = E.outCubic(prog(lt, 0.1, 0.35));
    if (idx === 0) lab(0, (1 - lin) * 60, lin);
    else { lab(idx - 1, -roll * 60, 1); lab(idx, (1 - roll) * 60, 1); }
    ctx.restore();

    // big word with masked rise + per-beat hop wave
    const o = { family: 'Syne', weight: 800, size: 250 };
    o.size = fit(ctx, 'SHAPE', o, 860);
    const g = glyphs(ctx, 'SHAPE', o), base = 1440;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, base + 30); ctx.clip();
    for (const q of g) {
      const rise = sp(lt - 0.08 - q.i * 0.045, 16, 6.8);
      let hop = 0;
      for (let k = 1; k < 4; k++) hop += wob(t - at(4 + k) - q.i * 0.04, 18, 8);
      letter(ctx, q.ch, 540 + q.x, base + (1 - rise) * 300 - hop * 34, o, P.ink, 1 - hop * 0.05, 1 + hop * 0.08);
    }
    ctx.restore();
    sats.filter((s) => s.z < 0).forEach(drawSat);
    // hard flat shadow + hero
    const sa = 1 - clamp(pe * 4);
    if (sa > 0 && scale > 0.01) {
      radPath(ctx, RBUF, cx + 22, cy + 26, R * scale, sx, sy, rot);
      ctx.fillStyle = V.rgba('#e3a900', sa); ctx.fill();
    }
    if (scale > 0.001) {
      radPath(ctx, RBUF, cx, cy, R * scale, sx, sy, rot);
      ctx.fillStyle = P.tomato; ctx.fill();
    }
    sats.filter((s) => s.z >= 0).forEach(drawSat);
  }

  /* =====================================================================
   * SCENE 3 — RHYTHM (b8–12) tomato grid
   * ===================================================================== */
  const GRID = [];
  for (let j = 0; j < 11; j++) for (let i = 0; i < 6; i++) {
    GRID.push({
      i, j, x: 90 + 180 * i, y: 960 + (j - 5) * 180,
      d0: Math.hypot(i - 2.5, j - 5), dA: Math.hypot(i, j), dB: Math.hypot(5 - i, 10 - j),
    });
  }
  function S3(ctx, t) {
    V.bg(ctx, P.tomato);
    const t8 = at(8), lt = t - t8;
    const antic = E.inOutCubic(prog(t, at(10.7), at(11))) ;
    for (const c of GRID) {
      const band = c.j === 5;
      const pop = sp(t - t8 - c.d0 * 0.035, 18, 7);
      const tA = at(9) + c.dA * 0.028, tB = at(10) + c.dB * 0.028;
      const pA = prog(t, tA, tA + 0.32), pB = prog(t, tB, tB + 0.32);
      const kA = E.outBack(pA, 2.4), kB = E.outBack(pB, 2.4);
      if (!band && pop > 0.001) {
        const k = 2 + 8 * clamp(kA) - 8 * clamp(kB);
        const rot = (PI / 2) * kA + (PI / 2) * kB;
        let r = 54 * pop * (1 + 0.18 * wob(t - tA, 22, 8) + 0.18 * wob(t - tB, 22, 8)) * (1 - 0.22 * antic);
        const col = pB > 0 ? V.mix(P.butter, P.cream, E.outCubic(pB)) : V.mix(P.cream, P.butter, E.outCubic(pA));
        V.squircle(ctx, c.x, c.y, r, r, Math.max(2, k), rot, 44);
        ctx.fillStyle = col; ctx.fill();
        const hole = E.outCubic(pB) * 0.58;
        if (hole > 0.01) { circle(ctx, c.x, c.y, r * hole); ctx.fillStyle = P.tomato; ctx.fill(); }
      }
    }
    // word in the empty band
    const o = { family: 'Syne', weight: 800, size: 150 };
    o.size = fit(ctx, 'RHYTHM', o, 820);
    const g = glyphs(ctx, 'RHYTHM', o), base = 960 + o.size * 0.36;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 870, W, 180); ctx.clip();
    for (const q of g) {
      const rise = sp(lt - 0.18 - q.i * 0.04, 16, 7);
      const hop = wob(t - at(9) - (q.x + 540) / 1080 * 0.18, 20, 8) + wob(t - at(10) - (1 - (q.x + 540) / 1080) * 0.18, 20, 8);
      letter(ctx, q.ch, 540 + q.x, base + (1 - rise) * 190 - hop * 22, o, P.cream, 1, 1 + hop * 0.1);
    }
    ctx.restore();
    // flood: mint cells bloom from the centre and merge into the next background
    for (const c of GRID) {
      const tc = at(11.25) + c.d0 * 0.022;
      const p = prog(t, tc, tc + 0.26);
      if (p <= 0) continue;
      circle(ctx, c.x, c.y, 136 * E.outCubic(p));
      ctx.fillStyle = P.mint; ctx.fill();
    }
  }

  /* =====================================================================
   * SCENE 4 — FLOW (b12–16) mint, the build
   * ===================================================================== */
  const S4C = { cx: 540, cy: 830 };
  const lis = (c, ph = 0) => { const u = c * TAU; return [Math.cos(3 * u + ph) * 360, Math.sin(2 * u) * 370]; };
  function strokeLis(ctx, c0, c1, sc, rot, ph, color, lw) {
    if (c1 - c0 < 0.002) return;
    const { cx, cy } = S4C, cr = Math.cos(rot), sr = Math.sin(rot);
    ctx.beginPath();
    const n = Math.max(2, Math.ceil((c1 - c0) / 0.0035));
    for (let k = 0; k <= n; k++) {
      const [x, y] = lis(lerp(c0, c1, k / n), ph);
      const X = cx + (x * cr - y * sr) * sc, Y = cy + (x * sr + y * cr) * sc;
      k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
  }
  function s4Head(bb) {
    const u = Math.min(Math.max(bb, 0), 3.45);
    const H1 = 0.85 * u + 0.1 * u * u;
    const L = u < 1.5 ? Math.min(H1, 0.8) : lerp(0.8, 0.22, E.inOutCubic(prog(u, 1.5, 3.3)));
    return { H: H1, tail: Math.max(0, H1 - L) };
  }
  function S4(ctx, t) {
    V.bg(ctx, P.mint);
    const bb = t / SPB - 12;
    const { cx, cy } = S4C;
    const { H: hd, tail } = s4Head(bb);
    const col = E.inCubic(prog(bb, 1.9, 3.45));
    const sc = 1 - col, rot = col * PI * 1.3;
    // closing iris ring
    const ir = prog(bb, 2.1, 3.45);
    if (ir > 0 && ir < 1) {
      circle(ctx, cx, cy, lerp(1250, 40, E.inCubic(ir)));
      ctx.lineWidth = 26 * (0.4 + 0.6 * E.outCubic(ir * 3)); ctx.strokeStyle = P.ink; ctx.stroke();
    }
    if (sc > 0.02) {
      const lwS = Math.max(0.25, sc);
      strokeLis(ctx, tail, hd, sc, rot, 0, P.ink, 30 * lwS);
      // chaser dots riding the curve behind the head
      for (let k = 1; k <= 3; k++) {
        const c = hd - k * 0.075;
        if (c < tail) continue;
        const [x, y] = lis(c);
        const X = cx + (x * Math.cos(rot) - y * Math.sin(rot)) * sc, Y = cy + (x * Math.sin(rot) + y * Math.cos(rot)) * sc;
        circle(ctx, X, Y, (22 - k * 4) * lwS);
        ctx.fillStyle = [P.pink, P.butter, P.cream][k - 1]; ctx.fill();
      }
    }
    // head dot → becomes the tension dot
    let hx = cx, hy = cy;
    if (sc > 0) {
      const [x, y] = lis(hd);
      hx = cx + (x * Math.cos(rot) - y * Math.sin(rot)) * sc; hy = cy + (x * Math.sin(rot) + y * Math.cos(rot)) * sc;
    }
    const inh = E.inOutCubic(prog(bb, 3.5, 4));
    const shake = prog(bb, 3.45, 4);
    hx += V.noise1(t * 55) * 5 * shake; hy += V.noise1(t * 55 + 30) * 5 * shake;
    const hr = (bb < 0.05 ? sp(t - at(12) + 0.02, 22, 8) : 1) * lerp(36, 46, col) * (1 - 0.4 * inh) * (1 + 0.12 * wob(t - at(15.45), 30, 6));
    // tension halo: thin ring breathing in around the dot during the silence
    const hal = prog(bb, 3.3, 4);
    if (hal > 0 && hal < 1) {
      circle(ctx, hx, hy, hr + lerp(160, 14, E.inOutCubic(hal)));
      ctx.lineWidth = 6; ctx.strokeStyle = V.rgba(P.ink, Math.min(1, hal * 5)); ctx.stroke();
    }
    circle(ctx, hx, hy, hr); ctx.fillStyle = P.cobalt; ctx.fill();
    if (col < 0.9) { circle(ctx, hx, hy, hr * 0.36 * (1 - col)); ctx.fillStyle = P.cream; ctx.fill(); }
    // serif italic word: masked rise, masked drop
    const o = { family: 'Instrument Serif', weight: 400, style: 'italic', size: 290 };
    const g = glyphs(ctx, 'flow', o), base = 1465;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 1150, W, base + 60 - 1150); ctx.clip();
    for (const q of g) {
      const rise = sp(t - at(12.3) - q.i * 0.05, 15, 6.5);
      const drop = E.inBack(prog(bb, 2.3 + q.i * 0.06, 2.75 + q.i * 0.06), 2);
      letter(ctx, q.ch, 540 + q.x, base + (1 - rise) * 330 + drop * 360, o, P.ink, 1, 1, (1 - Math.min(1, rise)) * 0.2);
    }
    ctx.restore();
  }

  /* =====================================================================
   * SCENE 5 — DROP (b16–20) pink, confetti, SQUASH / STRETCH
   * ===================================================================== */
  const CONF_COLS = [P.cobalt, P.butter, P.mint, P.tomato, P.cream, P.ink];
  const CONF = (() => {
    const r = V.rng(2026), out = [];
    for (let i = 0; i < 90; i++) {
      const a = r() * TAU, v = 900 + r() * 2300;
      out.push({ t0: at(16), x: 540, y: 830, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 450,
        type: Math.floor(r() * 5), c: CONF_COLS[Math.floor(r() * 6)], s: 14 + r() * 24,
        rot: r() * TAU, spin: (r() - 0.5) * 16, flip: 5 + r() * 9, ph: r() * TAU, front: r() < 0.4 });
    }
    for (let i = 0; i < 56; i++) {
      const side = i % 2 ? 1 : -1;
      out.push({ t0: at(18) + r() * 0.05, x: side < 0 ? 40 : 1040, y: 1980,
        vx: -side * (250 + r() * 950), vy: -(2500 + r() * 1600),
        type: Math.floor(r() * 5), c: CONF_COLS[Math.floor(r() * 6)], s: 14 + r() * 22,
        rot: r() * TAU, spin: (r() - 0.5) * 16, flip: 5 + r() * 9, ph: r() * TAU, front: r() < 0.4 });
    }
    return out;
  })();
  function confetti(ctx, t, front) {
    const k = 2.2, gr = 1700;
    for (const c of CONF) {
      if (c.front !== front) continue;
      const tau = t - c.t0;
      if (tau <= 0) continue;
      const e = Math.exp(-k * tau);
      const x = c.x + (c.vx * (1 - e)) / k;
      const y = c.y + (c.vy * (1 - e)) / k + gr * (tau / k - (1 - e) / (k * k));
      if (y > H + 80 || x < -80 || x > W + 80) continue;
      const s = c.s * Math.min(1, tau / 0.06) * (front ? 1.25 : 1);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(c.rot + c.spin * tau);
      ctx.fillStyle = c.c; ctx.strokeStyle = c.c;
      switch (c.type) {
        case 0: circle(ctx, 0, 0, s * 0.5); ctx.fill(); break;
        case 1: ctx.scale(Math.cos(c.ph + c.flip * tau), 1); ctx.fillRect(-s * 0.35, -s * 0.6, s * 0.7, s * 1.2); break;
        case 2: V.poly(ctx, 0, 0, s * 0.62, 3); ctx.fill(); break;
        case 3: circle(ctx, 0, 0, s * 0.42); ctx.lineWidth = s * 0.22; ctx.stroke(); break;
        default:
          ctx.beginPath();
          for (let q = 0; q <= 4; q++) ctx.lineTo(-s * 0.8 + q * s * 0.4, (q % 2 ? -1 : 1) * s * 0.22);
          ctx.lineWidth = s * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.restore();
    }
  }
  function S5(ctx, t) {
    const t0 = at(16), lt = t - t0;
    V.bg(ctx, P.pink);
    // sunburst
    const grow = sp(lt, 10, 5);
    ctx.save();
    ctx.translate(540, 960); ctx.rotate(lt * 0.35);
    ctx.fillStyle = '#ffa3d9';
    ctx.beginPath();
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = a0 + (TAU / n) * 0.5;
      ctx.moveTo(0, 0); ctx.arc(0, 0, 1500 * grow, a0, a1); ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    confetti(ctx, t, false);
    const sq = lt < 2 * SPB;
    const str = sq ? 'SQUASH' : 'STRETCH';
    const o = { family: 'Syne', weight: 800, size: 250 };
    o.size = fit(ctx, str, o, 880);
    const g = glyphs(ctx, str, o), base = 1075;
    for (const q of g) {
      let sx = 1, sy = 1, dy = 0;
      if (sq) {
        const tau = lt - q.i * 0.035, tl = 0.13;
        if (tau < 0) continue;
        dy = tau < tl ? -620 * (1 - Math.pow(tau / tl, 2)) : 0;
        const h = wob(tau - tl, 24, 7.5) + 0.85 * wob(lt - SPB - q.i * 0.025, 24, 7.5);
        const ex = E.inBack(prog(lt, 2 * SPB - 0.2 + q.i * 0.012, 2 * SPB - 0.03 + q.i * 0.012), 1.5);
        sy = (1 - 0.5 * h) * (1 - ex); sx = (1 + 0.3 * h) * (1 + 0.45 * ex);
        if (tau < tl) { sy = 1.25; sx = 0.85; }
      } else {
        const tau = lt - 2 * SPB - q.i * 0.03;
        const k = sp(tau, 15, 5.2) * (1 + 0.3 * wob(lt - 3 * SPB - q.i * 0.025, 22, 7));
        sy = 2.1 * k;
        sx = Math.min(1.45, 1 / Math.sqrt(Math.max(k, 0.45)));
      }
      letter(ctx, q.ch, 540 + q.x, base + dy, o, P.cobalt, sx, sy, 0, [P.ink, 10, 12]);
    }
    confetti(ctx, t, true);
  }

  /* =====================================================================
   * SCENE 6 — COLOUR (b20–24) one wipe per beat, word restyles each time
   * ===================================================================== */
  const S6L = [
    { bg: P.butter, pc: '#ffc623', pat: 'stripes', word: 'COLOUR', o: { family: 'Syne', weight: 800, size: 230 }, max: 880, fill: P.ink, hex: '#FFD23F' },
    { bg: P.cobalt, pc: '#3a5aff', pat: 'dots', word: 'colour', o: { family: 'Instrument Serif', weight: 400, style: 'italic', size: 360 }, max: 860, fill: P.cream, hex: '#2A4BFF' },
    { bg: P.mint, pc: '#33cf8b', pat: 'checker', word: 'COLOUR', o: { family: 'Anton', weight: 400, size: 330 }, max: 780, fill: P.ink, hex: '#3DDC97' },
    { bg: P.tomato, pc: '#ff6b4b', pat: 'rings', word: 'COLOUR', o: { family: 'Space Grotesk', weight: 700, size: 230 }, max: 860, fill: P.cream, hex: '#FF5A36', shadow: P.ink },
  ];
  function pattern(ctx, kind, col, lt) {
    ctx.save();
    ctx.fillStyle = col; ctx.strokeStyle = col;
    if (kind === 'stripes') {
      ctx.translate(540, 960); ctx.rotate(-PI / 4);
      const off = (lt * 170) % 140;
      ctx.beginPath();
      for (let x = -1540; x < 1540; x += 140) ctx.rect(x + off, -1500, 58, 3000);
      ctx.fill();
    } else if (kind === 'dots') {
      const sp2 = 96, off = (lt * 130) % (sp2 * 2);
      ctx.beginPath();
      for (let r = -2; r < 24; r++) for (let c = -1; c < 13; c++) {
        const x = c * sp2 + (r % 2 ? sp2 / 2 : 0), y = r * sp2 - off;
        ctx.moveTo(x + 13, y); ctx.arc(x, y, 13, 0, TAU);
      }
      ctx.fill();
    } else if (kind === 'checker') {
      const s = 135;
      ctx.translate(540, 960); ctx.rotate(0.18 + lt * 0.06);
      const off = (lt * 150) % (s * 2);
      ctx.beginPath();
      for (let r = -9; r < 9; r++) for (let c = -9; c < 10; c++) if ((r + c) % 2 === 0) ctx.rect(c * s + off - s, r * s, s, s);
      ctx.fill();
    } else {
      ctx.lineWidth = 42;
      for (let k = 0; k < 13; k++) {
        const r = (k * 120 + lt * 240) % (120 * 13);
        circle(ctx, 540, 900, r); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function S6(ctx, t, i) {
    const L = S6L[i], lt = t - at(20 + i);
    V.bg(ctx, L.bg);
    pattern(ctx, L.pat, L.pc, lt);
    const o = Object.assign({}, L.o);
    o.size = fit(ctx, L.word, o, L.max);
    const g = glyphs(ctx, L.word, o), base = 980;
    for (const q of g) {
      const s = 0.6 + 0.4 * sp(lt - 0.02 - q.i * 0.018, 18, 10);
      const dy = -18 * wob(lt - 0.02 - q.i * 0.018, 16, 6);
      letter(ctx, q.ch, 540 + q.x, base + dy, o, L.fill, s, s, (1 - s) * (q.i % 2 ? 0.6 : -0.6), L.shadow ? [L.shadow, 9, 11] : null);
    }
    // hex swatch label types on
    const n = Math.floor(clamp((lt - 0.08) / 0.022, 0, L.hex.length));
    if (n > 0) {
      V.text(ctx, L.hex.slice(0, n), 540, 1135, { size: 40, family: 'JetBrains Mono', weight: 500, tracking: 10, fill: V.rgba(L.fill === P.ink ? P.ink : P.cream, 0.9) });
    }
  }

  /* =====================================================================
   * SCENE 7 — SIGN-OFF (b24–32) ink → cobalt end card
   * ===================================================================== */
  const MK = { FY: 720, R: 80, xs: [318, 540, 764], sq: 152, triR: 108 };
  function S7(ctx, t) {
    V.bg(ctx, P.ink);
    const t28 = at(28), { FY, R } = MK;
    // cobalt iris from the mark
    const pr = prog(t, t28, t28 + 0.6);
    if (pr > 0) {
      const rr = 2100 * E.outExpo(pr);
      circle(ctx, 540, 640, rr); ctx.fillStyle = P.cobalt; ctx.fill();
      if (pr < 1) {
        circle(ctx, 540, 640, rr + 18); ctx.lineWidth = 34 * (1 - pr); ctx.strokeStyle = P.butter; ctx.stroke();
      }
    }
    // ---- ball: drop, hop, deep squash, split ----
    const tA = at(25), tB = at(26), tS = at(26.25), hold = 0.07;
    const anti = t < t28 ? E.inOutCubic(prog(t, at(27.4), t28)) : 0;
    const rel = (k) => {
      const d = t - t28 - k * 0.045;
      const jump = d > 0 && d < 0.32 ? 95 * 4 * (d / 0.32) * (1 - d / 0.32) : 0;
      return { jump, w: wob(d, 20, 7) * (d < 0.32 ? 1 : 0) + (d >= 0.32 ? -wob(d - 0.32, 24, 8) * 0.6 : 0) };
    };
    // centre circle
    {
      let yb = FY, sx = 1, sy = 1, st = 0;
      if (t < tA) {
        const u = prog(t, at(24), tA);
        yb = lerp(-60, FY, u * u);
        st = Math.min(0.5, (2 * u * (FY + 60)) / tA / 9000 * 1.8) * u;
      } else if (t < tA + hold) {
        const q = Math.sin(PI * (t - tA) / hold); sy = 1 - 0.38 * q; sx = 1 / Math.pow(sy, 0.85);
      } else if (t < tB) {
        const u = prog(t, tA + hold, tB);
        yb = FY - 4 * 300 * u * (1 - u);
        st = Math.abs(1 - 2 * u) * 0.32;
      } else if (t < tS) {
        const q = E.outCubic(prog(t, tB, tB + 0.06)); sy = 1 - 0.5 * q; sx = 1 / Math.pow(sy, 0.85);
      } else {
        const d = t - tS;
        yb = FY - (d < 0.3 ? 170 * 4 * (d / 0.3) * (1 - d / 0.3) : 0);
        const w = d < 0.3 ? 0.3 * (1 - d / 0.3) * (d < 0.08 ? 1 : 0.4) : -0.35 * wob(d - 0.3, 24, 8);
        sy = 1 + w; sx = 1 - w * 0.6;
      }
      const r1 = rel(1);
      yb -= r1.jump;
      sy *= (1 - 0.22 * anti) * (1 + 0.3 * r1.w); sx *= (1 + 0.12 * anti) * (1 - 0.15 * r1.w);
      ctx.save(); ctx.translate(540, yb); ctx.scale(sx, sy * (1 + st)); ctx.scale(1 / (1 + st * 0.6), 1);
      circle(ctx, 0, -R, R); ctx.fillStyle = P.butter; ctx.fill();
      ctx.restore();
    }
    // children: square (left) and triangle (right) squirt out on arcs
    const kids = [
      { k: 0, x1: MK.xs[0], land: at(26.75), arc: 330, spin: -PI, col: P.tomato },
      { k: 2, x1: MK.xs[2], land: at(27), arc: 420, spin: (4 * PI) / 3, col: P.mint },
    ];
    for (const c of kids) {
      if (t < tS) continue;
      const u = prog(t, tS, c.land);
      const x = lerp(540, c.x1, u);
      let yb = lerp(FY - R * 0.6, FY, u) - c.arc * 4 * u * (1 - u);
      const s = lerp(0.3, 1, E.outCubic(u));
      const rot = c.spin * (1 - E.outCubic(u));
      const lw = wob(t - c.land, 24, 8);
      let sy = u < 1 ? 1 + 0.2 * Math.sin(PI * u) : 1 - 0.34 * lw;
      let sx = u < 1 ? 1 - 0.1 * Math.sin(PI * u) : 1 + 0.22 * lw;
      const rr = rel(c.k);
      yb -= rr.jump;
      sy *= (1 - 0.22 * anti) * (1 + 0.3 * rr.w); sx *= (1 + 0.12 * anti) * (1 - 0.15 * rr.w);
      ctx.save();
      ctx.translate(x, yb); ctx.scale(sx * s, sy * s);
      ctx.fillStyle = c.col;
      if (c.k === 0) {
        const h = MK.sq / 2;
        ctx.translate(0, -h); ctx.rotate(rot);
        V.rrect(ctx, -h, -h, MK.sq, MK.sq, 12); ctx.fill();
      } else {
        const Rt = MK.triR;
        ctx.translate(0, -Rt / 2); ctx.rotate(rot);
        V.poly(ctx, 0, 0, Rt, 3); ctx.fill();
        ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.strokeStyle = c.col; ctx.stroke();
      }
      ctx.restore();
    }
    // floor line: draws out as the ball arrives, retracts into the anticipation
    const fl = E.outExpo(prog(t, at(24.3), at(25))) * (1 - E.inOutCubic(prog(t, at(27.3), at(28))));
    if (fl > 0.001) { ctx.fillStyle = V.rgba(P.cream, 0.9); ctx.fillRect(540 - 330 * fl, FY + 14, 660 * fl, 4); }
    // floor rings on the two bounces
    for (const ti of [tA, tB]) {
      const pr2 = prog(t, ti, ti + 0.45);
      if (pr2 <= 0 || pr2 >= 1) continue;
      const rx = 50 + 220 * E.outCubic(pr2);
      ctx.beginPath(); ctx.ellipse(540, FY, rx, rx * 0.24, 0, 0, TAU);
      ctx.lineWidth = 12 * (1 - pr2); ctx.strokeStyle = V.rgba(P.cream, 1 - pr2); ctx.stroke();
    }
    // flash ring at the split
    const fr = prog(t, tS, tS + 0.35);
    if (fr > 0 && fr < 1) {
      circle(ctx, 540, FY - R, R + 150 * E.outCubic(fr)); ctx.lineWidth = 12 * (1 - fr); ctx.strokeStyle = P.cream; ctx.stroke();
    }
    // ---- end card type ----
    const lt = t - t28;
    if (lt > 0) {
      const o = { family: 'Syne', weight: 800, size: 230 };
      o.size = fit(ctx, NAME, o, 850);
      const g = glyphs(ctx, NAME, o), base = 985;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 760, W, base + 40 - 760); ctx.clip();
      for (const q of g) {
        const rise = sp(lt - 0.06 - q.i * 0.035, 17, 7.5);
        letter(ctx, q.ch, 540 + q.x, base + (1 - rise) * (o.size * 1.1), o, P.cream);
      }
      ctx.restore();
      // butter rule draws out from centre
      const ru = E.outExpo(prog(lt, 0.22, 0.7));
      if (ru > 0) { ctx.fillStyle = P.butter; V.rrect(ctx, 540 - 70 * ru, 1040, 140 * ru, 8, 4); ctx.fill(); }
      // role
      const ro = { family: 'Space Grotesk', weight: 700, size: 54, tracking: 14 };
      const rg = glyphs(ctx, 'MOTION DESIGNER', ro);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 1080, W, 90); ctx.clip();
      for (const q of rg) {
        const rise = E.outCubic(prog(lt, 0.3 + q.i * 0.018, 0.62 + q.i * 0.018));
        letter(ctx, q.ch, 540 + q.x + 7, 1140 + (1 - rise) * 80, ro, P.butter);
      }
      ctx.restore();
      // URL pill springs in
      const po = sp(lt - 0.42, 18, 7.5);
      if (po > 0.001) {
        const url = 'crewupa.com', uo = { size: 36, family: 'JetBrains Mono', weight: 500, tracking: 2 };
        const pw = V.measure(ctx, url, uo) + 76, ph = 76;
        ctx.save(); ctx.translate(540, 1262); ctx.scale(po, po);
        V.rrect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fillStyle = P.cream; ctx.fill();
        V.text(ctx, url, 1, 2, Object.assign({ fill: P.cobalt }, uo));
        ctx.restore();
      }
      // small label types on
      const lab = 'SHOWREEL 2026', n = Math.floor(clamp((lt - 0.55) / 0.022, 0, lab.length));
      if (n > 0) {
        V.text(ctx, lab.slice(0, n), 540 + 5, 1420, { size: 28, family: 'JetBrains Mono', weight: 500, tracking: 10, fill: V.rgba(P.cream, 0.78) });
      }
      const dl = E.outCubic(prog(lt, 0.6, 1.0));
      if (dl > 0) {
        ctx.fillStyle = V.rgba(P.cream, 0.5);
        ctx.fillRect(540 - 250 - 80 * dl, 1419, 80 * dl, 2);
        ctx.fillRect(540 + 250, 1419, 80 * dl, 2);
      }
    }
  }

  /* =====================================================================
   * Timeline + transitions
   * ===================================================================== */
  const SCENES = [
    { b: 0, draw: S1 },
    { b: 4, draw: S2 },   // match-cut: the ball became the butter frame
    { b: 8, draw: S3 },   // match-cut: the star swallowed the frame
    { b: 12, draw: S4 },  // match-cut: mint cells flooded the grid
    { b: 16, draw: S5, tr: 'burst', dur: 0.42, ease: E.outQuart },
    { b: 20, draw: (c, t) => S6(c, t, 0), tr: 'clock', dur: 0.3, ease: E.outCubic },
    { b: 21, draw: (c, t) => S6(c, t, 1), tr: 'corner', dur: 0.34, ease: E.outCubic },
    { b: 22, draw: (c, t) => S6(c, t, 2), tr: 'bars', dur: 0.4, ease: (x) => x },
    { b: 23, draw: (c, t) => S6(c, t, 3), tr: 'diamond', dur: 0.34, ease: E.outCubic },
    { b: 24, draw: S7, tr: 'blinds', dur: 0.4, ease: (x) => x },
  ];
  function clipTr(ctx, type, p, lt) {
    ctx.beginPath();
    if (type === 'burst') ctx.arc(540, 830, 1300 * p, 0, TAU);
    else if (type === 'clock') { ctx.moveTo(540, 960); ctx.arc(540, 960, 1500, -PI / 2, -PI / 2 + TAU * p); ctx.closePath(); }
    else if (type === 'corner') ctx.arc(0, 1920, 2250 * p, 0, TAU);
    else if (type === 'bars') {
      for (let k = 0; k < 6; k++) {
        const pk = E.outCubic(clamp((lt - k * 0.035) / 0.22));
        ctx.rect(k * 180 - 0.5, 1920 * (1 - pk), 181, 1920 * pk + 1);
      }
    } else if (type === 'diamond') {
      const s = 1650 * p;
      ctx.save(); ctx.translate(540, 900); ctx.rotate(PI / 4 + (1 - p) * 0.6);
      ctx.rect(-s / 2, -s / 2, s, s); ctx.restore();
    } else if (type === 'blinds') {
      for (let k = 0; k < 8; k++) {
        const pk = E.outCubic(clamp((lt - k * 0.028) / 0.2));
        ctx.rect(0, k * 240 - 0.5, 1080, 240 * pk + 1);
      }
    }
    ctx.clip();
  }
  function accent(ctx, type, p) {
    if (type === 'burst' && p < 1) {
      circle(ctx, 540, 830, 1300 * p + 26);
      ctx.lineWidth = 46 * (1 - p); ctx.strokeStyle = P.cream; ctx.stroke();
    }
  }
  function drawAt(ctx, t) {
    const bb = t / SPB;
    let i = SCENES.length - 1;
    while (i > 0 && bb < SCENES[i].b) i--;
    const sc = SCENES[i], lt = t - at(sc.b);
    if (sc.tr && i > 0 && lt < sc.dur) {
      SCENES[i - 1].draw(ctx, t);
      const p = sc.ease(clamp(lt / sc.dur));
      ctx.save(); clipTr(ctx, sc.tr, p, lt); sc.draw(ctx, t); ctx.restore();
      accent(ctx, sc.tr, p);
    } else sc.draw(ctx, t);
  }

  V.reel({
    title: 'Shape Play', duration: 15, fps: 60, bpm: BPM,
    blur: { samples: 4, shutter: (t) => (t > at(16) && t < at(16) + 0.35 ? 0.25 : 0.5) },
    sidechain: 0.6,
    fadeOut: 0.5,
    draw(ctx, t) { drawAt(ctx, t); },
    post(ctx, t) { V.grain(ctx, t, 0.035); },

    /* ---------------- score: C major house, 128 BPM ---------------- */
    music(m) {
      const CH = { C: [60, 64, 67, 71], Am: [57, 60, 64, 67], F: [57, 60, 65, 69], G: [59, 62, 65, 67] };
      const ROOT = { C: 36, Am: 33, F: 41, G: 43 };
      const bars = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'];
      const chordAt = (b) => (b >= 26 && b < 28 ? 'G' : bars[Math.floor(b / 4)]);

      // ---- bar 1: hook stab, ball falls, three bounces climb the scale
      m.chord(0, 1.2, [...CH.C, 76], { pluck: 4, gain: 0.2, cutoff: 1500, env: 4500, verb: 0.55 });
      m.whoosh(0, 1, { dir: -1, gain: 0.16 });
      m.kick(0, { gain: 0.8, decay: 5 }); m.zap(0.05, { from: 1600, gain: 0.1 });
      [[1, 76], [2, 79], [3, 84]].forEach(([b, n]) => {
        m.kick(b, { gain: 0.95 });
        m.lead(b, 0.45, n, { gain: 0.13, decay: 7 });
        m.lead(b, 0.35, n - 12, { gain: 0.06, decay: 9 });
        m.bass(b, 0.4, 36, { type: 'pluck', cutoff: 380, env: 1800, gain: 0.34 });
      });
      for (let b = 0; b < 4; b++) m.hat(b + 0.5, { gain: 0.14 });
      m.riser(3, 4, { gain: 0.2, tone: 0.5 });
      m.whoosh(3.3, 0.7, { gain: 0.3 });

      // ---- bars 2-6: groove (bar 4 is the build)
      for (let b = 4; b < 24; b++) {
        const ch = chordAt(b), root = ROOT[ch];
        const build = b >= 12 && b < 16;
        if (!(b >= 14 && b < 16)) m.kick(b);
        if (b % 2 === 1 && !(b >= 14 && b < 16)) m.clap(b, { gain: 0.5 });
        m.hat(b + 0.5, { gain: build ? 0.1 : 0.16, open: !build && b % 2 === 0 });
        if (!build || b < 14) { m.hat(b + 0.25, { gain: 0.06, pan: -0.3 }); m.hat(b + 0.75, { gain: 0.06, pan: 0.35 }); }
        if (build) {
          const k = (b - 12) / 4;
          m.bass(b, 0.45, root, { type: 'saw', cutoff: 300 + 900 * k, env: 900, gain: 0.3 });
          m.bass(b + 0.5, 0.45, root, { type: 'saw', cutoff: 300 + 900 * k, env: 900, gain: 0.3 });
          m.chord(b + 0.5, 0.3, CH.G, { pluck: 10, gain: 0.1 + 0.05 * k, cutoff: 700 + 2500 * k, env: 2000 });
          [67, 71, 74, 77].forEach((n, i) => m.lead(b + i * 0.25, 0.2, n + (b >= 14 ? 12 : 0), { gain: 0.05 + 0.03 * k, decay: 10, pan: i % 2 ? 0.3 : -0.3 }));
        } else {
          m.bass(b, 0.35, root, { type: 'pluck', cutoff: 420, env: 2200, gain: 0.38 });
          m.bass(b + 0.5, 0.35, root + 12, { type: 'pluck', cutoff: 420, env: 2600, gain: 0.3 });
          m.chord(b + 0.5, 0.35, CH[ch], { pluck: 9, gain: 0.15, cutoff: 1300, env: 3800 });
        }
      }
      // shape pops (bar 2): one note per morph
      [[4, 69], [5, 72], [6, 76], [7, 79]].forEach(([b, n]) => { m.lead(b, 0.45, n, { gain: 0.13, decay: 6 }); m.tick(b, { freq: 3200, gain: 0.08 }); });
      m.whoosh(7.35, 0.65, { gain: 0.28 });
      m.riser(7, 8, { gain: 0.12, tone: 0.3 });
      // grid (bar 3): ripple arpeggio, waves, flood
      [65, 69, 72, 77, 81].forEach((n, i) => m.lead(8 + i * 0.25, 0.22, n, { gain: 0.1, decay: 9, pan: (i - 2) * 0.2 }));
      m.lead(9, 0.45, 84, { gain: 0.11, decay: 7, pan: -0.3 }); m.whoosh(9, 0.6, { gain: 0.14, dir: 1 });
      m.lead(10, 0.45, 81, { gain: 0.11, decay: 7, pan: 0.3 }); m.whoosh(10, 0.6, { gain: 0.14, dir: -1 });
      [77, 81, 84, 89].forEach((n, i) => m.lead(11 + i * 0.125, 0.2, n, { gain: 0.08, decay: 10 }));
      m.whoosh(10.8, 0.9, { gain: 0.25 });
      // build (bar 4): snare roll + riser into a beat of silence
      for (let s = 14; s < 15; s += 0.5) m.snare(s, { gain: 0.25 + (s - 14) * 0.2 });
      for (let s = 15; s < 15.5; s += 0.125) m.snare(s, { gain: 0.35 + (s - 15) * 0.6 });
      m.riser(12, 15.5, { gain: 0.32 });
      m.mute(15.5, 16);

      // ---- bar 5: DROP
      m.impact(16, { gain: 0.7 }); m.subdrop(16, { gain: 0.5 });
      m.chord(16, 1, [...CH.C, 76], { pluck: 3, gain: 0.2, cutoff: 2200, env: 5000, verb: 0.6 });
      [[16, 84, 0.5], [16.75, 81, 0.25], [17, 79, 0.5], [17.5, 76, 0.5], [18, 79, 0.5], [18.5, 84, 0.25], [18.75, 86, 0.5], [19.5, 88, 0.5]]
        .forEach(([b, n, l]) => { m.lead(b, l, n, { gain: 0.13, decay: 5 }); m.lead(b, l, n - 12, { gain: 0.05, decay: 6, pw: 0.25 }); });
      m.zap(18, { from: 1200, gain: 0.12 });
      // ---- bar 6: COLOUR wipes — a whoosh + note per wipe
      [[20, 76], [21, 81], [22, 84], [23, 88]].forEach(([b, n], i) => {
        m.whoosh(b - 0.2, 0.55, { gain: 0.22, dir: i % 2 ? -1 : 1 });
        m.lead(b, 0.45, n, { gain: 0.13, decay: 6 });
        m.tick(b + 0.1, { freq: 2600 + i * 300, gain: 0.07 });
      });
      m.whoosh(23.8, 0.5, { gain: 0.25 });

      // ---- bar 7: the ball returns (stripped back)
      m.chord(24, 2, [53, 57, 60, 65], { attack: 0.04, gain: 0.12, cutoff: 900, env: 900, verb: 0.6, release: 0.3 });
      m.chord(26, 2, [55, 59, 62, 65], { attack: 0.04, gain: 0.12, cutoff: 900, env: 1200, verb: 0.6, release: 0.3 });
      m.whoosh(24, 1, { dir: -1, gain: 0.14 });
      for (let b = 24; b < 28; b++) m.hat(b + 0.5, { gain: 0.1 });
      m.kick(25, { gain: 0.85 }); m.lead(25, 0.45, 72, { gain: 0.12, decay: 7 });
      m.bass(25, 0.4, 41, { type: 'pluck', cutoff: 400, env: 1800, gain: 0.32 });
      m.kick(26, { gain: 0.85 }); m.lead(26, 0.3, 74, { gain: 0.12, decay: 7 });
      m.bass(26, 0.4, 43, { type: 'pluck', cutoff: 400, env: 1800, gain: 0.32 });
      m.zap(26.25, { from: 2600, gain: 0.12 });
      m.lead(26.25, 0.3, 79, { gain: 0.1, decay: 8 });
      m.lead(26.75, 0.3, 83, { gain: 0.12, decay: 7, pan: -0.35 }); m.tick(26.75, { freq: 3000, gain: 0.07, pan: -0.35 });
      m.lead(27, 0.4, 86, { gain: 0.12, decay: 7, pan: 0.35 }); m.tick(27, { freq: 3400, gain: 0.07, pan: 0.35 });
      m.snare(27.5, { gain: 0.25 }); m.snare(27.75, { gain: 0.35 });
      m.riser(26.5, 28, { gain: 0.26 });

      // ---- bar 8: END CARD
      m.impact(28, { gain: 0.75 }); m.kick(28); m.subdrop(28, { gain: 0.45 });
      m.chord(28, 3.5, [48, 60, 64, 67, 72, 76], { gain: 0.24, cutoff: 2000, env: 3000, fdecay: 2, verb: 0.7, release: 0.8 });
      m.bass(28, 3, 36, { type: 'sub', gain: 0.35 });
      m.lead(28, 1.5, 84, { gain: 0.11, decay: 2.5 });
      m.lead(28.5, 1.5, 91, { gain: 0.08, decay: 2.5, pan: 0.3 });
      m.hat(28, { open: true, gain: 0.14 });
    },
  });
})();
