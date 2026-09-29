import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { BuvePop, ReelProps } from '../types';
import { C, F, SAFE } from '../lib/theme';

const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return { f, fps, t: f / fps }; };

/** İlk saniyelerde ekrana giren dikkat çekici başlık (satırlar '\n' ile ayrılır). */
export const HookTitle: React.FC<NonNullable<ReelProps['hook']>> = ({ text, sub, duration }) => {
  const { f, fps, t } = useT();
  if (t > duration) return null;
  const out = interpolate(t, [duration - 0.35, duration], [1, 0], { extrapolateLeft: 'clamp' });
  const lines = text.split('\n');
  return (
    <div style={{ position: 'absolute', left: SAFE.left, right: 90, top: 330, opacity: out }}>
      {lines.map((l, i) => {
        const p = spring({ frame: f - i * 4, fps, config: { damping: 15, stiffness: 180, mass: 0.7 } });
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: 6 }}>
            <div style={{
              fontFamily: F.disp, fontWeight: 900, fontSize: 104, lineHeight: 1.05, letterSpacing: -3, color: i === lines.length - 1 ? C.amb : C.lav,
              transform: `translateY(${(1 - p) * 120}%)`, WebkitTextStroke: `10px ${C.bg}`, paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
            }}>{l}</div>
          </div>
        );
      })}
      {sub && (
        <div style={{ marginTop: 18, display: 'inline-block', fontFamily: F.mono, fontWeight: 500, fontSize: 28, letterSpacing: 3, color: C.lav, background: C.v1, borderRadius: 999, padding: '10px 26px', opacity: interpolate(f, [10, 20], [0, 1], { extrapolateRight: 'clamp' }) }}>{sub}</div>
      )}
    </div>
  );
};

/** Konuşmacı adı / rolü kartı (sol üstten kayarak girer). */
export const LowerThird: React.FC<NonNullable<ReelProps['speaker']>> = ({ name, role, from, duration }) => {
  const { f, fps, t } = useT();
  if (t < from || t > from + duration) return null;
  const p = spring({ frame: f - Math.round(from * fps), fps, config: { damping: 16, stiffness: 170, mass: 0.8 } });
  const out = interpolate(t, [from + duration - 0.4, from + duration], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: SAFE.left, top: 300, transform: `translateX(${(1 - p) * -120}%)`, opacity: out }}>
      <div style={{ background: `linear-gradient(90deg, ${C.v1}, ${C.mid})`, borderRadius: 30, padding: '18px 34px 20px', boxShadow: '0 16px 40px rgba(11,8,22,0.45)' }}>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: -1 }}>{name}</div>
        {role && <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 28, color: C.v4, marginTop: 4 }}>{role}</div>}
      </div>
    </div>
  );
};

export const ProgressBar: React.FC<{ total: number }> = ({ total }) => {
  const { f } = useT();
  return (
    <div style={{ position: 'absolute', left: SAFE.left, width: SAFE.right - SAFE.left, top: 1478, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
      <div style={{ width: `${(f / Math.max(1, total)) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.v2}, ${C.teal})` }} />
    </div>
  );
};

export const Wordmark: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: 'absolute', right: 90, top: 296, fontFamily: F.disp, fontWeight: 800, fontSize: 36, letterSpacing: -1.4, color: C.lav, opacity: 0.92, textShadow: '0 4px 16px rgba(11,8,22,0.6)' }}>{text}</div>
);

/** Buve köşeden çıkar, el sallar, geri iner. Gövde ve el ayrı katman: el gerçekten sallanır. */
export const BuvePopups: React.FC<{ pops: BuvePop[] }> = ({ pops }) => {
  const { f, fps, t } = useT();
  const pop = pops.find((p) => t >= p.t && t < p.t + p.dur);
  if (!pop) return null;
  const inP = spring({ frame: f - Math.round(pop.t * fps), fps, config: { damping: 12, stiffness: 160, mass: 0.8 } });
  const outP = interpolate(t, [pop.t + pop.dur - 0.35, pop.t + pop.dur], [0, 1], { extrapolateLeft: 'clamp' });
  const rise = (1 - inP) * 110 + outP * 110;
  const wave = Math.sin((t - pop.t) * 11) * 13;
  const size = 640;
  const side = pop.side === 'left' ? { left: -110 } : { right: -110, transform: 'scaleX(1)' };
  return (
    <div style={{ position: 'absolute', top: 1040, width: size, height: size, transform: `translateY(${rise}%) rotate(${pop.side === 'left' ? -4 : 4}deg)`, ...side }}>
      <Img src={staticFile('buve/buve-body.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Img src={staticFile('buve/buve-hand.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: '23.1% 46.1%', transform: `rotate(${wave}deg)` }} />
    </div>
  );
};
