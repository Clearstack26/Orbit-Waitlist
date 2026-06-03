/**
 * OG share image: logo mark centred on #F2F2F7.
 */
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets", "logo-mark.png");
const out = join(root, "assets", "og-image.png");
const W = 1200;
const H = 630;
const bg = { r: 242, g: 242, b: 247, alpha: 1 };

const markSize = 280;
const mark = await sharp(src)
  .trim({ threshold: 1 })
  .resize(markSize, markSize, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp({
  create: { width: W, height: H, channels: 4, background: bg },
})
  .composite([{ input: mark, gravity: "centre" }])
  .png()
  .toFile(out);

console.log("Wrote assets/og-image.png");
