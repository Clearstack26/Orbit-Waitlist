/**
 * Generates orbit-waitlist.vcf and orbit-vcard-qr.json from site-config.json.
 * vCard QR works on Android, iOS, and Wallet pass apps (unlike bare URL in some scanners).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = join(root, "site-config.json");
const MAX_QR_PAYLOAD = 2800;

function escapeVCardValue(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function resolveJoinUrl(cfg) {
  const raw = String(cfg.baseUrl || "").trim().replace(/\/$/, "");
  const placeholder = "your-orbit-waitlist.vercel.app";
  const base =
    raw && !raw.includes(placeholder) ? raw : "https://orbit-waitlist-one.vercel.app";
  let path = String(cfg.joinPath || "/join").trim() || "/join";
  if (!path.startsWith("/")) path = "/" + path;
  return `${base}${path}`;
}

/** @param {object} cfg */
export function buildOrbitWaitlistVCard(cfg) {
  const joinUrl = resolveJoinUrl(cfg);
  const org = escapeVCardValue(cfg.name || "Orbit");
  const note = escapeVCardValue(
    cfg.vcardNote ||
      "Join the Orbit waitlist for early access on iOS and Android. Open the link to sign up."
  );

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "UID:urn:orbit-waitlist",
    "FN:Orbit Waitlist",
    `ORG:${org}`,
    `URL:${escapeVCardValue(joinUrl)}`,
    `NOTE:${note}`,
    "END:VCARD",
  ];

  return lines.join("\r\n");
}

function assertVCard(text) {
  if (!text.startsWith("BEGIN:VCARD")) throw new Error("missing BEGIN:VCARD");
  if (!text.endsWith("END:VCARD")) throw new Error("missing END:VCARD");
  if (!text.includes("URL:")) throw new Error("missing URL");
  if (text.length > MAX_QR_PAYLOAD) {
    throw new Error(
      `vCard payload ${text.length} bytes exceeds QR limit ${MAX_QR_PAYLOAD}`
    );
  }
}

const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const vcard = buildOrbitWaitlistVCard(cfg);
assertVCard(vcard);

const filename = "orbit-waitlist.vcf";
writeFileSync(join(root, filename), vcard, "utf8");
writeFileSync(
  join(root, "orbit-vcard-qr.json"),
  JSON.stringify(
    {
      payload: vcard,
      joinUrl: resolveJoinUrl(cfg),
      filename,
      byteLength: Buffer.byteLength(vcard, "utf8"),
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(`Wrote ${filename} (${Buffer.byteLength(vcard, "utf8")} bytes)`);
console.log("Wrote orbit-vcard-qr.json");
console.log(`Join URL: ${resolveJoinUrl(cfg)}`);
