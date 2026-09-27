/* Reel 3 — "LIGHT · SPACE · TIME"
 * A single camera journey through light: a portal tunnel punches through an
 * extruded word, banks over a wireframe valley with type etched into the floor,
 * orbits a floating gimbal (dolly-zoom into silence), drops into warp speed and
 * finally decelerates into a particle cloud that assembles the name.
 * 160 BPM · 40 beats · 10 bars. World is y-up; everything is a pure function of t.
 */
(function () {
  const BPM = 160, SPB = 60 / BPM;
  const W = V.W, H = V.H, E = V.ease, TAU = Math.PI * 2;
  const NAME = ((globalThis.PARAMS && globalThis.PARAMS.name) || 'CREWUPA').toUpperCase();
  const BG = '#05060a', CY = '#3ef0ff', MG = '#ff2bd6', LM = '#c6ff3d', WH = '#fff4e6';
  const NEAR = 30;

  /* ---------------- small math ---------------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  const P = V.prog, sm = V.smooth, cl = V.clamp;
  /** Channel = base + sum of eased moves [b0, b1, delta, ease]. Overlapping moves blend smoothly. */
  const ch = (b, base, keys) => { let v = base; for (const k of keys) v += k[2] * (k[3] || E.inOutCubic)(P(b, k[0], k[1])); return v; };
  const hitB = (b, at, decayBeats = 0.4) => (b < at ? 0 : Math.exp(-(b - at) / decayBeats));

  /* ---------------- camera ---------------- */
  function look(pos, tgt, roll = 0, fov = 1000) {
    const f = norm(sub(tgt, pos));
    let r = norm(cross([0, 1, 0], f));
    let u = cross(f, r);
    if (roll) {
      const c = Math.cos(roll), s = Math.sin(roll);
      const r2 = add(mul(r, c), mul(u, s)), u2 = add(mul(u, c), mul(r, -s));
      r = r2; u = u2;
    }
    return { pos, f, r, u, fov, cx: W / 2, cy: H / 2 };
  }
  /** Camera looking down +z with a roll (for camera-space scenes). */
  const axisCam = (z, roll, fov, x = 0, y = 0) => look([x, y, z], [x, y, z + 1000], roll, fov);
  const toCam = (c, p) => {
    const dx = p[0] - c.pos[0], dy = p[1] - c.pos[1], dz = p[2] - c.pos[2];
    return [dx * c.r[0] + dy * c.r[1] + dz * c.r[2], dx * c.u[0] + dy * c.u[1] + dz * c.u[2], dx * c.f[0] + dy * c.f[1] + dz * c.f[2]];
  };
  const scr = (c, q) => { const s = c.fov / q[2]; return [c.cx + q[0] * s, c.cy - q[1] * s, s]; };
  /** Polyline of camera-space points with near-plane clipping. */
  function polyC(ctx, c, qs, closed) {
    let pen = false;
    const n = qs.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = qs[i], bq = qs[(i + 1) % n];
      if (a[2] < NEAR && bq[2] < NEAR) { pen = false; continue; }
      let ax = a[0], ay = a[1], az = a[2], bx = bq[0], by = bq[1], bz = bq[2], cut = false;
      if (az < NEAR) { const k = (NEAR - az) / (bz - az); ax += (bx - ax) * k; ay += (by - ay) * k; az = NEAR; pen = false; }
      if (bz < NEAR) { const k = (NEAR - bz) / (az - bz); bx += (ax - bx) * k; by += (ay - by) * k; bz = NEAR; cut = true; }
      const sa = c.fov / az, sb = c.fov / bz;
      if (!pen) ctx.moveTo(c.cx + ax * sa, c.cy - ay * sa);
      ctx.lineTo(c.cx + bx * sb, c.cy - by * sb);
      pen = !cut;
    }
  }
  /** Clip a camera-space polygon against the near plane (Sutherland–Hodgman). */
  function clipPoly(qs) {
    const out = [];
    for (let i = 0; i < qs.length; i++) {
      const a = qs[i], bq = qs[(i + 1) % qs.length];
      const ain = a[2] >= NEAR, bin = bq[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const k = (NEAR - a[2]) / (bq[2] - a[2]);
        out.push([a[0] + (bq[0] - a[0]) * k, a[1] + (bq[1] - a[1]) * k, NEAR]);
      }
    }
    return out;
  }
  const fovToMM = (fov) => (fov * 36) / W;

  /* ---------------- sprites (lazy, browser only) ---------------- */
  const mk = (w, h) => {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    c.width = w; c.height = h; return c;
  };
  const SPR = {};
  function spr(key, str, o) {
    if (SPR[key]) return SPR[key];
    const size = o.size, pad = Math.ceil(size * 0.12);
    const [, mx] = V.buffer('r3_measure', 8, 8);
    V.font(mx, size, o.family, o.weight || 400, o.style || 'normal');
    mx.letterSpacing = (o.tracking || 0) + 'px';
    const tw = mx.measureText(str).width;
    const w = Math.ceil(tw + pad * 2), h = Math.ceil(size * (o.lh || 1.2) + pad * 2);
    const c = mk(w, h), x = c.getContext('2d');
    V.font(x, size, o.family, o.weight || 400, o.style || 'normal');
    x.letterSpacing = (o.tracking || 0) + 'px';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.glow) { x.shadowColor = o.glow; x.shadowBlur = size * 0.08; }
    if (o.fill) { x.fillStyle = o.fill; x.fillText(str, w / 2, h / 2 + size * (o.dy || 0)); }
    x.shadowBlur = 0;
    if (o.stroke) { x.strokeStyle = o.stroke; x.lineWidth = o.lw || 3; x.lineJoin = 'round'; x.strokeText(str, w / 2, h / 2 + size * (o.dy || 0)); }
    return (SPR[key] = { c, w, h });
  }
  /**
   * Draw sprite as a 3D quad given camera-space top-left corner q0, and camera-space
   * edge vectors ex (full width) and ey (full height, downwards on the sprite).
   * Split into strips along ey for approximate perspective.
   */
  function quadC(ctx, c, img, q0, ex, ey, strips = 1, v0 = 0, v1 = 1) {
    const iw = img.w, ih = img.h;
    for (let k = 0; k < strips; k++) {
      const a0 = v0 + ((v1 - v0) * k) / strips, a1 = v0 + ((v1 - v0) * (k + 1)) / strips;
      const A = add(q0, mul(ey, a0)), B = add(A, ex), Cq = add(q0, mul(ey, a1));
      if (A[2] < NEAR || B[2] < NEAR || Cq[2] < NEAR) continue;
      const pa = scr(c, A), pb = scr(c, B), pc = scr(c, Cq);
      const sy0 = ih * a0, sh = ih * (a1 - a0);
      const ov = strips > 1 ? 0.6 : 0; // hide strip seams
      ctx.setTransform((pb[0] - pa[0]) / iw, (pb[1] - pa[1]) / iw, (pc[0] - pa[0]) / sh, (pc[1] - pa[1]) / sh, pa[0], pa[1]);
      ctx.drawImage(img.c, 0, sy0, iw, Math.min(sh + ov, ih - sy0), 0, 0, iw, Math.min(sh + ov, ih - sy0));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------------- extruded type ---------------- */
  const EXT = [WH, '#b6fbff', CY, '#6a7bff', MG, '#7a1470', '#2a0a3a'];
  function extSprites(word, family, size, tracking = 0) {
    return EXT.map((col, i) => spr(`ext_${word}_${i}_${family}`, word, { size, family, weight: family === 'Syne' ? 800 : 400, fill: col, tracking, glow: i === 0 ? CY : null }));
  }
  /**
   * Draw extruded sprite. centre (camera space), rotation basis from euler (rx, ry, rz)
   * applied in local space, then optional extra rotation fn. `depth` world units, K layers.
   */
  function drawExtruded(ctx, c, sprites, centre, width, rot, depth, K, alpha = 1, strips = 1) {
    const s0 = sprites[0];
    const h = (width * s0.h) / s0.w;
    const R = (p) => rotZ(rotY(rotX(p, rot[0]), rot[1]), rot[2]);
    const ex = R([width, 0, 0]), ey = R([0, -h, 0]), nz = R([0, 0, 1]);
    const tl = add(centre, R([-width / 2, h / 2, 0]));
    // view direction relative to the normal decides layer order (back-to-front)
    const toC = mul(add(tl, add(mul(ex, 0.5), mul(ey, 0.5))), -1);
    const frontFirst = dot(nz, toC) > 0; // camera on the +normal side → layer 0 is at back? keep: layer 0 = face at -normal
    ctx.globalAlpha = alpha;
    for (let j = 0; j < K; j++) {
      const k = frontFirst ? j : K - 1 - j; // draw far layers first
      const layer = frontFirst ? K - 1 - j : j;
      const off = mul(nz, (layer / (K - 1)) * depth);
      const idx = layer === 0 ? 0 : 1 + Math.min(EXT.length - 2, Math.floor(((layer - 1) / Math.max(1, K - 2)) * (EXT.length - 1)));
      quadC(ctx, c, sprites[idx], add(tl, off), ex, ey, strips);
      void k;
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- deterministic data ---------------- */
  const rnd = V.rng(3031);
  const STREAKS = Array.from({ length: 90 }, () => ({ u: rnd() * 4, z0: rnd() * 12000, sp: 1 + rnd() * 2.2, len: 300 + rnd() * 900, c: rnd() }));
  const SKY = Array.from({ length: 260 }, () => {
    const a = rnd() * TAU, e = 0.02 + Math.pow(rnd(), 1.6) * 1.2;
    return { d: [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)], s: 0.6 + rnd() * 1.8, tw: rnd() * 10 };
  });
  const DUST = Array.from({ length: 520 }, () => {
    const a = rnd() * TAU, u = rnd() * 2 - 1, r = 1100 + Math.pow(rnd(), 0.7) * 2400;
    const k = Math.sqrt(1 - u * u);
    return { p: [Math.cos(a) * k * r, u * r * 0.6, Math.sin(a) * k * r], c: rnd() };
  });
  const STARS = Array.from({ length: 1500 }, () => {
    const r = 140 + Math.pow(rnd(), 0.8) * 2600, a = rnd() * TAU;
    const cr = rnd();
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 1.3, z0: rnd() * 14000, g: cr < 0.5 ? 0 : cr < 0.68 ? 1 : cr < 0.96 ? 2 : 3 };
  });
  const STAR_COL = [CY, MG, WH, LM];
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    const e = [];
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (Math.abs(Math.hypot(...sub(v[i], v[j])) - 1.0515) < 0.01) e.push([i, j]);
    return { v, e };
  })();

  /* ================= SCENE 1 — TUNNEL (beats 0–8) ================= */
  const T_ZL = 8300; // plane of the word LIGHT
  const tunCamZ = (b) => ch(b, 0, [[0, 2.4, 4200, E.outExpo], [1.4, 6.6, 3000, E.inOutSine], [6.6, 8, 1250, E.inExpo]]);
  const tunTwist = (b) => ch(b, 0.1, [[0, 1.2, -0.1, E.outExpo], [1, 1.5, 0.05, E.outBack], [3, 3.5, -0.09, E.outBack], [5, 5.5, 0.07, E.outBack], [6.5, 7.5, -0.03, E.inOutCubic]]);
  const tunSpin = (b) => 0.05 * b + ch(b, 0, [[1, 1.5, 0.35, E.outBack], [3, 3.5, -0.5, E.outBack], [5, 5.5, 0.45, E.outBack], [7, 7.6, -0.3, E.outBack]]);
  const tunRoll = (b) => ch(b, 0.3, [[0, 1.6, -0.3, E.outExpo], [4, 5.2, -0.12, E.inOutCubic], [6.5, 8, 0.5, E.inCubic]]);
  const tunFov = (b) => ch(b, 900, [[0, 1.2, 100, E.outCubic], [6.6, 8, 260, E.inExpo]]);
  const TUN_KICKS = [0, 2.5, 4, 6.5];
  const RSX = 560, RSY = 990, RSTEP = 450;

  function sceneTunnel(ctx, b, t) {
    const camZ = tunCamZ(b);
    const c = axisCam(camZ, tunRoll(b), tunFov(b));
    const tw = tunTwist(b), spin = tunSpin(b);
    let lastK = 0; for (const k of TUN_KICKS) if (b >= k) lastK = k;
    const waveDz = (b - lastK) * SPB * 11000;
    const kp = hitB(b, lastK, 0.5) * (lastK === 0 ? 1.8 : 1);
    const intro = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'miter';
    const i0 = Math.ceil((camZ + NEAR + 5) / RSTEP), i1 = i0 + 30;
    const ringRot = (z) => spin + (z / RSTEP) * tw;
    const corner = (z, sx, sy) => { const r = ringRot(z); const cs = Math.cos(r), sn = Math.sin(r); return [sx * cs - sy * sn, sx * sn + sy * cs, z - camZ]; };
    const drawRing = (i) => {
      const z = i * RSTEP, dz = z - camZ;
      const fog = Math.pow(cl(1 - dz / 13500), 1.7) * sm(NEAR, 420, dz) * intro;
      if (fog <= 0.005) return;
      const boost = Math.exp(-Math.pow((dz - waveDz) / 700, 2)) * kp;
      const col = i % 9 === 4 ? LM : i % 3 === 0 ? MG : CY;
      const qs = [corner(z, -RSX, -RSY), corner(z, RSX, -RSY), corner(z, RSX, RSY), corner(z, -RSX, RSY)];
      const s = c.fov / dz;
      ctx.strokeStyle = col;
      ctx.globalAlpha = cl(fog * (0.75 + boost * 1.5));
      ctx.lineWidth = cl(4 * s, 1, 40) * (1 + boost * 1.2);
      ctx.beginPath(); polyC(ctx, c, qs, true); ctx.stroke();
      // inner hairline frame
      const q2 = [corner(z, -RSX * 0.93, -RSY * 0.96), corner(z, RSX * 0.93, -RSY * 0.96), corner(z, RSX * 0.93, RSY * 0.96), corner(z, -RSX * 0.93, RSY * 0.96)];
      ctx.globalAlpha = cl(fog * 0.35);
      ctx.lineWidth = cl(1.2 * s, 0.6, 8);
      ctx.beginPath(); polyC(ctx, c, q2, true); ctx.stroke();
    };
    // rails between corners
    ctx.strokeStyle = WH;
    for (let i = i0 - 1; i < i1; i++) {
      const z = i * RSTEP, dz = z - camZ;
      const fog = Math.pow(cl(1 - dz / 12000), 2) * intro;
      if (fog <= 0.01) continue;
      ctx.globalAlpha = fog * 0.28;
      ctx.lineWidth = cl(1.5 * c.fov / Math.max(dz, 200), 0.7, 5);
      ctx.beginPath();
      for (const [sx, sy] of [[-RSX, -RSY], [RSX, -RSY], [RSX, RSY], [-RSX, RSY]]) polyC(ctx, c, [corner(z, sx, sy), corner(z + RSTEP, sx, sy)], false);
      ctx.stroke();
    }
    // light traces running along the walls
    ctx.lineCap = 'round';
    for (const s of STREAKS) {
      const dz = ((((s.z0 - camZ * 0.6 - t * s.sp * 2600) % 12000) + 12000) % 12000) + 60;
      const u = s.u, side = Math.floor(u), f = u - side;
      let sx, sy;
      if (side === 0) { sx = -RSX + 2 * RSX * f; sy = -RSY; } else if (side === 1) { sx = RSX; sy = -RSY + 2 * RSY * f; } else if (side === 2) { sx = RSX - 2 * RSX * f; sy = RSY; } else { sx = -RSX; sy = RSY - 2 * RSY * f; }
      sx *= 0.97; sy *= 0.985;
      const z = camZ + dz;
      const a = corner(z, sx, sy), bq = corner(z + s.len, sx, sy);
      const fog = Math.pow(cl(1 - dz / 12000), 1.5) * sm(60, 500, dz) * intro;
      ctx.globalAlpha = fog * 0.9;
      ctx.strokeStyle = s.c < 0.7 ? WH : s.c < 0.9 ? CY : LM;
      ctx.lineWidth = cl(3 * c.fov / dz, 0.8, 14);
      ctx.beginPath(); polyC(ctx, c, [a, bq], false); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // far rings, word, near rings (painter's order around the word plane)
    const iw = Math.floor(T_ZL / RSTEP);
    for (let i = i1; i >= i0; i--) if (i > iw) drawRing(i);
    // --- LIGHT, extruded ---
    const dzw = T_ZL - camZ;
    if (dzw > NEAR - 400) {
      const sp = extSprites('LIGHT', 'Anton', 300, 10);
      const k = E.outCubic(P(b, 2, 7.2));
      const rot = [-0.18 * (1 - k) + 0.02 * Math.sin(b * 1.3), 0.62 * (1 - k) - 0.1 + 0.04 * Math.sin(b * 0.9), 0.05 * (1 - k)];
      const fog = Math.pow(cl(1 - dzw / 9000), 1.4);
      ctx.globalCompositeOperation = 'source-over';
      drawExtruded(ctx, c, sp, toCam(c, [0, 0, T_ZL]), 900, rot, 170, 18, fog);
      ctx.globalCompositeOperation = 'lighter';
    }
    for (let i = Math.min(iw, i1); i >= i0; i--) drawRing(i);
    // frame-0 hook: a burst of light at the vanishing point
    const hb = hitB(b, 0, 0.45);
    if (hb > 0.01) {
      const vp = scr(c, [0, 0, 6000]);
      const g = ctx.createRadialGradient(vp[0], vp[1], 0, vp[0], vp[1], 700);
      g.addColorStop(0, `rgba(255,255,255,${hb})`); g.addColorStop(0.12, `rgba(62,240,255,${0.6 * hb})`); g.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const lw = 900 * hb + 60;
      const g2 = ctx.createLinearGradient(vp[0] - lw * 1.4, 0, vp[0] + lw * 1.4, 0);
      g2.addColorStop(0, 'rgba(62,240,255,0)'); g2.addColorStop(0.5, `rgba(230,255,255,${0.9 * hb})`); g2.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.fillStyle = g2; ctx.fillRect(vp[0] - lw * 1.4, vp[1] - 4, lw * 2.8, 8);
    }
    // punch-through flash ramp
    const fl = Math.pow(P(b, 7.55, 8), 3);
    if (fl > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fl; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ================= SCENE 2+3 — VALLEY & GIMBAL (beats 8–23.5) ================= */
  const G = [0, 1650, 17100];
  const SPACE_Z = 4900, SPACE_W = 2500;
  const wX = (b) => ch(b, 0, [[12.3, 13.5, -380, E.inOutCubic], [13.3, 14.7, 560, E.inOutCubic], [14.5, 16, -180, E.inOutCubic]]);
  const wY = (b) => ch(b, 1700, [[8, 10, -180, E.outCubic], [10.2, 12.4, -1340, E.inOutCubic], [13.1, 15.9, 650, E.inOutCubic]]);
  const wZ = (b) => ch(b, 0, [[8, 10.2, 3600, E.outExpo], [9.9, 12.9, 4400, E.inOutCubic], [12.5, 16, 6700, E.outQuart]]);
  const wPitch = (b) => ch(b, -760, [[10.2, 12.4, 700, E.inOutCubic], [13.1, 15.6, 120, E.inOutCubic]]);
  const orbR = (b) => ch(b, G[2] - wZ(16), [[20, 23.35, -1560, E.inOutCubic]]);
  const orbYaw = (b) => ch(b, 0, [[16, 23.5, -1.0, E.inOutSine]]);
  const orbElev = (b) => ch(b, 1000 - wY(16) === 0 ? 0 : wY(16) - G[1], [[16, 20.5, 560, E.inOutCubic], [20, 23.35, -300, E.inOutCubic]]);
  const WFOV = 950;
  function worldCam(b) {
    let pos, tgt, roll, fov = WFOV;
    if (b < 16) {
      const x = wX(b), y = wY(b), z = wZ(b);
      pos = [x, y, z];
      const ahead = [x * 0.6, y + wPitch(b), z + 1000];
      const k = E.inOutCubic(P(b, 13.4, 15.8));
      const toG = add(pos, mul(norm(sub(G, pos)), 1000));
      tgt = [V.lerp(ahead[0], toG[0], k), V.lerp(ahead[1], toG[1], k), V.lerp(ahead[2], toG[2], k)];
      const vx = (wX(b + 0.02) - wX(b - 0.02)) / 0.04;
      roll = ch(b, 1.5, [[8, 9.7, -1.5, E.outExpo]]) - vx * 0.00055;
    } else {
      const R = orbR(b), yaw = orbYaw(b);
      pos = [G[0] + R * Math.sin(yaw), G[1] + orbElev(b), G[2] - R * Math.cos(yaw)];
      tgt = G;
      roll = 0.06 * Math.sin((b - 16) * 0.6) * sm(16, 18, b) - 0.1 * E.inOutCubic(P(b, 20, 23.4));
      if (b >= 20) fov = (WFOV * R) / orbR(19.999);
    }
    // micro shake on snares
    const sh = hitB(b, 18, 0.35) + hitB(b, 22, 0.35) + hitB(b, 10, 0.3) + hitB(b, 14, 0.3);
    if (sh > 0.001) { const s = V.shake(b * SPB, 14 * sh, 22, 5); pos = [pos[0] + s[0], pos[1] + s[1], pos[2]]; roll += s[2] * 3; }
    return look(pos, tgt, roll, fov);
  }

  const TSTEP = 160, TN = 30; // grid ±TN steps around patch centre
  const HCACHE = new Map();
  function th(ix, iz) {
    const key = ix * 131071 + iz;
    let h = HCACHE.get(key);
    if (h !== undefined) return h;
    const x = ix * TSTEP, z = iz * TSTEP;
    const valley = sm(650, 2700, Math.abs(x));
    let n = V.fbm(x * 0.00042 + 11.3, z * 0.00042 + 3.7, 3) * 0.5 + 0.5;
    n = n * n * 1.7 + 0.06 * V.noise2(x * 0.003, z * 0.003);
    h = Math.max(0, valley * n * 1250);
    HCACHE.set(key, h);
    return h;
  }
  const TX = new Float32Array((2 * TN + 1) * (2 * TN + 1) * 3);

  function drawTerrain(ctx, c, b, alphaK) {
    // patch centre ahead of camera, snapped to the grid so vertices never swim
    const fxz = norm([c.f[0], 0, c.f[2]]);
    const cx = Math.round((c.pos[0] + fxz[0] * 3000) / TSTEP), cz = Math.round((c.pos[2] + fxz[2] * 3000) / TSTEP);
    const N1 = 2 * TN + 1;
    for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) {
      const ix = cx - TN + i, iz = cz - TN + j;
      const q = toCam(c, [ix * TSTEP, th(ix, iz), iz * TSTEP]);
      const o = (j * N1 + i) * 3; TX[o] = q[0]; TX[o + 1] = q[1]; TX[o + 2] = q[2];
    }
    const V3 = (i, j) => { const o = (j * N1 + i) * 3; return [TX[o], TX[o + 1], TX[o + 2]]; };
    // painter's order: strips perpendicular to the dominant view axis, far → near
    const rows = Math.abs(fxz[2]) >= Math.abs(fxz[0]);
    const dirSign = rows ? Math.sign(fxz[2]) || 1 : Math.sign(fxz[0]) || 1;
    const get = (s, a) => (rows ? V3(a, s) : V3(s, a)); // s = strip index, a = along strip
    const pulse = 1 + 0.35 * V.clock(BPM).pulse(b * SPB, 1, 0.12);
    const colAlong = rows ? MG : CY, colCross = rows ? CY : MG;
    for (let k = 0; k < N1 - 1; k++) {
      const s = dirSign > 0 ? N1 - 1 - k : k; // far strip first
      const s2 = dirSign > 0 ? s - 1 : s + 1; // its nearer neighbour
      const A = [], Bq = [];
      for (let a = 0; a < N1; a++) { A.push(get(s, a)); Bq.push(get(s2, a)); }
      const mid = A[TN];
      const dist = Math.hypot(mid[0], mid[2]);
      const fog = Math.pow(cl(1 - dist / 7800), 1.3) * sm(-200, 300, mid[2] + 600) * alphaK;
      // occluding fill of the strip (hidden line removal)
      // (a strip crossing the near plane is non-planar, so clip it cell by cell)
      let crosses = false;
      for (let a = 0; a < N1 && !crosses; a++) if (A[a][2] < NEAR || Bq[a][2] < NEAR) crosses = true;
      const polys = [];
      if (!crosses) polys.push(A.concat(Bq.slice().reverse()));
      else for (let a = 0; a < N1 - 1; a++) { const cp = clipPoly([A[a], A[a + 1], Bq[a + 1], Bq[a]]); if (cp.length > 2) polys.push(cp); }
      if (polys.length) {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = BG;
        ctx.beginPath();
        for (const poly of polys) {
          for (let i = 0; i < poly.length; i++) { const p = scr(c, poly[i]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
          ctx.closePath();
        }
        ctx.fill();
      }
      if (fog < 0.01) continue;
      ctx.globalCompositeOperation = 'lighter';
      const lw = cl(2.2 * c.fov / Math.max(mid[2], 300), 0.8, 4);
      ctx.lineWidth = lw;
      ctx.strokeStyle = colAlong; ctx.globalAlpha = cl(fog * 0.85 * pulse);
      ctx.beginPath(); polyC(ctx, c, A, false); ctx.stroke();
      ctx.strokeStyle = colCross; ctx.globalAlpha = cl(fog * 0.5 * pulse);
      ctx.beginPath();
      for (let a = 0; a < N1; a++) polyC(ctx, c, [A[a], Bq[a]], false);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function drawSky(ctx, c, b, alphaK) {
    const fxz = norm([c.f[0], 0, c.f[2]]);
    const rxz = [fxz[2], 0, -fxz[0]];
    const far = 1e6;
    const h1 = scr(c, toCam(c, add(c.pos, [fxz[0] * far, -c.pos[1], fxz[2] * far])));
    const h2 = scr(c, toCam(c, add(c.pos, [fxz[0] * far + rxz[0] * 2e5, -c.pos[1], fxz[2] * far + rxz[2] * 2e5])));
    const ang = Math.atan2(h2[1] - h1[1], h2[0] - h1[0]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(h1[0], h1[1]); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -1300, 0, 200);
    g.addColorStop(0, 'rgba(20,10,60,0)');
    g.addColorStop(0.7, `rgba(70,20,110,${0.22 * alphaK})`);
    g.addColorStop(0.9, `rgba(255,60,190,${0.32 * alphaK})`);
    g.addColorStop(0.95, `rgba(255,220,240,${0.3 * alphaK})`);
    g.addColorStop(1, 'rgba(60,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-3000, -1300, 6000, 1500);
    ctx.restore();
    // stars (direction only → infinitely far)
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = WH;
    for (const s of SKY) {
      const q = toCam(c, add(c.pos, mul(s.d, 50000)));
      if (q[2] < 100) continue;
      const p = scr(c, q);
      if (p[0] < -10 || p[0] > W + 10 || p[1] < -10 || p[1] > H + 10) continue;
      ctx.globalAlpha = alphaK * (0.35 + 0.35 * Math.sin(b * 2 + s.tw));
      ctx.fillRect(p[0], p[1], s.s, s.s);
    }
    // halo sun on the horizon, cut by slits
    const sunC = toCam(c, [0, 900, G[2] + 60000]);
    if (sunC[2] > 1000) {
      const p = scr(c, sunC), r = 9500 * p[2];
      ctx.globalAlpha = alphaK * 0.85;
      const rg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 1.9);
      rg.addColorStop(0, 'rgba(255,200,220,0.3)');
      rg.addColorStop(0.45, 'rgba(255,43,214,0.16)');
      rg.addColorStop(1, 'rgba(255,43,214,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.9, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(p[0], p[1]); ctx.rotate(ang);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      const lg = ctx.createLinearGradient(0, -r, 0, r);
      lg.addColorStop(0, 'rgba(255,214,190,0.62)'); lg.addColorStop(0.5, 'rgba(255,70,200,0.5)'); lg.addColorStop(1, 'rgba(120,20,160,0.1)');
      ctx.fillStyle = lg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = BG;
      for (let i = 0; i < 9; i++) { const y = r * (0.05 + i * 0.11), hh = r * (0.012 + i * 0.009); ctx.fillRect(-r, y, 2 * r, hh); }
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = WH; ctx.globalAlpha = 0.5 * alphaK;
      ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.22, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function drawSpace(ctx, c, b) {
    const sw = spr('space_fill', 'SPACE', { size: 320, family: 'Anton', fill: 'rgba(62,240,255,0.55)', tracking: 18 });
    const so = spr('space_line', 'SPACE', { size: 320, family: 'Anton', stroke: WH, lw: 5, tracking: 18 });
    const h = (SPACE_W * sw.h) / sw.w;
    // lying flat on the valley floor; the word's "up" points along +z
    const tl = toCam(c, [-SPACE_W / 2, 3, SPACE_Z + h]);
    const tr = toCam(c, [SPACE_W / 2, 3, SPACE_Z + h]);
    const bl = toCam(c, [-SPACE_W / 2, 3, SPACE_Z]);
    const ex = sub(tr, tl), ey = sub(bl, tl);
    const sweep = E.inOutCubic(P(b, 8.4, 10.6)); // reveal from near edge to far edge
    if (sweep <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    const v0 = 1 - sweep;
    ctx.globalAlpha = 0.9; quadC(ctx, c, sw, tl, ex, ey, 22, v0, 1);
    ctx.globalAlpha = 1; quadC(ctx, c, so, tl, ex, ey, 22, v0, 1);
    // scanning beam at the reveal front
    if (sweep < 1) {
      const z = SPACE_Z + h * sweep;
      ctx.strokeStyle = LM; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); polyC(ctx, c, [toCam(c, [-3200, 4, z]), toCam(c, [3200, 4, z])], false); ctx.stroke();
      ctx.lineWidth = 16; ctx.globalAlpha = 0.18;
      ctx.beginPath(); polyC(ctx, c, [toCam(c, [-3200, 4, z]), toCam(c, [3200, 4, z])], false); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function drawRunwayLights(ctx, c, b) {
    ctx.globalCompositeOperation = 'lighter';
    const z0 = Math.floor(c.pos[2] / 500) * 500;
    for (let k = -2; k < 26; k++) {
      const z = z0 + k * 500;
      const chase = Math.exp(-Math.pow(V.fract(b / 2 - z / 9000) - 0.5, 2) * 60);
      for (const x of [-620, 620]) {
        const q = toCam(c, [x, 8, z]);
        if (q[2] < 80) continue;
        const p = scr(c, q), r = cl(10 * p[2], 1, 16);
        const fog = cl(1 - q[2] / 9000);
        ctx.globalAlpha = fog * (0.35 + 0.65 * chase);
        ctx.fillStyle = chase > 0.5 ? LM : WH;
        ctx.fillRect(p[0] - r / 2, p[1] - r / 2, r, r);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /** Gimbal ring normals (animated) — snap to face the camera before the drop. */
  function ringFrames(b, camPos) {
    const toC = norm(sub(camPos, G));
    const kick = (at) => E.outBack(P(b, at, at + 0.6));
    const a0 = 0.45 * b + 1.2 * kick(18) + 1.0 * kick(22);
    const a1 = -0.32 * b + 1.4 * kick(20) + 0.9 * kick(22);
    const a2 = 0.2 * b - 1.3 * kick(18);
    const ns = [
      [Math.sin(a0), 0.25, Math.cos(a0)],
      [0.2, Math.sin(a1), Math.cos(a1)],
      rotZ([Math.sin(a2) * 0.7, Math.cos(a2), 0.5], 0.4),
    ].map(norm);
    const k = E.inOutExpo(P(b, 22.7, 23.3));
    return ns.map((n, i) => {
      const m = norm([V.lerp(n[0], toC[0], k), V.lerp(n[1], toC[1], k), V.lerp(n[2], toC[2], k)]);
      const ref = Math.abs(m[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = norm(cross(ref, m)), v = cross(m, u);
      return { n: m, u, v, spin: b * (0.3 + i * 0.25) * (i % 2 ? -1 : 1) };
    });
  }
  const RINGS = [520, 650, 790];

  function drawGimbal(ctx, c, b, vis) {
    if (vis <= 0.01) return;
    const frames = ringFrames(b, c.pos);
    const gq = toCam(c, G);
    ctx.globalCompositeOperation = 'lighter';
    // dust shell (parallax)
    const dr = b * 0.05;
    for (const d of DUST) {
      const p = rotY(d.p, dr);
      const q = toCam(c, add(G, p));
      if (q[2] < 60) continue;
      const s = scr(c, q), r = cl(5 * s[2], 0.8, 6);
      ctx.globalAlpha = vis * cl(1 - q[2] / 8000) * 0.8;
      ctx.fillStyle = d.c < 0.6 ? WH : d.c < 0.85 ? CY : MG;
      ctx.fillRect(s[0], s[1], r, r);
    }
    // TIME ring text (far side first)
    const tsp = {};
    const chars = 'TIME · TIME · TIME · TIME · ';
    const RT = 980, CH = 190, spinT = -0.18 * b - 0.9;
    const items = [];
    const nC = chars.length;
    for (let i = 0; i < nC; i++) {
      const chr = chars[i];
      if (chr === ' ') continue;
      const a = spinT + (i / nC) * TAU;
      const pos = add(G, [Math.sin(a) * RT, -60, -Math.cos(a) * RT]);
      const tang = [Math.cos(a), 0, Math.sin(a)];
      const out = [Math.sin(a), 0, -Math.cos(a)];
      const toC = norm(sub(c.pos, pos));
      items.push({ chr, pos, tang, facing: dot(out, toC) });
    }
    const drawChars = (front) => {
      for (const it of items) {
        if ((it.facing > 0) !== front) continue;
        const key = it.chr === '·' ? 'dot' : it.chr;
        const sp = tsp[key] || (tsp[key] = spr('time_' + key, it.chr, { size: 200, family: 'Syne', weight: 800, fill: front ? WH : MG }));
        const spb = spr('timeb_' + key, it.chr, { size: 200, family: 'Syne', weight: 800, fill: MG });
        const im = front ? sp : spb;
        const wdt = (CH * im.w) / im.h;
        const tl = add(add(it.pos, mul(it.tang, -wdt / 2)), [0, CH / 2, 0]);
        const q0 = toCam(c, tl), ex = sub(toCam(c, add(tl, mul(it.tang, wdt))), q0), ey = sub(toCam(c, add(tl, [0, -CH, 0])), q0);
        ctx.globalAlpha = vis * (front ? 0.95 : 0.22);
        quadC(ctx, c, im, q0, ex, ey, 1);
      }
    };
    drawChars(false);
    // rings with ticks
    frames.forEach((fr, ri) => {
      const R = RINGS[ri], n = 120;
      const qs = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + fr.spin;
        qs.push(toCam(c, add(G, add(mul(fr.u, Math.cos(a) * R), mul(fr.v, Math.sin(a) * R)))));
      }
      const col = ri === 0 ? CY : ri === 1 ? MG : WH;
      const s = c.fov / Math.max(gq[2], 200);
      ctx.strokeStyle = col; ctx.globalAlpha = vis * 0.95; ctx.lineWidth = cl(7 * s, 1, 10);
      ctx.beginPath(); polyC(ctx, c, qs, true); ctx.stroke();
      // ticks
      ctx.lineWidth = cl(3 * s, 0.8, 5); ctx.globalAlpha = vis * 0.7;
      ctx.beginPath();
      for (let i = 0; i < n; i += 3) {
        const a = (i / n) * TAU + fr.spin, L = i % 15 === 0 ? 70 : 30;
        const dir = add(mul(fr.u, Math.cos(a)), mul(fr.v, Math.sin(a)));
        polyC(ctx, c, [toCam(c, add(G, mul(dir, R + 12))), toCam(c, add(G, mul(dir, R + 12 + L)))], false);
      }
      ctx.stroke();
    });
    // icosahedron core
    const cr = 210 * (1 + 0.12 * hitB(b, 18, 0.3) + 0.12 * hitB(b, 22, 0.3));
    const rv = ICO.v.map((v) => toCam(c, add(G, mul(rotX(rotY(v, b * 0.7), b * 0.4), cr))));
    ctx.strokeStyle = WH; ctx.globalAlpha = vis * 0.85; ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [i, j] of ICO.e) polyC(ctx, c, [rv[i], rv[j]], false);
    ctx.stroke();
    ctx.fillStyle = LM;
    for (const q of rv) { if (q[2] < NEAR) continue; const p = scr(c, q); ctx.globalAlpha = vis; ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6); }
    if (gq[2] > NEAR) {
      const p = scr(c, gq), r = 260 * p[2];
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.25, 'rgba(62,240,255,0.35)'); g.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.globalAlpha = vis; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
    }
    drawChars(true);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function sceneWorld(ctx, b, t) {
    const c = worldCam(b);
    const skyK = sm(8, 8.6, b) * (1 - 0.6 * sm(21, 23.4, b));
    drawSky(ctx, c, b, skyK);
    drawTerrain(ctx, c, b, sm(8, 8.5, b));
    drawRunwayLights(ctx, c, b);
    drawSpace(ctx, c, b);
    drawGimbal(ctx, c, b, sm(12.5, 15.5, b));
    // cut-in flash from the tunnel
    const fl = 1 - E.outCubic(P(b, 8, 8.3));
    if (fl > 0) { ctx.globalAlpha = fl; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  /* ================= GAP (23.5–24): silence before the drop ================= */
  function sceneGap(ctx, b) {
    const k = P(b, 23.5, 24);
    ctx.globalCompositeOperation = 'lighter';
    // collapsed target: concentric rings shrinking to a point, a hairline stretching wide
    const r = 90 * (1 - E.outExpo(k)) + 3;
    ctx.strokeStyle = WH; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.8 - i * 0.2; ctx.beginPath(); ctx.arc(W / 2, H / 2, r * (1 + i * 0.35), 0, TAU); ctx.stroke(); }
    const hw = 20 + 520 * E.inExpo(k);
    ctx.globalAlpha = 0.9; ctx.fillStyle = WH; ctx.fillRect(W / 2 - hw, H / 2 - 1, hw * 2, 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* ================= SCENE 4 — WARP (beats 24–32) ================= */
  // velocity profile in world units per beat; distance is integrated once into a table.
  const warpVel = (b) => {
    if (b < 24) return 0;
    let v = 9500 + 9000 * Math.exp(-(b - 24) / 0.5); // slam
    v += 9000 * sm(27.6, 28.2, b) * (1 - sm(30.6, 31.2, b)); // gates surge
    v *= 1 - 0.965 * E.inOutCubic(P(b, 31, 32.2)); // brake
    v *= 1 - E.outCubic(P(b, 32.2, 34.5));
    return v;
  };
  let DTAB = null;
  const DRES = 240;
  const warpD = (b) => {
    if (!DTAB) {
      DTAB = new Float64Array(16 * DRES + 2);
      let acc = 0;
      for (let i = 1; i < DTAB.length; i++) { const bb = 24 + (i - 0.5) / DRES; acc += warpVel(bb) / DRES; DTAB[i] = acc; }
    }
    const x = cl((b - 24) * DRES, 0, DTAB.length - 2), i = Math.floor(x), f = x - i;
    return DTAB[i] * (1 - f) + DTAB[i + 1] * f;
  };
  const warpRoll = (b) => 0.12 * (b - 24) + ch(b, 0, [[24, 25, -0.4, E.outExpo], [30, 31.1, TAU, E.inOutCubic]]);
  const warpFov = (b) => ch(b, 700, [[24, 24.8, 300, E.outExpo], [31, 32.2, 100, E.inOutCubic]]);
  const GATES = [28, 28.5, 29, 29.5, 30, 30.5];

  function drawStars(ctx, c, b, D, vel, alphaK) {
    const ZR = 14000;
    const L = cl(vel * 0.055, 0, 3600);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const bands = [[0, 2200, 3, 0.95], [2200, 6500, 1.8, 0.55], [6500, ZR + 100, 1.1, 0.28]];
    for (let g = 0; g < 4; g++) {
      for (const [z0, z1, lw, al] of bands) {
        ctx.strokeStyle = STAR_COL[g]; ctx.lineWidth = lw; ctx.globalAlpha = al * alphaK * (g === 3 ? 0.8 : 1);
        ctx.beginPath();
        for (const s of STARS) {
          if (s.g !== g) continue;
          const dz = ((((s.z0 - D) % ZR) + ZR) % ZR) + 40;
          if (dz < z0 || dz >= z1) continue;
          const a = toCam(c, [s.x, s.y, c.pos[2] + dz]), bq = toCam(c, [s.x, s.y, c.pos[2] + dz + L + 2]);
          polyC(ctx, c, [a, bq], false);
        }
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function sceneWarp(ctx, b, t) {
    const D = warpD(b), vel = warpVel(b);
    const shk = hitB(b, 24, 0.5);
    const s = V.shake(t, 18 * shk, 25, 9);
    const c = axisCam(D + 0, warpRoll(b) + s[2] * 4, warpFov(b), s[0], s[1]);
    // tunnel-glow core
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
    const hue = sm(26, 30, b);
    g.addColorStop(0, V.mix(CY, '#7a5cff', hue, 0.2 * sm(24, 24.5, b) * (1 - 0.7 * sm(26, 28, b)) * (1 - sm(31.5, 33, b))));
    g.addColorStop(1, 'rgba(5,6,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, c, b, D, vel, (1 - 0.35 * sm(27.6, 28.2, b) * (1 - sm(30.8, 31.4, b))) * (1 - sm(32.6, 33.6, b)));
    // portal gates the camera threads on each hit
    ctx.globalCompositeOperation = 'lighter';
    GATES.forEach((gb, gi) => {
      const gz = warpD(gb) + 0;
      const dz = gz - D;
      if (dz < -200 || dz > 16000) return;
      const rot = gi * 0.55 + 0.4;
      const hw = 620, hh = 1080;
      const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const r = rotZ([x, y, 0], rot); return toCam(c, [r[0], r[1], gz]); });
      const inner = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const r = rotZ([x * 0.9, y * 0.94, 0], rot); return toCam(c, [r[0], r[1], gz + 80]); });
      const fog = Math.pow(cl(1 - dz / 16000), 1.1) * sm(0, 600, dz + 300);
      ctx.strokeStyle = gi === 4 ? LM : gi % 2 ? MG : CY; ctx.globalAlpha = fog;
      ctx.lineWidth = cl(26 * c.fov / Math.max(dz, 60), 3, 90);
      ctx.globalAlpha = fog * 0.25; ctx.beginPath(); polyC(ctx, c, corners, true); ctx.stroke();
      ctx.lineWidth = cl(12 * c.fov / Math.max(dz, 60), 2.5, 50); ctx.globalAlpha = cl(fog * 1.3);
      ctx.beginPath(); polyC(ctx, c, corners, true); ctx.stroke();
      ctx.strokeStyle = WH; ctx.globalAlpha = fog * 0.6; ctx.lineWidth = cl(2 * c.fov / Math.max(dz, 60), 1, 16);
      ctx.beginPath(); polyC(ctx, c, inner, true); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // light at the end of the warp: a hot core pulsing on every gate / snare
    let pul = 0;
    for (const gb of GATES) pul += hitB(b, gb, 0.25);
    for (const sb of [25, 27]) pul += hitB(b, sb, 0.3);
    const ck = sm(25.5, 26.5, b) * (1 - sm(31, 31.8, b));
    if (ck > 0.01) {
      const vp = scr(c, toCam(c, [0, 0, D + 20000]));
      const r = 150 + 170 * pul;
      const g2 = ctx.createRadialGradient(vp[0], vp[1], 0, vp[0], vp[1], r);
      g2.addColorStop(0, `rgba(255,255,255,${ck * (0.7 + 0.3 * cl(pul))})`); g2.addColorStop(0.2, `rgba(62,240,255,${0.32 * ck})`); g2.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g2; ctx.fillRect(vp[0] - r, vp[1] - r, 2 * r, 2 * r);
      ctx.globalAlpha = ck * (0.5 + 0.5 * cl(pul)); ctx.fillStyle = '#e8ffff';
      ctx.fillRect(0, vp[1] - 1.5, W, 3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // MOTION — extruded letters that slam in, hold, then peel past the camera
    if (b < 28) drawMotion(ctx, b);
  }

  function drawMotion(ctx, b) {
    const c = axisCam(0, 0.06 * Math.sin(b * 1.7) + ch(b, -0.25, [[24, 25, 0.25, E.outExpo]]), 1000);
    const word = 'MOTION', FAM = 'Anton', SZ = 300;
    const [, mx] = V.buffer('r3_measure', 8, 8);
    const gl = V.glyphs(mx, word, { size: SZ, family: FAM, weight: 400, tracking: 14 });
    const worldW = 960, k = worldW / gl.total;
    const dz = ch(b, 9000, [[24, 24.9, -7900, E.outExpo], [24.9, 26.2, -180, E.inOutSine]]);
    const rotW = [ch(b, 0.35, [[24, 25.2, -0.35, E.outExpo]]), ch(b, -0.9, [[24, 25.4, 0.95, E.outExpo]]) + 0.03 * Math.sin(b * 2), 0];
    gl.forEach((g, i) => {
      const sp = extSprites(g.ch, FAM, SZ);
      const d = Math.abs(i - (word.length - 1) / 2);
      const pk = E.inCubic(P(b, 26 + d * 0.18, 27.3 + d * 0.18));
      const side = i < word.length / 2 ? -1 : 1;
      let pos = rotY(rotX([g.x * k, 0, 0], rotW[0]), rotW[1]);
      pos = add(pos, [side * pk * (700 + d * 500), (V.hash(i * 3.1) - 0.5) * pk * 1400, dz - pk * 1500]);
      const rot = [rotW[0] + pk * (V.hash(i) - 0.5) * 3, rotW[1] + side * pk * 2.2, pk * side * 0.8];
      const width = sp[0].w * k;
      drawExtruded(ctx, c, sp, pos, width, rot, 150, 14, 1);
    });
  }

  /* ================= SCENE 5 — ASSEMBLY + END CARD (beats 32–40) ================= */
  const NAME_Y = 830;
  let NL = null;
  function nameLayout() {
    if (NL) return NL;
    const [, mx] = V.buffer('r3_measure', 8, 8);
    const w100 = V.measure(mx, NAME, { size: 100, family: 'Anton', weight: 400, tracking: 8 });
    const size = Math.min(310, (820 / w100) * 100);
    const tracking = size * 0.08;
    // sample the name into target points
    const BH = 520;
    const [, bx] = V.buffer('r3_name', W, BH);
    bx.clearRect(0, 0, W, BH);
    V.text(bx, NAME, W / 2, BH / 2, { size, family: 'Anton', weight: 400, tracking, fill: '#fff' });
    const data = bx.getImageData(0, 0, W, BH).data;
    let filled = 0;
    for (let y = 0; y < BH; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) filled++;
    const area = filled * 4;
    const step = Math.max(3, Math.sqrt(area / 3200));
    const pts = [];
    const r = V.rng(77);
    for (let y = 0; y < BH; y += step) for (let x = 0; x < W; x += step) {
      const jx = x + (r() - 0.5) * step * 0.6, jy = y + (r() - 0.5) * step * 0.6;
      const xi = Math.round(jx), yi = Math.round(jy);
      if (xi < 0 || yi < 0 || xi >= W || yi >= BH) continue;
      if (data[(yi * W + xi) * 4 + 3] > 128) pts.push([jx, jy - BH / 2 + NAME_Y]);
    }
    const N = pts.length;
    const DT = 1000, FOV = 1000;
    const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
    const P3 = pts.map((p, i) => {
      const cr = r();
      // start on a tilted two-arm spiral galaxy that the name unfurls from
      const rad = 120 + Math.pow(r(), 0.8) * 1500, arm = r() < 0.5 ? 0 : Math.PI;
      const a = arm + rad * 0.0032 + (r() - 0.5) * 0.9;
      const gp = rotZ(rotX([Math.cos(a) * rad, (r() - 0.5) * 60, Math.sin(a) * rad], -1.05), 0.35);
      return {
        ga: a, grad: rad,
        t: [((p[0] - W / 2) * DT) / FOV, (-(p[1] - H / 2) * DT) / FOV, DT],
        s: [gp[0], gp[1] - 0, gp[2] + 2600],
        d: ((p[0] - minX) / (maxX - minX || 1)) * 1.1 + r() * 0.45,
        g: cr < 0.55 ? 0 : cr < 0.85 ? 1 : 2,
        sw: (r() - 0.5) * 2,
        ex: norm([r() - 0.5, r() - 0.5, r() - 0.5]),
      };
    });
    NL = { size, tracking, pts: P3, N };
    return NL;
  }

  function drawEndBackdrop(ctx, b, k) {
    // faint perspective floor + orbit ring behind the name: depth without clutter
    const c = look([0, 380, -1400], [0, 180, 1000], 0, 1000);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = CY; ctx.lineWidth = 1.2;
    const drift = (b * 90) % 300;
    for (let i = 0; i < 26; i++) {
      const z = i * 300 - drift + 200;
      const fog = cl(1 - z / 7200) * sm(1800, 3200, z);
      ctx.globalAlpha = k * fog * 0.35;
      ctx.beginPath(); polyC(ctx, c, [toCam(c, [-5000, 0, z]), toCam(c, [5000, 0, z])], false); ctx.stroke();
    }
    ctx.globalAlpha = k * 0.22;
    ctx.beginPath();
    for (let i = -16; i <= 16; i++) polyC(ctx, c, [toCam(c, [i * 300, 0, 2600]), toCam(c, [i * 300, 0, 7600])], false);
    ctx.stroke();
    // horizon haze
    const hz = scr(c, toCam(c, [0, 0, 7600]));
    const g = ctx.createLinearGradient(0, hz[1] - 260, 0, hz[1] + 40);
    g.addColorStop(0, 'rgba(255,43,214,0)'); g.addColorStop(0.85, `rgba(255,43,214,${0.18 * k})`); g.addColorStop(1, 'rgba(255,43,214,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, hz[1] - 260, W, 300);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function sceneEnd(ctx, b, t) {
    const L = nameLayout();
    const land = 36;
    const settle = E.outCubic(P(b, 32, 35.9));
    const yaw = 0.95 * (1 - settle), roll = -0.28 * (1 - settle);
    const c = axisCam(0, 0, 1000);
    const pivot = [0, (-(NAME_Y - H / 2) * 1000) / 1000, 1000];
    const bk = sm(35, 36.4, b);
    if (bk > 0) drawEndBackdrop(ctx, b, bk);
    // galaxy core glow (fades as the arms unfurl into the name)
    const gk = sm(31.6, 32.4, b) * (1 - sm(33.4, 34.8, b));
    if (gk > 0.01) {
      const gz = 2600 + 2200 * (1 - E.outCubic(P(b, 31.6, 33)));
      const r = 1500 * 1000 / gz;
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(0.35); ctx.scale(1, 0.55);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(255,244,230,${0.85 * gk})`); g.addColorStop(0.12, `rgba(62,240,255,${0.35 * gk})`);
      g.addColorStop(0.5, `rgba(122,92,255,${0.12 * gk})`); g.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    // particles
    const crisp = sm(35.95, 36.25, b);
    const burst = P(b, 36, 37.4);
    if (burst < 1) {
      ctx.globalCompositeOperation = 'lighter';
      const cols = [CY, WH, MG];
      for (let g = 0; g < 3; g++) {
        ctx.fillStyle = cols[g];
        for (const p of L.pts) {
          if (p.g !== g) continue;
          const k = E.inOutCubic(P(b, 32.6 + p.d * 0.9, 34.6 + p.d * 0.85));
          const spinA = (b - 31.6) * (2.6 / Math.sqrt(p.grad / 300 + 0.3)) * 0.35;
          const sa = rotZ(rotX(rotY([Math.cos(p.ga) * p.grad, 0, Math.sin(p.ga) * p.grad], -spinA), -1.05), 0.35);
          const st = [sa[0], sa[1], sa[2] + 2600 + 2200 * (1 - E.outCubic(P(b, 31.6, 33)))];
          // target: in the swung formation frame (rotates into frontal pose)
          let tq = rotZ(rotY(sub(p.t, pivot), yaw), roll);
          tq = add(tq, pivot);
          // unwinding swirl around the galaxy axis while travelling
          const sw = (1 - k) * (0.9 + 0.5 * p.sw);
          const cs = Math.cos(sw), sn = Math.sin(sw);
          const gx = st[0] * cs - st[1] * sn, gy = st[0] * sn + st[1] * cs;
          const q = [V.lerp(gx, tq[0], k), V.lerp(gy, tq[1], k), V.lerp(st[2], tq[2], k)];
          if (burst > 0) { const e = E.outExpo(burst) * 260; q[0] += p.ex[0] * e; q[1] += p.ex[1] * e; q[2] += p.ex[2] * e; }
          if (q[2] < NEAR) continue;
          const sp = scr(c, q);
          const sz = cl(3.4 * sp[2], 2.4, 9);
          const a = (g === 1 ? 1 : 0.9) * (1 - burst) * (1 - crisp * 0.6) * sm(31.6, 32.3, b);
          ctx.globalAlpha = a;
          ctx.fillRect(sp[0] - sz / 2, sp[1] - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (b < land - 0.05) return;
    // ---- end card ----
    const k1 = E.outExpo(P(b, 36, 36.8));
    ctx.save();
    // name: crisp type, a hair of scale settle
    const sc = 1 + 0.04 * (1 - k1);
    ctx.translate(W / 2, NAME_Y); ctx.scale(sc, sc); ctx.translate(-W / 2, -NAME_Y);
    ctx.globalAlpha = crisp;
    V.text(ctx, NAME, W / 2, NAME_Y, { size: L.size, family: 'Anton', weight: 400, tracking: L.tracking, fill: '#ffffff' });
    ctx.restore();
    // anamorphic flare through the name on impact
    const fl = hitB(b, 36, 0.9);
    if (fl > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(62,240,255,0)'); g.addColorStop(0.5, `rgba(200,250,255,${0.9 * fl})`); g.addColorStop(1, 'rgba(62,240,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, NAME_Y - 3 - 6 * fl, W, 6 + 12 * fl);
      ctx.globalCompositeOperation = 'source-over';
    }
    const top = NAME_Y - L.size * 0.62, bot = NAME_Y + L.size * 0.62;
    // SHOWREEL 2026 — typed in
    const k2 = P(b, 36.4, 37.4);
    const label = 'SHOWREEL 2026';
    const nChars = Math.floor(k2 * label.length + 0.001);
    if (k2 > 0) {
      const txt = label.slice(0, nChars) + (k2 < 1 && Math.floor(b * 8) % 2 ? '_' : '');
      V.text(ctx, txt, W / 2, top - 70, { size: 30, family: 'JetBrains Mono', weight: 500, tracking: 10, fill: 'rgba(255,244,230,0.85)' });
      const lw = 150 * E.outExpo(k2);
      ctx.fillStyle = 'rgba(255,244,230,0.5)';
      ctx.fillRect(W / 2 - 200 - lw, top - 71, lw, 2);
      ctx.fillRect(W / 2 + 200, top - 71, lw, 2);
    }
    // MOTION DESIGNER — tracking settles
    const k3 = E.outExpo(P(b, 36.25, 37.4));
    if (k3 > 0) {
      ctx.globalAlpha = k3;
      V.text(ctx, 'MOTION DESIGNER', W / 2, bot + 70, { size: 54, family: 'Space Grotesk', weight: 700, tracking: 14 + 30 * (1 - k3), fill: CY });
      ctx.globalAlpha = 1;
    }
    const k4 = E.outCubic(P(b, 36.9, 38));
    if (k4 > 0) {
      ctx.globalAlpha = k4 * 0.8;
      V.text(ctx, 'light · space · time', W / 2, bot + 150 + 12 * (1 - k4), { size: 50, family: 'Instrument Serif', weight: 400, style: 'italic', fill: WH });
      ctx.globalAlpha = 1;
    }
    // URL sign-off
    const k5 = E.outCubic(P(b, 37.2, 38.2));
    if (k5 > 0) {
      const y = bot + 290;
      ctx.globalAlpha = k5;
      ctx.strokeStyle = 'rgba(62,240,255,0.55)'; ctx.lineWidth = 1.5;
      const bw = 190 * E.outExpo(k5);
      ctx.beginPath(); ctx.roundRect(W / 2 - bw, y - 30, bw * 2, 60, 30); ctx.stroke();
      V.text(ctx, 'crewupa.com', W / 2, y + 1, { size: 30, family: 'JetBrains Mono', weight: 500, tracking: 4, fill: WH });
      ctx.globalAlpha = 1;
    }
  }

  /* ================= HUD (post, once per frame, crisp) ================= */
  const SCENES = [[0, 'SEQ 01 — LIGHT'], [8, 'SEQ 02 — SPACE'], [16, 'SEQ 03 — TIME'], [24, 'SEQ 04 — MOTION'], [32, 'SEQ 05 — SIGNAL']];
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_-';
  const scramble = (str, k, seed) => [...str].map((ch2, i) => (ch2 === ' ' || k > (i + 1) / str.length ? ch2 : GLYPHS[Math.floor(V.hash(seed + i * 7.3) * GLYPHS.length)])).join('');
  function hudText(ctx, s, x, y, align, alpha, size = 22, col = WH) {
    ctx.globalAlpha = alpha;
    V.font(ctx, size, 'JetBrains Mono', 500);
    ctx.letterSpacing = '3px';
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col;
    ctx.fillText(s, x, y);
  }
  function currentFov(b) {
    if (b < 8) return tunFov(b);
    if (b < 23.5) return worldCam(b).fov;
    if (b < 32) return warpFov(b);
    return 1000;
  }
  function drawHUD(ctx, t, b) {
    const on = V.clamp(b / 0.3) * (V.hash(Math.floor(t * 60)) > 0.35 || b > 0.45 ? 1 : 0.2);
    const off = 1 - sm(35.4, 36, b);
    const A = on * off;
    const endA = sm(36.6, 37.6, b);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // corner brackets (persist into the end card)
    const x0 = 96, y0 = 286, x1 = 984, y1 = 1494, L = 44;
    const bA = Math.max(A, endA) * (b > 23.5 && b < 24 ? 0 : 1);
    ctx.strokeStyle = WH; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 * bA;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
    ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
    ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
    ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
    ctx.stroke();
    if (A > 0.01 && !(b > 23.5 && b < 24)) {
      // REC
      const blink = Math.floor(b) % 2 === 0 ? 1 : 0.25;
      ctx.globalAlpha = A * blink; ctx.fillStyle = MG;
      ctx.beginPath(); ctx.arc(x0 + 30, y0 + 34, 8, 0, TAU); ctx.fill();
      hudText(ctx, 'REC', x0 + 50, y0 + 35, 'left', A * 0.9);
      hudText(ctx, 'CAM_A', x0 + 50, y0 + 67, 'left', A * 0.5, 18);
      // timecode
      const f = Math.floor(t * 60), ss = Math.floor(f / 60), ff = f % 60;
      hudText(ctx, `TC 00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, x1 - 20, y0 + 35, 'right', A * 0.9);
      hudText(ctx, `${BPM} BPM  BAR ${String(Math.floor(b / 4) + 1).padStart(2, '0')}.${Math.floor(b % 4) + 1}`, x1 - 20, y0 + 67, 'right', A * 0.5, 18);
      // scene label with scramble on change
      let si = 0; for (let i = 0; i < SCENES.length; i++) if (b >= SCENES[i][0]) si = i;
      const sk = cl((b - SCENES[si][0]) / 0.6);
      hudText(ctx, scramble(SCENES[si][1], sk, si * 17 + Math.floor(t * 30)), x0 + 20, y1 - 32, 'left', A * 0.9);
      // lens readout
      const mm = fovToMM(currentFov(b));
      hudText(ctx, `FL ${mm.toFixed(1)}MM  T1.4`, x1 - 20, y1 - 32, 'right', A * 0.9);
      // centre crosshair
      const cA = A * (b < 8 || (b > 24 && b < 32) ? 0.45 : 0.2);
      ctx.globalAlpha = cA; ctx.strokeStyle = WH; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 26, H / 2); ctx.lineTo(W / 2 - 8, H / 2); ctx.moveTo(W / 2 + 8, H / 2); ctx.lineTo(W / 2 + 26, H / 2);
      ctx.moveTo(W / 2, H / 2 - 26); ctx.lineTo(W / 2, H / 2 - 8); ctx.moveTo(W / 2, H / 2 + 8); ctx.lineTo(W / 2, H / 2 + 26);
      ctx.stroke();
      // side ruler: altitude / velocity
      let val = 0, lab = '';
      if (b >= 8 && b < 23.5) { const cm = worldCam(b); val = cm.pos[1]; lab = 'ALT'; }
      else if (b >= 24 && b < 32) { val = warpVel(b) * 0.1; lab = 'VEL'; }
      else if (b < 8) { val = tunCamZ(b) * 0.1; lab = 'Z'; }
      if (lab) {
        const rx = x1 - 6, cy = H / 2;
        ctx.globalAlpha = A * 0.45; ctx.strokeStyle = WH; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const off2 = (val * 0.8) % 40;
        for (let i = -9; i <= 9; i++) { const y = cy + i * 40 + off2; const len = (Math.round((y - off2 - cy) / 40) % 5 === 0) ? 22 : 11; ctx.moveTo(rx, y); ctx.lineTo(rx - len, y); }
        ctx.stroke();
        ctx.globalAlpha = A * 0.9; ctx.fillStyle = WH;
        ctx.beginPath(); ctx.moveTo(rx - 30, cy); ctx.lineTo(rx - 42, cy - 7); ctx.lineTo(rx - 42, cy + 7); ctx.fill();
        hudText(ctx, `${lab} ${String(Math.round(val)).padStart(5, '0')}`, x1 - 20, y1 - 66, 'right', A * 0.6, 18);
      }
      // lock-on brackets around the gimbal
      if (b >= 15.8 && b < 23.5) {
        const cm = worldCam(b), gq = toCam(cm, G);
        if (gq[2] > NEAR) {
          const p = scr(cm, gq);
          const lk = E.outBack(P(b, 16, 16.6));
          const r = Math.min(430, 900 * p[2]) * (1.7 - 0.7 * lk);
          const la = A * sm(15.8, 16.1, b);
          ctx.globalAlpha = la * 0.9; ctx.strokeStyle = LM; ctx.lineWidth = 2.5;
          const q = 36;
          ctx.beginPath();
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            const cx = p[0] + sx * r, cy2 = p[1] + sy * r;
            ctx.moveTo(cx, cy2 - sy * q); ctx.lineTo(cx, cy2); ctx.lineTo(cx - sx * q, cy2);
          }
          ctx.stroke();
          const blinkL = b < 16.8 ? (Math.floor(b * 8) % 2) : 1;
          hudText(ctx, 'TRK 03  LOCKED', p[0] - r, p[1] - r - 26, 'left', la * blinkL, 20, LM);
          hudText(ctx, `D ${Math.round(Math.hypot(...sub(cm.pos, G)))}`, p[0] + r, p[1] + r + 28, 'right', la * 0.8, 18, LM);
        }
      }
    }
    ctx.restore();
  }

  /* ================= post ================= */
  function bloom(ctx, strength, radius, scale, name) {
    const w = Math.round(W / scale), h = Math.round(H / scale);
    const [c, x] = V.buffer(name, w, h);
    x.clearRect(0, 0, w, h);
    x.filter = `blur(${radius}px)`;
    x.drawImage(ctx.canvas, 0, 0, w, h);
    x.filter = 'none';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, W, H);
    ctx.restore();
  }

  const HITS = [8, 24, 36];
  const SNARES = [];
  for (let bar = 0; bar < 10; bar++) { if (bar >= 4 && bar < 6) SNARES.push(bar * 4 + 2); else if (bar < 8) SNARES.push(bar * 4 + 1, bar * 4 + 3); }

  V.reel({
    title: 'LIGHT / SPACE / TIME',
    duration: 15,
    fps: 60,
    bpm: BPM,
    sidechain: 0.6,
    blur: {
      samples: 4,
      shutter: (t) => {
        const b = t / SPB;
        if (b >= 37.6) return 0;
        if (b >= 24 && b < 32) return 0.7;
        if (b > 6.8 && b < 9.5) return 0.75;
        if (b < 0.6) return 0.3;
        return 0.5;
      },
    },
    draw(ctx, t) {
      const b = t / SPB;
      V.bg(ctx, BG);
      if (b < 8) sceneTunnel(ctx, b, t);
      else if (b < 23.5) sceneWorld(ctx, b, t);
      else if (b < 24) sceneGap(ctx, b);
      else if (b < 34) sceneWarp(ctx, b, t);
      if (b >= 31.6) sceneEnd(ctx, b, t);
      // drop flash
      const fl = hitB(b, 24, 0.18) * 0.8;
      if (fl > 0.01) {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl; ctx.fillStyle = '#dff'; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
    post(ctx, t) {
      const b = t / SPB;
      bloom(ctx, 0.55, 5, 4, 'r3_bloomA');
      bloom(ctx, 0.45, 10, 8, 'r3_bloomB');
      drawHUD(ctx, t, b);
      // RGB split + slice glitch only on hits / transitions
      let ca = 0, sl = 0;
      for (const h of HITS) { ca += 16 * hitB(b, h, 0.35); sl += 50 * hitB(b, h, 0.18); }
      ca += 7 * hitB(b, 0, 0.3);
      for (const s of SNARES) ca += 5 * hitB(b, s, 0.2);
      ca += 10 * sm(23, 23.5, b) * (b < 23.5 ? 1 : 0);
      sl += 70 * hitB(b, 31, 0.25) + 30 * hitB(b, 16, 0.2);
      if (ca > 0.4) V.chroma(ctx, ca, ca * 0.25);
      if (sl > 0.8) V.slices(ctx, t, sl, 12, 5);
      V.vignette(ctx, 0.55);
      V.grain(ctx, t, 0.07);
    },
    music(m) {
      // A minor, dark. i – VI – iv – V.  Two-step DnB at 160.
      const A1 = 33, F1 = 29, D1 = 26, E1 = 28, C2 = 36, G1 = 31;
      const twoStep = (bar, o = {}) => {
        const b0 = bar * 4;
        m.kick(b0, { gain: 1 }); m.kick(b0 + 2.5, { gain: 0.9 });
        m.snare(b0 + 1, { gain: 0.75 }); m.snare(b0 + 3, { gain: 0.8 });
        if (o.ghost) m.snare(b0 + 3.75, { gain: 0.18, verb: 0.1 });
        for (let i = 0; i < 8; i++) m.hat(b0 + i * 0.5, { gain: i % 2 ? 0.22 : 0.13, pan: 0.25 });
        if (o.sixteen) for (let i = 0; i < 16; i++) if (i % 2) m.hat(b0 + i * 0.25, { gain: 0.07, pan: -0.3 });
        m.hat(b0 + 1.5, { open: true, gain: 0.08, pan: -0.2 });
      };
      const reese = (b, len, note, g = 0.34) => m.bass(b, len, note, { type: 'reese', cutoff: 380, env: 900, fdecay: 5, gain: g });
      // ---- bars 1–2: tunnel ----
      m.impact(0, { gain: 0.7 }); m.whoosh(0, 1.5, { dir: 1, gain: 0.35 }); m.zap(0, { gain: 0.18 });
      twoStep(0); twoStep(1, { ghost: true });
      reese(0, 2.25, A1); reese(2.5, 1.25, A1); reese(4, 2.25, A1); reese(6.5, 0.75, C2); reese(7.25, 0.5, G1);
      m.chord(0, 8, [57, 60, 64], { gain: 0.1, cutoff: 700, env: 900, attack: 0.4, release: 0.6, verb: 0.6 });
      for (const b of [1, 3, 5, 7]) m.tick(b, { freq: 3200, gain: 0.08 });
      m.riser(6, 8, { gain: 0.22 }); m.whoosh(7, 1, { dir: -1, gain: 0.4 });
      // ---- bars 3–4: valley ----
      m.impact(8, { gain: 0.5 }); m.hat(8, { open: true, gain: 0.2 });
      twoStep(2, { sixteen: true }); twoStep(3, { sixteen: true, ghost: true });
      reese(8, 2.25, F1); reese(10.5, 1.25, F1); reese(12, 2.25, F1); reese(14.5, 1.5, G1);
      m.chord(8, 4, [53, 57, 60], { gain: 0.1, cutoff: 800, env: 1200, attack: 0.3, release: 0.4, verb: 0.6 });
      m.chord(12, 4, [55, 59, 62], { gain: 0.1, cutoff: 800, env: 1200, attack: 0.3, release: 0.4, verb: 0.6 });
      const arp = [69, 72, 76, 81, 76, 72, 69, 72];
      for (let i = 0; i < 16; i++) m.lead(8 + i * 0.5, 0.45, (i < 8 ? arp[i % 8] - 4 : arp[i % 8] - 2), { gain: 0.05, decay: 7, pan: i % 2 ? 0.4 : -0.4, verb: 0.5 });
      m.whoosh(15, 1, { dir: 1, gain: 0.3 });
      // ---- bars 5–6: gimbal, halftime + build ----
      m.kick(16, { gain: 1 }); m.snare(18, { gain: 0.85, verb: 0.6 }); m.kick(19.5, { gain: 0.7 });
      m.kick(20, { gain: 0.9 }); m.snare(22, { gain: 0.85, verb: 0.6 });
      for (let i = 0; i < 16; i++) m.hat(16 + i * 0.5, { gain: 0.1 + (i / 16) * 0.08, pan: 0.2 });
      m.bass(16, 4, D1, { type: 'sub', gain: 0.5 }); m.bass(20, 3.5, E1, { type: 'sub', gain: 0.5 });
      m.chord(16, 4, [50, 53, 57, 62], { gain: 0.13, cutoff: 900, env: 1500, attack: 0.25, release: 0.3, verb: 0.7 });
      m.chord(20, 3.5, [52, 56, 59, 64], { gain: 0.14, cutoff: 900, env: 2500, fdecay: 1, attack: 0.2, release: 0.05, verb: 0.7 });
      m.tick(16, { freq: 1800, gain: 0.12 }); m.tick(16.25, { freq: 2400, gain: 0.1 });
      m.riser(19, 23.5, { gain: 0.35 });
      for (let i = 0; i < 6; i++) m.snare(22.5 + i * 0.25 * (i < 4 ? 1 : 1), { gain: 0.25 + i * 0.07, verb: 0.2 });
      for (let i = 0; i < 4; i++) m.snare(23 + i * 0.125, { gain: 0.5 + i * 0.08, verb: 0.2 });
      m.mute(23.5, 24);
      // ---- bars 7–8: DROP / warp ----
      m.impact(24, { gain: 1 }); m.subdrop(24, { gain: 0.7 }); m.zap(24, { gain: 0.2 });
      twoStep(6, { sixteen: true }); twoStep(7, { sixteen: true, ghost: true });
      reese(24, 1.5, A1, 0.42); reese(25.5, 0.5, A1 + 12, 0.3); reese(26, 0.5, A1, 0.42); reese(26.5, 1.5, C2, 0.38);
      reese(28, 1.5, F1, 0.42); reese(29.5, 0.5, F1 + 12, 0.3); reese(30, 1, G1, 0.42); reese(31, 1, E1, 0.42);
      for (const b of [24.5, 25.5, 26.75, 27.5]) m.chord(b, 0.25, [57, 60, 64, 69], { gain: 0.12, cutoff: 1400, env: 5000, pluck: 14, verb: 0.35 });
      for (const b of [28.5, 29.5, 30.75]) m.chord(b, 0.25, [53, 57, 60, 65], { gain: 0.12, cutoff: 1400, env: 5000, pluck: 14, verb: 0.35 });
      for (const g of GATES) m.zap(g, { gain: 0.12, from: 2400 });
      m.whoosh(30, 1.2, { dir: 1, gain: 0.45 });
      m.glitch(30.75, 0.5, { gain: 0.2 });
      m.downlifter(31, 1.5, { gain: 0.3 });
      // ---- bar 9: assembly ----
      m.kick(32, { gain: 0.9 }); m.snare(34, { gain: 0.7, verb: 0.7 });
      m.bass(32, 2, D1, { type: 'sub', gain: 0.45 }); m.bass(34, 1.75, E1, { type: 'sub', gain: 0.45 });
      m.chord(32, 2, [50, 53, 57, 62], { gain: 0.12, cutoff: 1100, env: 1800, attack: 0.1, release: 0.2, verb: 0.7 });
      m.chord(34, 1.75, [52, 56, 59, 64], { gain: 0.13, cutoff: 1100, env: 2500, attack: 0.1, release: 0.05, verb: 0.7 });
      for (let i = 0; i < 14; i++) m.tick(32.25 + i * 0.25, { freq: 2200 + i * 160, gain: 0.05 + i * 0.006, pan: (i % 2 ? 0.5 : -0.5) });
      m.riser(33, 35.75, { gain: 0.3 });
      m.mute(35.75, 36);
      // ---- bar 10: the name ----
      m.impact(36, { gain: 1 }); m.subdrop(36, { gain: 0.8, len: 2.2 }); m.kick(36, { gain: 1, decay: 4 });
      m.chord(36, 4, [45, 57, 60, 64, 69], { gain: 0.16, cutoff: 1300, env: 2000, fdecay: 2, attack: 0.01, release: 0.8, verb: 0.8 });
      m.bass(36, 3.5, A1, { type: 'sub', gain: 0.45 });
      m.lead(36.5, 1.5, 81, { gain: 0.06, decay: 2, verb: 0.8 }); m.lead(37, 2, 76, { gain: 0.05, decay: 1.5, verb: 0.8 });
      m.tick(36.4, { freq: 3000, gain: 0.08 });
    },
  });
})();
