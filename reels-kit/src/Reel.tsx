import React from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ReelProps } from './types';
import { autoCamera, cameraAt, duckedVolume } from './lib/camera';
import { useBrandFonts } from './lib/fonts';
import { Captions } from './components/Captions';
import { BuvePopups, HookTitle, LowerThird, ProgressBar, Wordmark } from './components/Overlays';
import { BottomHandle, FRAME, FrameBackground, FrameBorder, HandleTag, TitleCard, TopPanel } from './components/Frame';
import { C, crewupaTheme, ThemeCtx } from './lib/theme';

export const Reel: React.FC<ReelProps> = (p) => {
  useBrandFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  // Kamera: elle verilmediyse konuşmadan otomatik üretilir
  const rig = React.useMemo(() => {
    if (p.camera.length) return { keys: p.camera, cuts: p.camera.map((k) => k.t).filter((x) => x > 0.5) };
    if (p.autoCamera) return autoCamera(p.words, p.durationSec, 2.6, p.cameraIntensity ?? 1);
    return { keys: [], cuts: [] as number[] };
  }, [p.camera, p.autoCamera, p.words, p.durationSec, p.cameraIntensity]);
  const cam = cameraAt(t, rig.keys);
  // el kamerası hissi: çok hafif, yavaş salınım
  const sway = { x: Math.sin(t * 1.3) * 0.004, y: Math.cos(t * 1.7) * 0.003, r: Math.sin(t * 0.9) * 0.25 };
  const fill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${p.focus.x * 100}% ${p.focus.y * 100}%` };

  const framed = p.layout === 'framed' && !!p.frame;
  const clean = p.layout === 'clean' && !!p.frame;
  const videoBox: React.CSSProperties = framed
    ? { position: 'absolute', left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: FRAME.r, overflow: 'hidden' }
    : { position: 'absolute', inset: 0 };
  return (
    <ThemeCtx.Provider value={p.theme ?? crewupaTheme}>
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {framed && <FrameBackground />}
      <div style={videoBox}>
      {/* ana video + kamera */}
      <AbsoluteFill style={{ transformOrigin: `50% ${p.focus.y * 100}%`, transform: `translate(${(cam.x + sway.x) * 100}%, ${(cam.y + sway.y) * 100}%) rotate(${cam.rot + sway.r}deg) scale(${cam.scale})` }}>
        <OffthreadVideo src={staticFile(p.video)} style={fill} />
      </AbsoluteFill>

      {/* farklı açı / ek görüntüler */}
      {p.cutaways.map((c, i) => {
        const from = Math.round(c.from * fps), dur = Math.max(1, Math.round((c.to - c.from) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <CutawayView src={c.src} layout={c.layout} startFrom={Math.round((c.startFrom ?? 0) * fps)} mute={c.mute !== false} dur={dur} />
          </Sequence>
        );
      })}

      {/* okunabilirlik için alt/üst karartma */}
      <AbsoluteFill style={{ background: clean ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)' : framed ? 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)' : 'linear-gradient(180deg, rgba(11,8,22,0.35) 0%, rgba(11,8,22,0) 22%, rgba(11,8,22,0) 55%, rgba(11,8,22,0.55) 100%)' }} />
      </div>

      {framed && p.frame && (
        <>
          <FrameBorder />
          <TopPanel topic={p.frame.topic} kicker={p.frame.kicker} />
          <BottomHandle handle={p.frame.handle} platform={p.frame.platform} />
        </>
      )}
      {clean && p.frame && (
        <>
          <TitleCard topic={p.frame.topic} kicker={p.frame.kicker} />
          <HandleTag handle={p.frame.handle} />
        </>
      )}
      {!framed && !clean && p.hook && <HookTitle {...p.hook} />}
      {!framed && !clean && p.speaker && <LowerThird {...p.speaker} />}
      {!framed && !clean && <Wordmark text={p.brand.wordmark} />}
      <Captions words={p.words} style={p.captionStyle} y={p.captionY} compact={framed || clean} />
      <BuvePopups pops={p.buve} />
      {!framed && !clean && <ProgressBar total={durationInFrames} />}

      {/* ses: müzik (konuşmada kısılır) + kesim whoosh'ları */}
      {p.music && <Audio src={staticFile(p.music.src)} loop volume={(f) => duckedVolume(f / fps, p.words, p.music!.volume, p.music!.duck)} />}
      {p.sfx && rig.cuts.map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round((c - 0.06) * fps))} durationInFrames={Math.round(1.3 * fps)}>
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};

const CutawayView: React.FC<{ src: string; layout: 'full' | 'pip'; startFrom: number; mute: boolean; dur: number }> = ({ src, layout, startFrom, mute, dur }) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 2, dur - 2, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const style: React.CSSProperties = layout === 'full'
    ? { position: 'absolute', inset: 0, opacity: a, transform: `scale(${1 + f * 0.0002})` }
    : { position: 'absolute', right: 60, top: 360, width: 420, height: 746, borderRadius: 40, overflow: 'hidden', opacity: a, boxShadow: '0 20px 50px rgba(11,8,22,0.55)', border: `4px solid rgba(255,255,255,0.85)` };
  return (
    <div style={style}>
      <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted={mute} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};
