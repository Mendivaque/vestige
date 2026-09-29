import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Word } from '../types';
import { buildPages, clean } from '../lib/captions';
import { F, up, useTheme } from '../lib/theme';

/**
 * Kelime kelime beliren, konuşulan kelimeyi vurgulayan altyazı.
 * pill: konuşulan kelimenin arkasında renkli hap · outline: sadece renk değişimi + kalın çerçeve.
 */
export const Captions: React.FC<{ words: Word[]; style: 'pill' | 'outline'; y: number; compact?: boolean }> = ({ words, style, y, compact }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pages = React.useMemo(() => buildPages(words), [words]);
  const page = pages.find((p) => t >= p.start - 0.03 && t < p.end);
  if (!page) return null;

  const pin = spring({ frame: frame - Math.round((page.start - 0.03) * fps), fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const exit = interpolate(t, [page.end - 0.08, page.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute', left: compact ? 110 : 60, right: compact ? 110 : 60, top: `${y * 100}%`,
        transform: `translateY(-50%) scale(${interpolate(pin, [0, 1], [0.86, 1])})`,
        opacity: Math.min(1, pin * 2) * exit,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: compact ? '6px 30px' : '10px 18px',
      }}
    >
      {page.words.map((w, i) => {
        if (t < w.start - 0.02) return null; // kelime konuşulunca belirir
        const next = page.words[i + 1];
        const active = t >= w.start && t < (next ? next.start : page.end);
        const wp = spring({ frame: frame - Math.round(w.start * fps), fps, config: { damping: 11, stiffness: 300, mass: 0.5 } });
        const scale = interpolate(wp, [0, 1], [0.7, 1]) * (active ? 1.1 : 1);
        const hot = !!w.emphasis;
        const pillBg = hot ? T.accent2 : T.accent;
        const color = style === 'pill' ? (active ? T.pillText : hot ? T.accent2 : T.text) : active ? (hot ? T.accent2 : T.accent) : T.text;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', fontFamily: F.disp, fontWeight: 900, fontSize: compact ? 72 : 82, lineHeight: 1.08, letterSpacing: compact ? -1 : -1.5,
              color, transform: `scale(${scale}) rotate(${active ? -1.5 : 0}deg)`,
              padding: style === 'pill' ? '4px 20px 8px' : '0 4px',
              borderRadius: 26,
              background: style === 'pill' && active ? pillBg : 'transparent',
              WebkitTextStroke: style === 'pill' && active ? '0px' : `${compact ? 10 : 12}px ${T.ink}`,
              paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
              textShadow: style === 'pill' && active ? 'none' : `0 8px 24px rgba(0,0,0,0.55)`,
              boxShadow: style === 'pill' && active ? `0 10px 30px rgba(0,0,0,0.5)` : 'none',
              opacity: interpolate(wp, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            {up(clean(w.text))}
          </span>
        );
      })}
    </div>
  );
};
