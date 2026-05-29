# Orbit Waitlist

Static web app for the Orbit pre-launch waitlist. Collects name + email via a clean form and stores entries in Supabase. Shows a QR code for use at events.

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.html` | QR code — show at events for people to scan |
| `/join` | `join.html` | Waitlist signup form |

## Stack

- Vanilla HTML / CSS / JS — zero runtime dependencies
- **QR:** `qrcode` npm package (bundled via esbuild to `vendor/qrcode.min.js`)
- **Database:** Supabase (`orbit_waitlist` table, anon inserts via RLS)
- **Hosting:** Vercel

## Setup

### 1. Install & build

```bash
npm install
npm run build
```

### 2. Update `site-config.json`

After deploying, update `baseUrl` with your live Vercel URL:

```json
{
  "baseUrl": "https://orbit-waitlist.vercel.app",
  "joinPath": "/join"
}
```

This is what the QR code on `index.html` points to.

### 3. Deploy to Vercel

```bash
# Login if needed
vercel login

# Deploy (first time — will ask a few questions)
vercel

# Deploy to production
vercel --prod
```

### 4. Push to GitHub

Create a new repo on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Orbit-Waitlist.git
git push -u origin master
```

Then connect the GitHub repo to Vercel for automatic deployments on push.

## Viewing waitlist entries

Log in to [supabase.com](https://supabase.com) → Table Editor → `orbit_waitlist`.

You can export a CSV of all emails from there when you're ready to send the launch email.

## Apple Wallet / Home Screen

- **iOS:** Open `/` in Safari → Share → "Add to Home Screen"
- **Third-party wallet apps:** Paste your deployed URL into the app to generate a pass with the QR embedded

## Development

```bash
npm start  # Serves on http://localhost:3000
```
