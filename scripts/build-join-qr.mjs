/**
 * Build-time join URL manifest + static QR PNG (verification + backup).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "site-config.json"), "utf8"));

function normalizePath(p) {
  let path = String(p || "/join").trim() || "/join";
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

function resolveJoinUrl() {
  const raw = String(cfg.baseUrl || "").trim().replace(/\/$/, "");
  const joinPath = normalizePath(cfg.joinPath);
  let url = `${raw}${joinPath}`;
  if (!/^https:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/\//, "")}`;
  }
  return url;
}

const joinUrl = resolveJoinUrl();
const assetsDir = join(root, "assets");

mkdirSync(assetsDir, { recursive: true });

writeFileSync(
  join(root, "join-url.json"),
  `${JSON.stringify({ url: joinUrl }, null, 2)}\n`,
  "utf8"
);

const pngPath = join(assetsDir, "join-qr.png");
const pngBuffer = await QRCode.toBuffer(joinUrl, {
  type: "png",
  width: 1024,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#000000", light: "#ffffff" },
});

writeFileSync(pngPath, pngBuffer);
console.log("Wrote join-url.json");
console.log("Wrote assets/join-qr.png");
console.log(`Join URL: ${joinUrl}`);
