#!/usr/bin/env node
// Render a reel to MP4 (1080x1920, H.264 + AAC) or preview stills.
//
//   node render.mjs 1                      → out/reel1.mp4 (+ out/reel1.wav)
//   node render.mjs 1 --sheet 0,0.5,1,2    → out/reel1-sheet.png (contact sheet)
//   node render.mjs 1 --sheet auto         → 36 evenly spaced frames
//   node render.mjs 1 --still 3.2          → out/reel1-3.20.png (full-res)
//   node render.mjs 1 --audio-only
//   options: --fps 60  --workers 3  --from 0 --to 15
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderMusic } from './audio.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const reelId = args[0];
if (!reelId) { console.error('usage: node render.mjs <reel> [--sheet ...|--still t|--audio-only]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] ?? true) : d; };

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); }
  catch { return 'ffmpeg'; }
}

// Load the reel spec in Node for its music + timing metadata.
function loadReel() {
  const ctx = { console, Math };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, `reels/reel${reelId}.js`), 'utf8'), ctx);
  return ctx.REEL;
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  const extra = args.includes('--name') ? `&name=${encodeURIComponent(opt('name'))}` : '';
  await page.goto(`http://127.0.0.1:${port}/player.html?reel=${reelId}${extra}`);
  await page.waitForFunction(() => window.ready === true || false, null, { timeout: 30000 }).catch((e) => {
    throw errors[0] || e;
  });
  return page;
}

const REEL = loadReel();
const fps = Number(opt('fps', REEL.fps));
const wav = path.join(OUT, `reel${reelId}.wav`);
console.log(`reel ${reelId}: "${REEL.title}" ${REEL.duration}s @ ${fps}fps, ${REEL.bpm} BPM`);

let t0 = Date.now();
renderMusic(REEL, wav);
console.log(`audio → ${path.relative(ROOT, wav)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (args.includes('--audio-only')) process.exit(0);

const srv = await serve();
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });

try {
  if (opt('sheet')) {
    const page = await openPage(browser, port);
    let times = String(opt('sheet'));
    times = times === 'auto' || times === 'true'
      ? Array.from({ length: 36 }, (_, i) => (i / 36) * REEL.duration + 0.05)
      : times.split(',').map(Number);
    const cols = Number(opt('cols', 6));
    const b64 = await page.evaluate(([t, c]) => window.contactSheet(t, c), [times, cols]);
    const f = path.join(OUT, opt('out', `reel${reelId}-sheet.png`));
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log(`sheet → ${path.relative(ROOT, f)}`);
  } else if (opt('still')) {
    const page = await openPage(browser, port);
    for (const t of String(opt('still')).split(',').map(Number)) {
      const b64 = await page.evaluate((t) => window.grabFrame(t, 'image/png'), t);
      const f = path.join(OUT, `reel${reelId}-${t.toFixed(2)}.png`);
      fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      console.log(`still → ${path.relative(ROOT, f)}`);
    }
  } else {
    const from = Number(opt('from', 0)), to = Number(opt('to', REEL.duration));
    const total = Math.round((to - from) * fps);
    const workers = Number(opt('workers', 3));
    const mp4 = path.join(OUT, opt('out', `reel${reelId}.mp4`));
    const ff = spawn(ffmpegPath(), [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-ss', String(from), '-t', String(to - from), '-i', wav,
      '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '16M', '-bufsize', '32M', '-profile:v', 'high',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', mp4,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))));

    const fail = (e) => { try { ff.kill('SIGKILL'); fs.rmSync(mp4, { force: true }); } catch {} throw e; };
    const pages = await Promise.all(Array.from({ length: workers }, () => openPage(browser, port))).catch(fail);
    const done = new Map();
    let next = 0, written = 0;
    t0 = Date.now();
    const flush = async () => {
      while (done.has(written)) {
        const buf = done.get(written); done.delete(written);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        written++;
        if (written % fps === 0 || written === total) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r  frame ${written}/${total}  ${(written / el).toFixed(1)} fps  eta ${((total - written) / (written / el)).toFixed(0)}s   `);
        }
      }
    };
    let flushing = Promise.resolve();
    await Promise.all(pages.map(async (page) => {
      while (next < total) {
        const i = next++;
        const t = from + i / fps;
        const b64 = await page.evaluate((t) => window.grabFrame(t, 'image/jpeg', 0.97), t).catch(fail);
        done.set(i, Buffer.from(b64, 'base64'));
        flushing = flushing.then(flush);
        // Back-pressure: don't let one fast worker run far ahead of the writer.
        while (done.size > workers * 8) await new Promise((r) => setTimeout(r, 5));
      }
    }));
    await flushing;
    ff.stdin.end();
    await ffDone;
    console.log(`\nvideo → ${path.relative(ROOT, mp4)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
} finally {
  await browser.close();
  srv.close();
}
