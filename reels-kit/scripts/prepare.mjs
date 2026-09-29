#!/usr/bin/env node
// Ham videoyu + altyazı dosyasını Remotion'un okuyacağı public/reel.json'a çevirir.
//
//   node scripts/prepare.mjs --video public/input.mp4 --srt altyazi.srt \
//        --hook "30 günde|ekibini kur" --name "Emirhan Coşkun" --role "crewupa kurucusu" \
//        --emph "30,crewupa,ücretsiz" --music public/music.mp3 --buve "6,2.5;12,2.5"
//
//   Altyazı girdisi: .srt (cümle bazlı, kelime süreleri orantılı dağıtılır) veya
//   Whisper tarzı .json (kelime bazlı zaman damgası; en iyi senkron bununla olur).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] ?? true) : d; };
const lower = (s) => s.toLocaleLowerCase('tr-TR');
const THEMES = {
  minimal: { accent: '#ffffff', accent2: '#ffffff', ink: '#000000', text: '#ffffff', muted: 'rgba(255,255,255,0.72)', pillText: '#000000', card: 'rgba(0,0,0,0.62)', bar: '#ffffff' },
};

/* ---- video: public/ içine al, süreyi/boyutu oku ---- */
let video = path.resolve(root, opt('video', 'public/input.mp4'));
if (!fs.existsSync(video)) { console.error('Video bulunamadı: ' + video); process.exit(1); }
const pub = path.join(root, 'public');
if (!video.startsWith(pub + path.sep)) { const dst = path.join(pub, path.basename(video)); fs.copyFileSync(video, dst); video = dst; }
const videoName = path.relative(pub, video);

function probe(file) {
  const bin = path.join(root, 'node_modules/.bin/remotion');
  try {
    const j = JSON.parse(execFileSync(bin, ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' }));
    const v = j.streams.find((s) => s.codec_type === 'video');
    const [n, d] = String(v.avg_frame_rate || v.r_frame_rate).split('/').map(Number);
    return { w: v.width, h: v.height, fps: n / (d || 1), dur: parseFloat(j.format.duration) };
  } catch (e) {
    const err = String(e.stderr || e.message);
    console.error('ffprobe çalışmadı, ffmpeg çıktısından okunuyor');
    const out = execFileSync(bin, ['ffmpeg', '-i', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString() + err;
    const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/), s = out.match(/(\d{3,5})x(\d{3,5})/);
    return { w: +s[1], h: +s[2], fps: 30, dur: +m[1] * 3600 + +m[2] * 60 + +m[3] };
  }
}
const info = probe(video);

/* ---- altyazı → kelime zamanları ---- */
const tc = (s) => { const m = s.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +('0.' + m[4]); };
function parseWords(file) {
  const txt = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const j = JSON.parse(txt);
    const arr = Array.isArray(j) ? j : j.words || (j.segments || []).flatMap((s) => s.words || []);
    return arr.map((w) => ({ text: String(w.text ?? w.word).trim(), start: +w.start, end: +w.end })).filter((w) => w.text);
  }
  const out = [];
  for (const block of txt.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n').filter(Boolean), ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const [a, c] = lines[ti].split('-->').map(tc);
    const words = lines.slice(ti + 1).join(' ').split(/\s+/).filter(Boolean);
    const total = words.reduce((n, w) => n + w.length + 1, 0), span = c - a;
    let cur = a;
    words.forEach((w) => { const d = (span * (w.length + 1)) / total; out.push({ text: w, start: +cur.toFixed(3), end: +(cur + d * 0.92).toFixed(3) }); cur += d; });
  }
  return out;
}
const emph = new Set(String(opt('emph', '')).split(',').map((s) => lower(s.trim())).filter(Boolean));
let words = [];
const capFile = opt('words', opt('srt', null));
if (capFile && capFile !== true) words = parseWords(path.resolve(root, capFile));
words = words.map((w) => ({ ...w, emphasis: /\d/.test(w.text) || emph.has(lower(w.text.replace(/[.,!?…:;]+$/g, ''))) || undefined }));

/* ---- diğer ayarlar ---- */
const durationSec = +(+opt('duration', info.dur)).toFixed(3);
// --cutaways "angles/a.mp4,8.0,6.5;angles/b.mp4,25.9,4.9"  (dosya, başlangıç sn, süre sn[, full|pip])
const cutaways = String(opt('cutaways', '')).split(';').filter(Boolean).map((s) => {
  const [src, from, dur, layout] = s.split(',');
  return { src, from: +from, to: +from + +dur, layout: layout || 'full', startFrom: 0, mute: true };
});
const pair = (s) => String(s).split(';').filter(Boolean).map((x) => x.split(',').map(Number));
const reel = {
  video: videoName, durationSec, fps: +opt('fps', 30), videoWidth: info.w, videoHeight: info.h,
  focus: { x: +opt('focus-x', 0.5), y: +opt('focus-y', 0.4) },
  words, camera: [], autoCamera: opt('no-auto-camera', false) === false, cameraIntensity: +opt('camera-intensity', 1), sfx: opt('no-sfx', false) === false,
  cutaways, buve: pair(opt('buve', '')).map(([t, dur], i) => ({ t, dur: dur || 2.5, side: i % 2 ? 'left' : 'right' })),
  captionStyle: opt('caption-style', 'pill'), captionY: +opt('caption-y', 0.66),
  brand: { wordmark: opt('wordmark', '') },
};
if (['framed', 'clean'].includes(opt('layout', 'full'))) {
  reel.layout = opt('layout');
  reel.frame = { topic: String(opt('topic', 'Konu başlığı')).replace(/\|/g, '\n'), kicker: opt('kicker', undefined), handle: String(opt('handle', '@emirhanca.dev')), platform: String(opt('platform', 'instagram')) };
  if (opt('caption-y', false) === false) reel.captionY = 0.68;
}
if (reel.layout && !opt('theme', false)) reel.theme = THEMES.minimal; // kişisel şablonlar varsayılan olarak siyah-beyaz (marka renkleri yok)
if (opt('theme', false) && THEMES[opt('theme')]) reel.theme = THEMES[opt('theme')];
if (opt('hook', false)) reel.hook = { text: String(opt('hook')).replace(/\|/g, '\n'), sub: opt('hook-sub', undefined), duration: +opt('hook-dur', 2.4) };
if (opt('name', false)) reel.speaker = { name: opt('name'), role: opt('role', undefined), from: +opt('name-from', 2.6), duration: 3.2 };
if (opt('music', false)) reel.music = { src: path.relative(pub, path.resolve(root, opt('music'))), volume: +opt('music-vol', 0.32), duck: +opt('duck', 0.35) };

const out = path.resolve(root, opt('out', 'public/reel.json'));
fs.writeFileSync(out, JSON.stringify(reel, null, 2));
console.log(`✓ ${path.relative(root, out)}  ${info.w}x${info.h}, ${durationSec}s, ${words.length} kelime`);
