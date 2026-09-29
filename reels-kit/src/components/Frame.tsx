import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { F } from '../lib/theme';

/** Çerçeveli düzenin ölçüleri (1080x1920 tuval). Video bu dikdörtgenin içine kırpılır. */
export const FRAME = { x: 60, y: 430, w: 960, h: 1050, r: 44 };

export const FrameBackground: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(120% 70% at 50% 0%, #1b1b1e 0%, #0b0b0c 58%, #050505 100%)' }}>
    <AbsoluteFill style={{ opacity: 0.5, backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
  </AbsoluteFill>
);

/** Videonun etrafındaki ince çerçeve + gölge (videonun üstüne, kırpma kutusunun dışına çizilir). */
export const FrameBorder: React.FC = () => (
  <div style={{ position: 'absolute', left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: FRAME.r, border: '2px solid rgba(255,255,255,0.22)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />
);

/** Üst panel: konu başlığı. Uzun başlıklar otomatik küçülür (en fazla 2 satır). */
export const TopPanel: React.FC<{ topic: string; kicker?: string }> = ({ topic, kicker }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 18, stiffness: 140, mass: 0.9 } });
  const size = topic.length <= 24 ? 60 : topic.length <= 38 ? 52 : 44;
  return (
    <div style={{ position: 'absolute', left: FRAME.x, top: 190, width: FRAME.w, height: 210, transform: `translateY(${(1 - p) * -40}px)`, opacity: interpolate(f, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 36, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))', border: '2px solid rgba(255,255,255,0.16)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', left: 34, top: 40, width: 8, height: 130 * p, borderRadius: 4, background: '#fff' }} />
      <div style={{ position: 'absolute', left: 70, right: 36, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
        {kicker && <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 22, letterSpacing: 5, color: 'rgba(255,255,255,0.62)' }}>{kicker.toLocaleUpperCase('tr-TR')}</div>}
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: -1.2, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{topic}</div>
      </div>
    </div>
  );
};

const InstagramGlyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="5.2" />
    <circle cx="12" cy="12" r="4.1" />
    <circle cx="17.4" cy="6.6" r="0.9" fill="#fff" stroke="none" />
  </svg>
);

/** Alt şerit: platform ikonu + hesap adı. */
export const BottomHandle: React.FC<{ handle: string; platform?: string }> = ({ handle, platform = 'instagram' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - 10, fps, config: { damping: 18, stiffness: 140, mass: 0.9 } });
  return (
    <div style={{ position: 'absolute', left: FRAME.x, top: 1522, width: FRAME.w, height: 84, transform: `translateY(${(1 - p) * 40}px)`, opacity: interpolate(f, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 42, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))', border: '2px solid rgba(255,255,255,0.16)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <InstagramGlyph size={40} />
        <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 26, letterSpacing: 3, color: 'rgba(255,255,255,0.6)' }}>{platform.toUpperCase()}</span>
        <span style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 38, letterSpacing: -0.6, color: '#fff' }}>{handle}</span>
      </div>
    </div>
  );
};
