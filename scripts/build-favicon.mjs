/**
 * Build favicons from logo-mark on light #F2F2F7 canvas.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "logo-mark.png");
const bg = { r: 242, g: 242, b: 247, alpha: 1 };

async function writeSquare(size, filename) {
  const pad = Math.max(2, Math.round(size * 0.12));
  const inner = size - pad * 2;

  const mark = await sharp(src)
    .trim({ threshold: 1 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(root, "assets", filename));

  console.log(`Wrote assets/${filename} (${size}x${size})`);
}

await writeSquare(16, "favicon-16.png");
await writeSquare(32, "favicon-32.png");
await writeSquare(48, "favicon-48.png");
await writeSquare(180, "apple-touch-icon.png");
await writeSquare(512, "favicon-512.png");
