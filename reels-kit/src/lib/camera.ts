import type { CamKey, Word } from '../types';

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** t saniyesinde kamera durumu: anahtar kareler arasında yumuşak geçiş. */
export function cameraAt(t: number, keys: CamKey[]) {
  if (!keys.length) return { scale: 1, x: 0, y: 0, rot: 0 };
  const ks = [...keys].sort((a, b) => a.t - b.t);
  const d = (k: CamKey) => ({ scale: k.scale, x: k.x ?? 0, y: k.y ?? 0, rot: k.rot ?? 0 });
  if (t <= ks[0].t) return d(ks[0]);
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t < b.t) {
      const p = (t - a.t) / Math.max(1e-6, b.t - a.t);
      const e = b.ease === 'linear' ? p : b.ease === 'out' ? easeOut(p) : easeInOut(p);
      const A = d(a), B = d(b);
      return { scale: lerp(A.scale, B.scale, e), x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e), rot: lerp(A.rot, B.rot, e) };
    }
  }
  return d(ks[ks.length - 1]);
}

/**
 * Konuşmadan otomatik "montaj" hissi: cümle sonlarında (en az minGap sn arayla) hızlı punch-in / punch-out,
 * iki kesim arasında yavaş bir itme (push-in). Dönen `cuts` whoosh sesleri için kullanılır.
 */
export function autoCamera(words: Word[], durationSec: number, minGap = 2.6, intensity = 1) {
  const cutTimes: number[] = [0];
  words.forEach((w, i) => {
    const endOfSentence = /[.?!…]$/.test(w.text) || (words[i + 1] && words[i + 1].start - w.end > 0.4);
    const t = words[i + 1] ? words[i + 1].start : w.end;
    if (endOfSentence && t - cutTimes[cutTimes.length - 1] >= minGap && t < durationSec - 1.2) cutTimes.push(t);
  });
  const scales = [1.0, 1.16, 1.04, 1.26, 1.1, 1.34];
  const shifts = [0, 0.018, -0.018, 0.026, -0.022, 0.012];
  const keys: CamKey[] = [];
  cutTimes.forEach((c, i) => {
    const next = cutTimes[i + 1] ?? durationSec;
    const S = 1 + (scales[i % scales.length] - 1) * intensity, X = shifts[i % shifts.length] * intensity, drift = 0.045 * intensity;
    keys.push({ t: i === 0 ? 0 : c + 0.2, scale: S, x: X, y: 0, ease: 'out' });
    keys.push({ t: next - 0.001, scale: S + drift, x: X * 1.2, y: 0, ease: 'linear' });
  });
  return { keys, cuts: cutTimes.slice(1) };
}

/** Müzik sesini konuşma varken kısar (kelime zamanlarına göre yumuşatılmış). */
export function duckedVolume(t: number, words: Word[], base: number, duck: number) {
  const speaking = (x: number) => words.some((w) => x >= w.start - 0.12 && x <= w.end + 0.25);
  const v = [t - 0.15, t, t + 0.15].map((x) => (speaking(x) ? base * duck : base));
  return (v[0] + v[1] + v[2]) / 3;
}
