import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { useBrandFonts } from './lib/fonts';
import { F } from './lib/theme';
import { fixAI, HandleTag } from './components/Frame';

export type CoverProps = { photo: string; kicker?: string; lines: string[]; handle: string; focusY?: number };

/**
 * Reels kapağı (1080x1920). Fotoğraf videodan alınmış gerçek bir kare: işlenmez, renkli kalır, tam ekran.
 * Instagram profil ızgarası ortadan 3:4 kırpar (y 240–1680): yüz ve başlık bu bandın içinde kalmalı.
 */
export const Cover: React.FC<CoverProps> = ({ photo, kicker, lines, handle, focusY = 0.35 }) => {
  useBrandFonts();
  const size = Math.max(...lines.map((l) => l.length)) <= 16 ? 112 : 92;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Img src={staticFile(photo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${focusY * 100}%` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.72) 72%, rgba(0,0,0,0.9) 100%)' }} />
      <div style={{ position: 'absolute', left: 72, right: 60, top: 1130 }}>
        {kicker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', boxShadow: '0 0 18px rgba(255,255,255,0.9)' }} />
            <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 32, letterSpacing: 6, color: 'rgba(255,255,255,0.85)' }}>{kicker.toLocaleUpperCase('tr-TR')}</span>
          </div>
        )}
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -4, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap', textShadow: '0 6px 30px rgba(0,0,0,0.55)' }}>{fixAI(l)}</div>
        ))}
      </div>
      <HandleTag handle={handle} still />
    </AbsoluteFill>
  );
};
