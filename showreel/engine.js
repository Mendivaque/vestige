/* Showreel engine — deterministic, frame-addressable canvas motion graphics.
 * Everything is a pure function of time `t` (seconds) so any frame can be
 * rendered in any order, on any worker. Loadable in the browser (draw) and in
 * Node via `vm` (music spec only) — nothing here touches the DOM at load time.
 */
(function (G) {
  const V = {};
  V.W = 1080;
  V.H = 1920;
  const TAU = Math.PI * 2;
  V.TAU = TAU;

  /* ---------- math ---------- */
  V.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  V.lerp = (a, b, t) => a + (b - a) * t;
  V.prog = (t, a, b) => V.clamp((t - a) / (b - a));
  V.map = (x, a, b, c = 0, d = 1, clamp = true) => {
    let k = (x - a) / (b - a);
    if (clamp) k = V.clamp(k);
    return c + (d - c) * k;
  };
  V.fract = (x) => x - Math.floor(x);
  V.smooth = (e0, e1, x) => {
    const k = V.clamp((x - e0) / (e1 - e0));
    return k * k * (3 - 2 * k);
  };
  /** Window: 0 before a, ramps in over `inD`, holds, ramps out over `outD` ending at b. */
  V.win = (t, a, b, inD = 0.2, outD = 0.2, ein = E_.outCubic, eout = E_.inCubic) => {
    if (t < a || t > b) return 0;
    const i = inD > 0 ? ein(V.clamp((t - a) / inD)) : 1;
    const o = outD > 0 ? 1 - eout(V.clamp((t - (b - outD)) / outD)) : 1;
    return Math.min(i, o);
  };

  /* ---------- easing ---------- */
  const E_ = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inQuint: (t) => t ** 5,
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
    outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inCirc: (t) => 1 - Math.sqrt(1 - t * t),
    inOutCirc: (t) =>
      t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    inOutBack: (t, s = 1.70158 * 1.525) =>
      t < 0.5
        ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
        : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
    outElastic: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    /** Critically-damped-ish spring settle, overshoots once. */
    spring: (t, k = 7, z = 0.45) => 1 - Math.exp(-k * t) * Math.cos(k * t * (1 - z) * 1.6),
  };
  V.ease = E_;
  /** Eased tween: value from a→b over time window [t0,t1]. */
  V.tw = (t, t0, t1, a = 0, b = 1, e = E_.inOutCubic) => V.lerp(a, b, e(V.prog(t, t0, t1)));

  /* ---------- random + noise ---------- */
  V.rng = (seed = 1) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  V.hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  V.hash2 = (x, y) => V.hash(x * 57.0 + y * 113.0);
  V.noise1 = (x) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return V.lerp(V.hash(i), V.hash(i + 1), u) * 2 - 1;
  };
  V.noise2 = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = V.hash2(ix, iy), b = V.hash2(ix + 1, iy), c = V.hash2(ix, iy + 1), d = V.hash2(ix + 1, iy + 1);
    return V.lerp(V.lerp(a, b, ux), V.lerp(c, d, ux), uy) * 2 - 1;
  };
  V.fbm = (x, y, oct = 4) => {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += a * V.noise2(x * f, y * f); f *= 2; a *= 0.5; }
    return s;
  };

  /* ---------- rhythm ---------- */
  /** Clock helpers for a BPM. beat(t) is fractional beat index; at(b) is the time of beat b. */
  V.clock = (bpm) => {
    const spb = 60 / bpm;
    return {
      bpm, spb,
      beat: (t) => t / spb,
      at: (b) => b * spb,
      bar: (t) => Math.floor(t / spb / 4),
      /** Decaying pulse after every `div` beats (1 = quarter, 0.5 = eighth). */
      pulse: (t, div = 1, decay = 0.12) => {
        const p = t / spb / div;
        const since = (p - Math.floor(p)) * spb * div;
        return Math.exp(-since / decay);
      },
    };
  };
  /** Exponential decay pulse fired at time `at`. */
  V.hit = (t, at, decay = 0.15) => (t < at ? 0 : Math.exp(-(t - at) / decay));

  /* ---------- colour ---------- */
  V.hex2rgb = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  V.rgba = (hex, a = 1) => {
    const [r, g, b] = V.hex2rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };
  V.mix = (h1, h2, t, a = 1) => {
    const A = V.hex2rgb(h1), B = V.hex2rgb(h2);
    const c = A.map((v, i) => Math.round(V.lerp(v, B[i], V.clamp(t))));
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  V.hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  /** Pick from a palette list with smooth blend by continuous index. */
  V.palette = (list, x) => {
    const n = list.length, i = ((Math.floor(x) % n) + n) % n, f = x - Math.floor(x);
    return V.mix(list[i], list[(i + 1) % n], f);
  };

  /* ---------- canvas helpers ---------- */
  V.font = (ctx, size, family = 'Inter', weight = 800, style = 'normal') => {
    ctx.font = `${style} ${weight} ${size}px "${family}"`;
  };
  /**
   * Draw text. opts: size, family, weight, style, align, baseline, tracking (px),
   * fill, stroke, lw, alpha
   */
  V.text = (ctx, str, x, y, o = {}) => {
    ctx.save();
    V.font(ctx, o.size || 100, o.family || 'Inter', o.weight || 800, o.style || 'normal');
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.letterSpacing = (o.tracking || 0) + 'px';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.fill !== null && o.fill !== undefined) { ctx.fillStyle = o.fill; ctx.fillText(str, x, y); }
    else if (!o.stroke) { ctx.fillStyle = '#fff'; ctx.fillText(str, x, y); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.restore();
  };
  V.measure = (ctx, str, o = {}) => {
    ctx.save();
    V.font(ctx, o.size || 100, o.family || 'Inter', o.weight || 800, o.style || 'normal');
    ctx.letterSpacing = (o.tracking || 0) + 'px';
    const m = ctx.measureText(str);
    ctx.restore();
    return m.width;
  };
  /**
   * Per-glyph layout for letter-by-letter animation. Returns [{ch, x, w, i}] with x as the
   * glyph's centre, relative to the string being centred on 0 (or left-aligned if align='left').
   */
  V.glyphs = (ctx, str, o = {}) => {
    ctx.save();
    V.font(ctx, o.size || 100, o.family || 'Inter', o.weight || 800, o.style || 'normal');
    ctx.letterSpacing = (o.tracking || 0) + 'px';
    const total = ctx.measureText(str).width;
    const out = [];
    const chars = [...str];
    for (let i = 0; i < chars.length; i++) {
      const pre = ctx.measureText(chars.slice(0, i).join('')).width;
      const w = ctx.measureText(chars[i]).width;
      out.push({ ch: chars[i], x: pre + w / 2 - (o.align === 'left' ? 0 : total / 2), w, i });
    }
    ctx.restore();
    out.total = total;
    return out;
  };
  V.poly = (ctx, cx, cy, r, n, rot = 0) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU - Math.PI / 2;
      i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  V.star = (ctx, cx, cy, r1, r2, n, rot = 0) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU - Math.PI / 2, r = i % 2 ? r2 : r1;
      i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  /** Superellipse — k=2 circle, k→∞ square. Great for circle↔square morphs. */
  V.squircle = (ctx, cx, cy, rx, ry, k = 4, rot = 0, steps = 96) => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU, c = Math.cos(a), s = Math.sin(a);
      const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / k) * rx;
      const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / k) * ry;
      const X = cx + x * Math.cos(rot) - y * Math.sin(rot), Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  };
  V.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  V.bg = (ctx, color) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.fillRect(0, 0, V.W, V.H); ctx.restore(); };
  V.save = (ctx, fn) => { ctx.save(); try { fn(); } finally { ctx.restore(); } };

  /* ---------- offscreen buffers ---------- */
  const pool = {};
  V.buffer = (name, w = V.W, h = V.H) => {
    let c = pool[name];
    if (!c || c.width !== w || c.height !== h) {
      c = pool[name] = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : document.createElement('canvas');
      c.width = w; c.height = h;
    }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    return [c, x];
  };

  /* ---------- 3D ---------- */
  /** Rotate point p=[x,y,z] by euler (rx, ry, rz). */
  V.rot3 = (p, rx = 0, ry = 0, rz = 0) => {
    let [x, y, z] = p;
    let c = Math.cos(rx), s = Math.sin(rx);
    [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ry); s = Math.sin(ry);
    [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(rz); s = Math.sin(rz);
    [x, y] = [x * c - y * s, x * s + y * c];
    return [x, y, z];
  };
  /**
   * Perspective project world point through camera {x,y,z (position), rx,ry,rz, fov(px focal)}.
   * Returns {x,y,s (scale), z (depth), vis}. Screen centre = canvas centre.
   */
  V.project = (p, cam) => {
    let q = [p[0] - (cam.x || 0), p[1] - (cam.y || 0), p[2] - (cam.z || 0)];
    q = V.rot3(q, -(cam.rx || 0), 0, 0);
    q = V.rot3(q, 0, -(cam.ry || 0), 0);
    q = V.rot3(q, 0, 0, -(cam.rz || 0));
    const f = cam.fov || 1200;
    const z = q[2];
    const s = f / Math.max(z, 1);
    return { x: V.W / 2 + q[0] * s, y: V.H / 2 + q[1] * s, s, z, vis: z > 1 };
  };

  /* ---------- post FX ---------- */
  let grainTiles = null;
  V.grain = (ctx, t, amount = 0.08, fps = 60) => {
    if (!grainTiles) {
      grainTiles = [];
      for (let k = 0; k < 6; k++) {
        const [c, x] = V.buffer('grain' + k, 256, 256);
        const id = x.createImageData(256, 256), r = V.rng(99 + k);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.floor(r() * 255);
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
        }
        x.putImageData(id, 0, 0);
        grainTiles.push(c);
      }
    }
    const f = Math.floor(t * fps);
    const tile = grainTiles[f % grainTiles.length];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor(V.hash(f) * 256), oy = Math.floor(V.hash(f + 7) * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, V.W + 256, V.H + 256);
    ctx.restore();
  };
  V.vignette = (ctx, strength = 0.5, color = '0,0,0') => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * 0.25, V.W / 2, V.H / 2, V.H * 0.75);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.restore();
  };
  /** RGB split: offsets the red and blue channels horizontally by `px` (and vertically by `py`). */
  V.chroma = (ctx, px = 6, py = 0) => {
    if (Math.abs(px) < 0.3 && Math.abs(py) < 0.3) return;
    const src = ctx.canvas;
    const [s, sx] = V.buffer('chroma_src'); sx.drawImage(src, 0, 0);
    const chan = (name, color, dx, dy) => {
      const [c, x] = V.buffer(name);
      x.drawImage(s, 0, 0);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = color; x.fillRect(0, 0, V.W, V.H);
      return [c, dx, dy];
    };
    const parts = [chan('ch_r', '#f00', px, py), chan('ch_g', '#0f0', 0, 0), chan('ch_b', '#00f', -px, -py)];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, V.W, V.H);
    ctx.globalCompositeOperation = 'lighter';
    for (const [c, dx, dy] of parts) ctx.drawImage(c, dx, dy);
    ctx.restore();
  };
  /** Horizontal slice displacement glitch. */
  V.slices = (ctx, t, amount = 40, n = 14, seed = 1) => {
    if (amount < 0.5) return;
    const [s, sx] = V.buffer('slice_src'); sx.drawImage(ctx.canvas, 0, 0);
    const f = Math.floor(t * 30);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const h1 = V.hash(f * 13.1 + i * 7.7 + seed), h2 = V.hash(f * 3.3 + i * 1.9 + seed * 2);
      const y = Math.floor(h1 * V.H), h = Math.floor(20 + h2 * 140);
      const dx = (V.hash(i + f * 0.7 + seed) - 0.5) * 2 * amount;
      ctx.drawImage(s, 0, y, V.W, h, dx, y, V.W, h);
    }
    ctx.restore();
  };
  /** Bloom-ish glow: blurred bright copy added on top. */
  V.glow = (ctx, radius = 24, strength = 0.6) => {
    const [c, x] = V.buffer('glow', V.W / 4, V.H / 4);
    x.filter = `blur(${radius / 4}px)`;
    x.drawImage(ctx.canvas, 0, 0, V.W / 4, V.H / 4);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, V.W, V.H);
    ctx.restore();
  };
  /** Camera shake offset at time t — returns [dx, dy, rot]. */
  V.shake = (t, amp = 10, freq = 18, seed = 3) => [
    V.noise1(t * freq + seed) * amp,
    V.noise1(t * freq + seed + 100) * amp,
    V.noise1(t * freq * 0.7 + seed + 200) * amp * 0.0015,
  ];

  /* ---------- reel registry ---------- */
  V.reel = (def) => {
    G.REEL = Object.assign({ duration: 15, fps: 60, bpm: 128, blur: { samples: 1, shutter: 0.5 } }, def);
    return G.REEL;
  };

  G.V = V;
})(typeof window !== 'undefined' ? window : globalThis);
