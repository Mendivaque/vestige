import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel';
import type { ReelProps } from './types';
import reel from '../public/reel.json';

const props = reel as unknown as ReelProps;

export const Root: React.FC = () => (
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
);
