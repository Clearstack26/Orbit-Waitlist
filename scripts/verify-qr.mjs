#!/usr/bin/env node
/**
 * End-to-end QR + waitlist verification.
 * Run: node scripts/verify-qr.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

try {
  const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
  if (dataUrl.startsWith("data:image/png;base64,")) {
    pass("QR generation", joinUrl);
  } else {
    fail("QR generation", "unexpected output");
  }
} catch (e) {
  fail("QR generation", e.message);
}

try {
  const res = await fetch(joinUrl, { redirect: "follow" });
  const html = await res.text();
  if (res.ok && html.includes("waitlist-form")) {
    pass("Join page", `${res.status} ${joinUrl}`);
  } else {
    fail("Join page", `status ${res.status}, form missing`);
  }
} catch (e) {
  fail("Join page", e.message);
}

try {
  const email = `verify-${Date.now()}@example.com`;
  const res = await fetch(`${supabaseUrl}/rest/v1/orbit_waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: "return=minimal",
      Origin: cfg.baseUrl,
    },
    body: JSON.stringify({ name: "Verify Script", email }),
  });
  if (res.status === 201 || res.status === 200) {
    pass("Waitlist submit", `201 for ${email}`);
  } else {
    const body = await res.text();
    fail("Waitlist submit", `${res.status} ${body}`);
  }
} catch (e) {
  fail("Waitlist submit", e.message);
}

try {
  const vcardPath = path.join(root, "orbit-vcard-qr.json");
  if (fs.existsSync(vcardPath)) {
    pass("vCard file present (optional)", "not used on QR page");
  }
} catch (e) {
  /* optional */
}

try {
  const vendorPath = path.join(root, "vendor", "qrcode.min.js");
  if (fs.existsSync(vendorPath) && fs.statSync(vendorPath).size > 1000) {
    pass("Vendor bundle", `${fs.statSync(vendorPath).size} bytes`);
  } else {
    fail("Vendor bundle", "missing or too small - run npm run build");
  }
} catch (e) {
  fail("Vendor bundle", e.message);
}

const failed = checks.filter((c) => !c.ok).length;
console.log("");
console.log(`Encoded URL: ${joinUrl}`);
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed. QR flow is healthy.");
process.exit(failed ? 1 : 0);
