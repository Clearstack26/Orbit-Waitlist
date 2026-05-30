/**
 * Build favicons from logo-mark-white-notext.png — white mark on brand-dark square.
 * Dark background keeps the white logo visible on light browser tabs.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "logo-mark-white-notext.png");

/* Matches site --bg / theme-color */
const BG = { r: 4, g: 4, b: 15, alpha: 1 };

async function writeSquare(size, filename) {
  const pad = Math.max(2, Math.round(size * 0.08));
  const inner = size - pad * 2;

  await sharp(src)
    .resize(inner, inner, {
      fit: "contain",
      background: BG,
    })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: BG,
    })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(join(root, "assets", filename));

  console.log(`Wrote assets/${filename} (${size}x${size})`);
}

await writeSquare(16, "favicon-16.png");
await writeSquare(32, "favicon-32.png");
await writeSquare(48, "favicon-48.png");
await writeSquare(180, "apple-touch-icon.png");
await writeSquare(512, "favicon-512.png");
