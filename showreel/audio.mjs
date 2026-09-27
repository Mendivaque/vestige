// Offline music synth. Each reel describes its score with REEL.music(m); every
// instrument is synthesized from scratch (no samples) so the whole reel is
// reproducible from source and the cuts land exactly on the beat grid.
import fs from 'node:fs';

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function biquad() {
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return {
    set(type, f, q, sr) {
      f = Math.min(Math.max(f, 10), sr * 0.45);
      const w = (TAU * f) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
      let B0, B1, B2, A0, A1, A2;
      if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; }
      else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; }
      else { B0 = al; B1 = 0; B2 = -al; } // bp
      A0 = 1 + al; A1 = -2 * c; A2 = 1 - al;
      b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0;
    },
    run(x) {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    },
  };
}

function makeNoise(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

function reverb(inL, inR, sr, size = 1, damp = 0.3) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => Math.round((n * size * sr) / 44100));
  const aps = [556, 441, 341, 225].map((n) => Math.round((n * sr) / 44100));
  const run = (inp, spread) => {
    const out = new Float32Array(inp.length);
    for (const L of combs) {
      const n = L + spread, buf = new Float32Array(n);
      let idx = 0, filt = 0;
      for (let i = 0; i < inp.length; i++) {
        const y = buf[idx];
        filt = y * (1 - damp) + filt * damp;
        buf[idx] = inp[i] + filt * 0.84;
        out[i] += y;
        idx = (idx + 1) % n;
      }
    }
    for (const L of aps) {
      const n = L + spread, buf = new Float32Array(n);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = buf[idx], x = out[i];
        out[i] = -x + b;
        buf[idx] = x + b * 0.5;
        idx = (idx + 1) % n;
      }
    }
    for (let i = 0; i < out.length; i++) out[i] *= 0.06;
    return out;
  };
  return [run(inL, 0), run(inR, 23)];
}

