#!/usr/bin/env node
/**
 * End-to-end QR + waitlist verification.
 * Run: node scripts/verify-qr.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "site-config.json"), "utf8"));

const joinUrl = `${String(cfg.baseUrl).replace(/\/$/, "")}${cfg.joinPath || "/join"}`;
const anonKey = cfg.supabase?.anonKey;
const supabaseUrl = String(cfg.supabase?.url || "").replace(/\/$/, "");

const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`PASS  ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
}

function decodePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return code ? code.data : null;
}

try {
  const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  if (dataUrl.startsWith("data:image/png;base64,")) {
    pass("QR generation (URL, ecc M)", joinUrl);
  } else {
    fail("QR generation", "unexpected output");
  }
} catch (e) {
  fail("QR generation", e.message);
}

try {
  const joinUrlPath = path.join(root, "join-url.json");
  const pngPath = path.join(root, "assets", "join-qr.png");
  if (fs.existsSync(joinUrlPath) && fs.existsSync(pngPath)) {
    const built = JSON.parse(fs.readFileSync(joinUrlPath, "utf8"));
    const decoded = decodePng(pngPath);
    if (built.url === joinUrl && decoded === joinUrl) {
      pass("Static QR PNG decodes correctly", joinUrl);
    } else {
      fail(
        "Static QR PNG decodes correctly",
        `expected ${joinUrl}, got ${decoded}, json ${built.url}`
      );
    }
  } else {
    fail("Static QR assets", "run npm run build");
  }
} catch (e) {
  fail("Static QR assets", e.message);
}

if (!/^https:\/\//i.test(joinUrl)) {
  fail("HTTPS URL", joinUrl);
} else if (!joinUrl.endsWith("/join")) {
  fail("Join URL path", `must end with /join, got ${joinUrl}`);
} else {
  pass("HTTPS URL", joinUrl);
}

try {
  const res = await fetch(joinUrl, { redirect: "follow" });
  const html = await res.text();
  if (res.ok && html.includes("waitlist-form") && html.includes("step-0")) {
    pass("Join page (/join)", `${res.status} ${joinUrl}`);
  } else {
    fail("Join page (/join)", `status ${res.status}, form missing`);
  }
} catch (e) {
  fail("Join page (/join)", e.message);
}

try {
  const legacy = joinUrl.replace(/\/join$/, "/j");
  const res = await fetch(legacy, { redirect: "follow" });
  const html = await res.text();
  if (res.ok && html.includes("waitlist-form")) {
    pass("Legacy /j alias", `${res.status} ${legacy}`);
  } else {
    fail("Legacy /j alias", `status ${res.status}`);
  }
} catch (e) {
  fail("Legacy /j alias", e.message);
}

try {
  const res = await fetch(`${supabaseUrl}/rest/v1/orbit_waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: "return=minimal",
      Origin: cfg.baseUrl,
    },
    body: JSON.stringify({ name: "Verify Script", email: `verify-${Date.now()}@example.com` }),
  });
  if (res.status === 201 || res.status === 200) {
    pass("Waitlist submit", `${res.status}`);
  } else {
    const body = await res.text();
    fail("Waitlist submit", `${res.status} ${body}`);
  }
} catch (e) {
  fail("Waitlist submit", e.message);
}

try {
  const vendorPath = path.join(root, "vendor", "qrcode.min.js");
  if (fs.existsSync(vendorPath) && fs.statSync(vendorPath).size > 1000) {
    pass("Vendor bundle", `${fs.statSync(vendorPath).size} bytes`);
  } else {
    fail("Vendor bundle", "missing - run npm run build");
  }
} catch (e) {
  fail("Vendor bundle", e.message);
}

try {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/`);
  const html = await res.text();
  if (html.includes('id="qr-url"') && html.includes("qrcode.min.js")) {
    pass("QR page uses canvas", cfg.baseUrl);
  } else {
    fail("QR page uses canvas", "expected qr-url canvas");
  }
} catch (e) {
  fail("QR page uses canvas", e.message);
}

const failed = checks.filter((c) => !c.ok).length;
console.log("");
console.log(`Encoded URL: ${joinUrl}`);
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed. QR flow is healthy.");
process.exit(failed ? 1 : 0);
