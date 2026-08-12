/**
 * Ham ekran görüntülerini mağaza formatına çevirir.
 *
 * Web Store şartı: tam olarak 1280x800, JPEG ya da **alfa kanalsız** 24-bit PNG.
 * Ekran kaydı araçlarının çıktısı neredeyse her zaman alfa kanallı ve yanlış
 * boyutta olur; bu betik ikisini de düzeltir ve üstüne başlık şeridini basar.
 *
 * Kullanım:
 *   1) Ham görüntüleri store/screenshots/raw/ içine 1.png, 2.png ... diye koy
 *      (sıra, aşağıdaki CAPTIONS sırasıyla eşleşiyor)
 *   2) node scripts/make-screenshots.mjs
 *   3) Çıktılar store/screenshots/ içinde
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'store/screenshots/raw');
const OUT = join(root, 'store/screenshots');

const W = 1280;
const H = 800;
const BAND = 132; // başlık şeridinin yüksekliği

const CAPTIONS = [
  'Every chat you’ve had, in one searchable place',
  'Real full-text search across every conversation',
  'It tells you when you’ve asked this before',
  'Recovers replies that were deleted upstream',
  'Imports your entire history — no manual exporting',
];

const escapeXml = (s) =>
  s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function background(caption) {
  return Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1c1815"/>
          <stop offset="100%" stop-color="#2b211a"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect x="64" y="52" width="6" height="34" rx="3" fill="#d97757"/>
      <text x="86" y="79" fill="#f4ece3"
            font-family="Segoe UI, system-ui, sans-serif"
            font-size="30" font-weight="600">${escapeXml(caption)}</text>
    </svg>
  `);
}

await mkdir(OUT, { recursive: true });
await mkdir(RAW, { recursive: true });

const files = (await readdir(RAW))
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (files.length === 0) {
  console.log(`Ham görüntü yok. Dosyaları buraya koy: ${RAW}`);
  process.exit(0);
}

for (const [i, file] of files.entries()) {
  const caption = CAPTIONS[i] ?? CAPTIONS[CAPTIONS.length - 1];

  // Görüntüyü şeridin altındaki alana sığdır, oranını bozma.
  const shot = await sharp(join(RAW, file))
    .resize({
      width: W - 128,
      height: H - BAND - 64,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const out = await sharp(background(caption))
    .composite([{ input: shot, top: BAND - 24, left: 64 }])
    // flatten() saydamlığı doldurur ama kanalı bırakır; removeAlpha() kanalı
    // gerçekten siler. Form alfa kanallı PNG kabul etmiyor.
    .flatten({ background: '#1c1815' })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const name = `${i + 1}.png`;
  await writeFile(join(OUT, name), out);

  const meta = await sharp(out).metadata();
  console.log(
    `${name}  ${meta.width}x${meta.height}  alfa:${meta.hasAlpha}  ← ${file}`,
  );
}

console.log(`\n${files.length} görüntü hazır: store/screenshots/`);
