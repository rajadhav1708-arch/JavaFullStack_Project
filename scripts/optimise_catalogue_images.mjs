/**
 * Turn the large source PNGs in frontend/public/products into responsive WebP
 * derivatives using the same naming convention as the older catalogue images:
 *
 *   product-01.png -> product-01-400.webp / -800.webp / -1600.webp
 *
 * `frontend/src/utils/images.ts` already understands that suffix, so the shop
 * can serve a 400px file to phones and the 1600px file to the detail modal.
 *
 * Run: node scripts/optimise_catalogue_images.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'frontend', 'public', 'products');
const SIZES = [400, 800, 1600];
const QUALITY = 82;

const files = (await fs.readdir(DIR)).filter((name) => /^product-\d+\.png$/i.test(name));

if (files.length === 0) {
  console.log('No source PNGs found.');
  process.exit(0);
}

let sourceBytes = 0;
let outputBytes = 0;

for (const file of files) {
  const input = path.join(DIR, file);
  const base = file.replace(/\.png$/i, '');
  const stat = await fs.stat(input);
  sourceBytes += stat.size;

  for (const size of SIZES) {
    const output = path.join(DIR, `${base}-${size}.webp`);
    await sharp(input)
      .rotate()
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(output);
    outputBytes += (await fs.stat(output)).size;
  }

  console.log(`${base}: ${(stat.size / 1024 / 1024).toFixed(1)} MB source -> 3 WebP files`);
}

console.log(
  `\n${files.length} products, ${SIZES.length} sizes each\n` +
    `${(sourceBytes / 1024 / 1024).toFixed(1)} MB PNG -> ${(outputBytes / 1024 / 1024).toFixed(1)} MB WebP`
);
