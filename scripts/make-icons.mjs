/**
 * assets/icon.svg → public/icon/*.png
 * İkonu elle dışa aktarmak yerine tek kaynaktan üretiyoruz:
 *   node scripts/make-icons.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [16, 32, 48, 96, 128];

const svg = await readFile(join(root, 'assets/icon.svg'));
await mkdir(join(root, 'public/icon'), { recursive: true });

for (const size of SIZES) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(root, `public/icon/${size}.png`), png);
  console.log(`icon/${size}.png`);
}

// Mağaza listelemesi 128px'lik ayrı bir dosya istiyor.
await writeFile(
  join(root, 'store/icon-128.png'),
  await sharp(svg, { density: 384 }).resize(128, 128).png().toBuffer(),
);
console.log('store/icon-128.png');

// Küçük tanıtım kutusu (440x280) — mağazada listelemenin yanında görünür.
const promo = await readFile(join(root, 'assets/promo-small.svg'));
await writeFile(
  join(root, 'store/promo-440x280.png'),
  await sharp(promo, { density: 200 }).resize(440, 280).png().toBuffer(),
);
console.log('store/promo-440x280.png');
