/**
 * Build favicons — resize ONLY the user-provided logo. No pixel redraw, no generation.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "logo-mark-white-notext.png");

async function writeSquare(size, filename) {
  const pad = Math.max(1, Math.round(size * 0.06));
  const inner = size - pad * 2;

  await sharp(src)
    .trim({ threshold: 1 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(root, "assets", filename));

  console.log(`Wrote assets/${filename} (${size}x${size}) from logo-mark-white-notext.png`);
}

await writeSquare(16, "favicon-16.png");
await writeSquare(32, "favicon-32.png");
await writeSquare(48, "favicon-48.png");
await writeSquare(180, "apple-touch-icon.png");
await writeSquare(512, "favicon-512.png");
