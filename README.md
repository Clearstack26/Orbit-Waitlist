# Orbit Waitlist

Static web app for the Orbit pre-launch waitlist. Collects name + email via a clean form and stores entries in Supabase. Shows a QR code for use at events.

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/qr` | `index.html` | QR code — show at events for people to scan |
| `/join` | `join.html` | Waitlist signup form (root `/` redirects here) |

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

Set `baseUrl` to your custom domain (never a `.vercel.app` URL):

```json
{
  "baseUrl": "https://orbitwaitlist.au",
  "joinPath": "/join"
}
```

Then run `npm run build` so `join-url.json` and `assets/join-qr.png` encode the same URL. The QR page at **`/qr`** always points to that domain — opening it on a Vercel preview URL will not change what gets encoded.

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

- **iOS:** Open `/qr` in Safari → Share → "Add to Home Screen"
- **Third-party wallet apps:** Paste your deployed URL into the app to generate a pass with the QR embedded

## Development

```bash
npm start  # Serves on http://localhost:3000
```
