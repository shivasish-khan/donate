# donate.17bytes.com

A single donation page with Razorpay checkout, built to deploy on Cloudflare Pages.

## Files

- `index.html` — the donation page (amount picker, donor details, Razorpay checkout)
- `functions/api/create-order.js` — Cloudflare Pages Function that creates a Razorpay order (keeps your key secret off the browser)
- `functions/api/verify-payment.js` — Cloudflare Pages Function that verifies the payment signature after checkout

Because payments need a server-side step (creating an order and verifying the signature), this isn't a plain static page — it uses Cloudflare Pages **Functions**, which are free serverless functions bundled with your Pages project.

## 1. Get your Razorpay keys

1. Sign in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Go to **Settings → API Keys**.
3. Generate a **Live** key pair for production (or use the **Test** key pair first to try it out). You'll get a `Key Id` and `Key Secret` — copy both.

Test mode lets you simulate payments with dummy cards before going live — worth doing first.

## 2. Push this project to GitHub

Cloudflare Pages deploys from a Git repo.

```bash
cd donate-17bytes
git init
git add .
git commit -m "Initial donation page"
git branch -M main
git remote add origin https://github.com/<your-username>/donate-17bytes.git
git push -u origin main
```

## 3. Create the Cloudflare Pages project

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the `donate-17bytes` repo.
3. Build settings: leave **Build command** empty and **Build output directory** as `/` (this is a static site with no build step).
4. Click **Save and Deploy**. Cloudflare will give you a `*.pages.dev` URL first — check the demo works there before adding the custom domain.

## 4. Add your Razorpay keys as environment variables

In the Pages project → **Settings → Environment variables**, add (for both **Production** and **Preview**):

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | your Key Id |
| `RAZORPAY_KEY_SECRET` | your Key Secret (mark as **Encrypted/Secret**) |

Redeploy after adding these (environment variable changes need a new deployment to take effect).

## 5. Point donate.17bytes.com at it

Since `17bytes.com` is presumably already on Cloudflare (or you can add it):

1. In Cloudflare Pages → your project → **Custom domains → Set up a custom domain**.
2. Enter `donate.17bytes.com` and follow the prompt — if the `17bytes.com` zone is already active in this Cloudflare account, it will add the CNAME automatically.
3. If your domain's DNS is *not* on Cloudflare yet, add `17bytes.com` as a site in Cloudflare first (Cloudflare will give you nameservers to set at your registrar), then repeat step 1–2. Alternatively, just add a CNAME manually at wherever your DNS is hosted:

   ```
   donate.17bytes.com  CNAME  <your-project>.pages.dev
   ```

4. SSL is automatic and free via Cloudflare once the domain is active.

## 6. Go live

- Switch to your **Live** Razorpay keys in the environment variables once you've tested with Test keys.
- Consider adding a webhook in Razorpay (**Settings → Webhooks**) pointing to a `functions/api/webhook.js` endpoint if you want server-confirmed records independent of the browser flow — not included here since this is a minimal demo, but ask if you want it added.

## Notes on this demo

- Amounts are in INR. Preset buttons: ₹100 / ₹500 / ₹1000, plus a custom amount field.
- The Key Secret never reaches the browser — only the public Key Id and order details do.
- Payment signature is verified server-side in `verify-payment.js` before showing the "thank you" message.
- No database is included — this demo doesn't record donations anywhere. Let me know if you want donations logged (e.g., to a Cloudflare D1 database or a Google Sheet) or a receipt email sent.
