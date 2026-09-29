import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel';
import { Cover } from './Cover';
import type { ReelProps } from './types';
import reel from '../public/reel.json';

const props = reel as unknown as ReelProps;

export const Root: React.FC = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={props.fps}
    durationInFrames={Math.max(1, Math.round(props.durationSec * props.fps))}
    defaultProps={props}
    calculateMetadata={({ props: p }) => ({ durationInFrames: Math.max(1, Math.round(p.durationSec * p.fps)), fps: p.fps })}
  />
  <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1}
    defaultProps={{ photo: 'cover/face.png', kicker: 'Konu', lines: ['AI kodu yazar.', 'Peki ya sonrası?'], handle: '@emirhanca.dev' }} />
  </>
);
