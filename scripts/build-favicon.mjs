/**
 * Build favicons from logo-mark.png — white mark on transparent, tight square crop.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "logo-mark.png");

async function getWhiteMarkBuffer() {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (lum > 48) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = 255;
    } else {
      pixels[i + 3] = 0;
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function writeSquare(size, filename) {
  const pad = size <= 32 ? 1 : Math.max(2, Math.round(size * 0.02));
  const inner = size - pad * 2;

  const markPng = await getWhiteMarkBuffer();
  const trimmed = await sharp(markPng).trim().png().toBuffer();

  await sharp(trimmed)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(join(root, "assets", filename));

  console.log(`Wrote assets/${filename} (${size}x${size})`);
}

await writeSquare(16, "favicon-16.png");
await writeSquare(32, "favicon-32.png");
await writeSquare(48, "favicon-48.png");
await writeSquare(180, "apple-touch-icon.png");
await writeSquare(512, "favicon-512.png");
