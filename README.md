# donate.17bytes.com

A single donation page with Razorpay checkout, deployed as a real Cloudflare
**Worker** (not a static-assets-only project) so that Runtime Variables and
Secrets are available.

## Why this structure

Cloudflare's dashboard only shows "Variables and Secrets" for a Worker that
has an actual script attached (`main` in `wrangler.jsonc`). A project that
is just uploaded HTML/CSS/JS with no script is treated as "static assets
only" and refuses to let you add variables.

This version fixes that by having one real Worker script,
`src/index.js`, which:
- handles `POST /api/create-order` and `POST /api/verify-payment` itself
  (the logic that used to live in `functions/api/*.js`)
- serves everything else (`index.html`, etc.) from the `public/` folder via
  the `ASSETS` binding

Because `wrangler.jsonc` declares both `main` and `assets`, Cloudflare will
always recognize this as a Worker with a script, so the "static assets only"
error will not appear.

## Files

- `public/index.html` — the donation page (unchanged from before)
- `src/index.js` — the Worker: serves static assets + the two API routes
- `wrangler.jsonc` — Worker config (name, entry point, assets directory)
- `package.json` — just so you can run `wrangler` via npm scripts

## 1. Get your Razorpay keys

1. Sign in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Go to **Settings → API Keys**.
3. Generate a **Test** key pair first (to try it out), then a **Live** pair
   later. You'll get a `Key Id` and `Key Secret`.

## 2. Deploy with Wrangler (recommended — most reliable path)

```bash
cd donate-17bytes
npm install
npx wrangler login        # opens a browser to authorize your Cloudflare account
npx wrangler deploy
```

This uploads both `src/index.js` and `public/index.html` together as one
Worker. You'll get a `*.workers.dev` URL to test with.

## 3. Add your Razorpay keys

You can do this either in the dashboard or from the CLI — do it *after* the
first `wrangler deploy`, since the Worker needs to exist first.

**Dashboard:**
Workers & Pages → your Worker (`donate-17bytes`) → **Settings → Variables
and Secrets → Add** →
- `RAZORPAY_KEY_ID` — Text/plain variable
- `RAZORPAY_KEY_SECRET` — Secret (encrypted)

**Or via CLI:**
```bash
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
```
(`wrangler secret put` works for either — using it for both is simplest and
keeps both out of your shell history/config files.)

No redeploy is needed after adding secrets via the dashboard or
`wrangler secret put` — they take effect on the next request. If you ever
add plain `vars` inside `wrangler.jsonc` instead, those *do* require a
redeploy to take effect.

## 4. Point donate.17bytes.com at it

Workers & Pages → your Worker → **Settings → Domains & Routes → Add
Custom Domain** → enter `donate.17bytes.com`. If `17bytes.com` is already
active in this Cloudflare account, the DNS record is added automatically.
SSL is automatic.

## 5. Go live

- Switch to your **Live** Razorpay keys (`wrangler secret put` again, same
  names, to overwrite the test values) once you've tested with Test keys.
- No database is included — this demo doesn't record donations anywhere.
- The Key Secret never reaches the browser — only the public Key Id and
  order details do.
- Payment signature is verified server-side in `verifyPayment()` before the
  page shows the "thank you" message.
