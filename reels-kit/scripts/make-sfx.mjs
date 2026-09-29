#!/usr/bin/env node
// showreel/audio.mjs sentezleyicisiyle public/sfx/whoosh.wav üretir (bir kez çalıştırmak yeter).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMusic } from '../../showreel/audio.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'public/sfx'), { recursive: true });
renderMusic({ bpm: 120, duration: 1.3, fadeOut: 0.25, sidechain: 0, music(m) { m.whoosh(0, 1.6, { gain: 0.9 }); } }, path.join(root, 'public/sfx/whoosh.wav'));
console.log('✓ public/sfx/whoosh.wav');
