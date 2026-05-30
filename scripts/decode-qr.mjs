import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";

function decodePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return code ? code.data : null;
}

const local = decodePng(path.join(root, "assets/join-qr.png"));
console.log("Local PNG decodes to:", local);

const res = await fetch("https://orbitwaitlist.au/assets/join-qr.png");
const buf = Buffer.from(await res.arrayBuffer());
const png = PNG.sync.read(buf);
const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
console.log("Production PNG decodes to:", code ? code.data : "FAILED");