export function renderMusic(REEL, outPath, sr = 48000) {
  const bpm = REEL.bpm, spb = 60 / bpm, dur = REEL.duration;
  const N = Math.ceil((dur + 3) * sr);
  const bus = () => [new Float32Array(N), new Float32Array(N)];
  const drums = bus(), music = bus(), fx = bus(), send = bus();
  const kicks = [];
  const T = (b) => b * spb;
  const idx = (sec) => Math.round(sec * sr);
  const put = (B, i, v, pan = 0, sendAmt = 0) => {
    if (i < 0 || i >= N) return;
    const l = Math.cos(((pan + 1) * Math.PI) / 4), r = Math.sin(((pan + 1) * Math.PI) / 4);
    B[0][i] += v * l * 1.414; B[1][i] += v * r * 1.414;
    if (sendAmt) { send[0][i] += v * l * sendAmt; send[1][i] += v * r * sendAmt; }
  };
  let seed = 7;

  const m = {
    bpm, spb, T,
    kick(b, o = {}) {
      const g = o.gain ?? 1, s0 = idx(T(b)), len = idx(o.len ?? 0.5);
      const top = o.top ?? 160, bot = o.bottom ?? 45, nz = makeNoise(seed++);
      let ph = 0;
      kicks.push(T(b));
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const f = bot + (top - bot) * Math.exp(-t * 32);
        ph += (TAU * f) / sr;
        const env = Math.exp(-t * (o.decay ?? 6.5));
        let v = Math.sin(ph) * env;
        v += nz() * Math.exp(-t * 900) * 0.35; // click
        put(drums, s0 + i, Math.tanh(v * 1.8) * 0.9 * g);
      }
    },
    snare(b, o = {}) {
      const g = o.gain ?? 0.7, s0 = idx(T(b)), len = idx(0.35), nz = makeNoise(seed++);
      const hp = biquad(); hp.set('hp', o.hp ?? 1400, 0.7, sr);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        ph += (TAU * (200 - 40 * Math.min(1, t * 30))) / sr;
        const v = Math.sin(ph) * Math.exp(-t * 28) * 0.6 + hp.run(nz()) * Math.exp(-t * 15) * 0.9;
        put(drums, s0 + i, v * g, o.pan ?? 0, o.verb ?? 0.35);
      }
    },
    clap(b, o = {}) {
      const g = o.gain ?? 0.7, s0 = idx(T(b)), len = idx(0.4), nz = makeNoise(seed++);
      const bp = biquad(); bp.set('bp', 1300, 0.9, sr);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        let env = 0;
        for (const o2 of [0, 0.011, 0.022]) if (t >= o2) env = Math.max(env, Math.exp(-(t - o2) * 150));
        env = Math.max(env, t > 0.022 ? Math.exp(-(t - 0.022) * 12) * 0.5 : 0);
        put(drums, s0 + i, bp.run(nz()) * env * 2.2 * g, o.pan ?? 0, o.verb ?? 0.5);
      }
    },
    hat(b, o = {}) {
      const g = o.gain ?? 0.25, s0 = idx(T(b)), open = o.open, len = idx(open ? 0.4 : 0.08), nz = makeNoise(seed++);
      const hp = biquad(); hp.set('hp', 7500, 0.8, sr);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        put(drums, s0 + i, hp.run(nz()) * Math.exp(-t * (open ? 9 : 70)) * g, o.pan ?? 0.2, 0.05);
      }
    },
    /** Rolling bass. type: 'saw' | 'reese' | 'sub' | 'pluck'. */
    bass(b, lenBeats, note, o = {}) {
      const g = o.gain ?? 0.45, s0 = idx(T(b)), len = idx(T(lenBeats)), rel = idx(0.03);
      const f = mtof(note), lp = biquad(), type = o.type ?? 'saw';
      let p1 = 0, p2 = 0, p3 = 0;
      for (let i = 0; i < len + rel; i++) {
        const t = i / sr;
        if (i % 32 === 0) lp.set('lp', (o.cutoff ?? 500) + (o.env ?? 1800) * Math.exp(-t * (o.fdecay ?? 12)), o.q ?? 1.2, sr);
        p1 = (p1 + f / sr) % 1; p2 = (p2 + (f * 1.007) / sr) % 1; p3 += (TAU * f * 0.5) / sr;
        let v;
        if (type === 'sub') v = Math.sin(p3 * 2);
        else v = lp.run((p1 * 2 - 1) + (p2 * 2 - 1) * (type === 'reese' ? 1 : 0.4)) * 0.6 + Math.sin(p3 * 2) * 0.6;
        const a = Math.min(1, t / 0.004) * (i > len ? 1 - (i - len) / rel : 1) * (type === 'pluck' ? Math.exp(-t * 6) : 1);
        put(music, s0 + i, Math.tanh(v * 1.4) * a * g);
      }
    },
    /** Supersaw chord stab / pad. */
    chord(b, lenBeats, notes, o = {}) {
      const g = (o.gain ?? 0.18) / Math.sqrt(notes.length), s0 = idx(T(b)), len = idx(T(lenBeats));
      const atk = o.attack ?? 0.005, rel = idx(o.release ?? 0.12);
      const voices = [], rp = makeNoise(seed++);
      notes.forEach((n, ni) => {
        for (let d = -1; d <= 1; d++) voices.push({ f: mtof(n) * (1 + d * (o.detune ?? 0.009)), p: (rp() + 1) / 2, pan: (d * 0.6 + (ni / notes.length - 0.5) * 0.4) });
      });
      const lpL = biquad(), lpR = biquad();
      for (let i = 0; i < len + rel; i++) {
        const t = i / sr;
        if (i % 32 === 0) {
          const c = (o.cutoff ?? 1200) + (o.env ?? 5000) * Math.exp(-t * (o.fdecay ?? 7));
          lpL.set('lp', c, 0.9, sr); lpR.set('lp', c, 0.9, sr);
        }
        let L = 0, R = 0;
        for (const v of voices) {
          v.p = (v.p + v.f / sr) % 1;
          const s = v.p * 2 - 1;
          L += s * (1 - v.pan) * 0.5; R += s * (1 + v.pan) * 0.5;
        }
        const env = Math.min(1, t / atk) * (i > len ? 1 - (i - len) / rel : 1) * (o.pluck ? Math.exp(-t * o.pluck) : 1);
        const l = lpL.run(L) * env * g, r = lpR.run(R) * env * g;
        const k = s0 + i;
        if (k >= 0 && k < N) {
          music[0][k] += l; music[1][k] += r;
          send[0][k] += l * (o.verb ?? 0.4); send[1][k] += r * (o.verb ?? 0.4);
        }
      }
    },
    /** Simple lead / arp note (square-ish with filter pluck). */
    lead(b, lenBeats, note, o = {}) {
      const g = o.gain ?? 0.12, s0 = idx(T(b)), len = idx(T(lenBeats)), rel = idx(0.05);
      const f = mtof(note), lp = biquad();
      let p = 0;
      for (let i = 0; i < len + rel; i++) {
        const t = i / sr;
        if (i % 32 === 0) lp.set('lp', 600 + 6000 * Math.exp(-t * (o.fdecay ?? 14)), 2, sr);
        p = (p + f / sr) % 1;
        const s = (p < (o.pw ?? 0.5) ? 1 : -1) * 0.6 + (p * 2 - 1) * 0.4;
        const env = Math.min(1, t / 0.003) * (i > len ? 1 - (i - len) / rel : 1) * Math.exp(-t * (o.decay ?? 3));
        put(music, s0 + i, lp.run(s) * env * g, o.pan ?? 0, o.verb ?? 0.35);
      }
    },
    /** Noise + tone riser ending exactly at beat b1. */
    riser(b0, b1, o = {}) {
      const g = o.gain ?? 0.3, s0 = idx(T(b0)), len = idx(T(b1 - b0)), nz = makeNoise(seed++);
      const bp = biquad();
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len, t = i / sr;
        if (i % 32 === 0) bp.set('bp', 300 * Math.pow(40, k), 1.2, sr);
        ph += (TAU * (200 + 1400 * k * k)) / sr;
        const v = bp.run(nz()) * 1.6 + Math.sin(ph) * 0.12 * (o.tone ?? 1);
        put(fx, s0 + i, v * Math.pow(k, 2) * g, Math.sin(t * 9) * 0.5, 0.3);
      }
    },
    downlifter(b, lenBeats, o = {}) {
      const g = o.gain ?? 0.25, s0 = idx(T(b)), len = idx(T(lenBeats)), nz = makeNoise(seed++);
      const bp = biquad();
      for (let i = 0; i < len; i++) {
        const k = i / len;
        if (i % 32 === 0) bp.set('bp', 8000 * Math.pow(1 / 40, k), 1, sr);
        put(fx, s0 + i, bp.run(nz()) * 1.5 * Math.pow(1 - k, 1.5) * g, 0, 0.3);
      }
    },
    impact(b, o = {}) {
      const g = o.gain ?? 0.8, s0 = idx(T(b)), len = idx(2.2), nz = makeNoise(seed++);
      const lp = biquad(); lp.set('lp', 900, 0.7, sr);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        ph += (TAU * (32 + 60 * Math.exp(-t * 7))) / sr;
        const v = Math.sin(ph) * Math.exp(-t * 2.2) * 0.9 + lp.run(nz()) * Math.exp(-t * 5) * 0.8;
        put(fx, s0 + i, Math.tanh(v * 1.5) * g, 0, 0.6);
      }
    },
    whoosh(b, lenBeats, o = {}) {
      const g = o.gain ?? 0.35, s0 = idx(T(b)), len = idx(T(lenBeats)), nz = makeNoise(seed++);
      const bp = biquad();
      for (let i = 0; i < len; i++) {
        const k = i / len, env = Math.sin(Math.PI * Math.pow(k, 0.6));
        if (i % 32 === 0) bp.set('bp', 400 + 5000 * env, 1.4, sr);
        put(fx, s0 + i, bp.run(nz()) * env * 1.8 * g, (o.dir ?? 1) * (k * 2 - 1) * 0.9, 0.2);
      }
    },
    /** Short UI tick / blip. */
    tick(b, o = {}) {
      const g = o.gain ?? 0.2, s0 = idx(T(b)), len = idx(0.05), f = o.freq ?? 2400;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        put(fx, s0 + i, Math.sin(TAU * f * t) * Math.exp(-t * 90) * g, o.pan ?? 0, 0.15);
      }
    },
    /** Pitch-drop laser zap. */
    zap(b, o = {}) {
      const g = o.gain ?? 0.2, s0 = idx(T(b)), len = idx(0.18);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        ph += (TAU * ((o.from ?? 3000) * Math.exp(-t * 30) + 80)) / sr;
        put(fx, s0 + i, Math.sin(ph) * Math.exp(-t * 18) * g, o.pan ?? 0, 0.3);
      }
    },
    /** Bit-crushed stutter burst. */
    glitch(b, lenBeats, o = {}) {
      const g = o.gain ?? 0.25, s0 = idx(T(b)), len = idx(T(lenBeats)), nz = makeNoise(seed++);
      const gate = T(0.125) * sr;
      let hold = 0;
      for (let i = 0; i < len; i++) {
        if (i % 24 === 0) hold = Math.round(nz() * 4) / 4;
        const on = (Math.floor(i / gate) % 2 === 0) ? 1 : 0;
        put(fx, s0 + i, hold * on * g * Math.sin(i * 0.05), (Math.floor(i / gate) % 2 ? 0.5 : -0.5), 0.1);
      }
    },
    subdrop(b, o = {}) {
      const g = o.gain ?? 0.6, s0 = idx(T(b)), len = idx(o.len ?? 1.4);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        ph += (TAU * (70 * Math.exp(-t * 1.2) + 28)) / sr;
        put(fx, s0 + i, Math.sin(ph) * Math.exp(-t * 1.8) * Math.min(1, t / 0.01) * g);
      }
    },
    /** Tape stop on the music bus from beat b for lenBeats (pitch-down + fade). */
    silence: [],
    mute(b0, b1) { m.silence.push([T(b0), T(b1)]); },
  };

  REEL.music(m);

  // Sidechain the music bus against the kicks.
  const scDepth = REEL.sidechain ?? 0.7;
  const sc = new Float32Array(N).fill(1);
  for (const k of kicks) {
    const s0 = idx(k), len = idx(0.22);
    for (let i = 0; i < len && s0 + i < N; i++) {
      const x = i / len;
      const g = 1 - scDepth * Math.pow(1 - x, 2.2);
      sc[s0 + i] = Math.min(sc[s0 + i], g);
    }
  }
  const [rvL, rvR] = reverb(send[0], send[1], sr, REEL.reverbSize ?? 1.1);
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = drums[0][i] + music[0][i] * sc[i] + fx[0][i] + rvL[i] * (0.6 + 0.4 * sc[i]);
    R[i] = drums[1][i] + music[1][i] * sc[i] + fx[1][i] + rvR[i] * (0.6 + 0.4 * sc[i]);
  }
  for (const [a, b] of m.silence) {
    const i0 = idx(a), i1 = idx(b), f = idx(0.004);
    for (let i = i0; i < i1 && i < N; i++) {
      const g = Math.min(1, Math.max(0, Math.min(i - i0, i1 - i) / f));
      L[i] *= 1 - g; R[i] *= 1 - g;
    }
  }
  // Master: gentle drive, then normalise to -1 dBFS, then trim to reel length with a short fade.
  const out = Math.round(dur * sr), fade = idx(REEL.fadeOut ?? 0.6);
  // Normalise first, then a gentle soft-clip — keeps transients instead of squashing the mix.
  let peak = 0;
  for (let i = 0; i < out; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const pre = 1 / (peak || 1), drive = REEL.drive ?? 1.1, dn = Math.tanh(drive);
  for (let i = 0; i < out; i++) {
    L[i] = Math.tanh(L[i] * pre * drive) / dn; R[i] = Math.tanh(R[i] * pre * drive) / dn;
  }
  const norm = 0.89;
  const pcm = Buffer.alloc(out * 4);
  for (let i = 0; i < out; i++) {
    const f = i > out - fade ? (out - i) / fade : 1;
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm * f)) * 32767), i * 4);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm * f)) * 32767), i * 4 + 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
  hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(outPath, Buffer.concat([hdr, pcm]));
}
