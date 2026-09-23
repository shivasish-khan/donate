// Single Worker entry point.
// Handles the two Razorpay API routes itself, and falls through to the
// static assets binding (env.ASSETS) for everything else (index.html etc).
//
// Because this file is set as `main` in wrangler.jsonc, Cloudflare always
// treats this as a real Worker (not "static assets only"), so Runtime
// variables and secrets can be added in the dashboard, or via
// `wrangler secret put`.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/create-order") {
      if (request.method !== "POST") {
        return jsonResponse({ message: "This endpoint only accepts POST requests." }, 405);
      }
      return createOrder(request, env);
    }

    if (url.pathname === "/api/verify-payment") {
      if (request.method !== "POST") {
        return jsonResponse({ message: "This endpoint only accepts POST requests." }, 405);
      }
      return verifyPayment(request, env);
    }

    // Everything else (index.html, favicon, etc.) is served from static assets.
    return env.ASSETS.fetch(request);
  },
};

// -------------------- /api/create-order --------------------

async function createOrder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const amountInRupees = Number(body.amount);
  if (!amountInRupees || amountInRupees < 1) {
    return jsonResponse({ error: "Invalid amount" }, 400);
  }

  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return jsonResponse({ error: "Server is not configured with Razorpay keys" }, 500);
  }

  const amountInPaise = Math.round(amountInRupees * 100);
  const receipt = "donation_" + Date.now();

  const auth = btoa(`${keyId}:${keySecret}`);

  const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: { source: "donate.17bytes.com" },
    }),
  });

  if (!razorpayRes.ok) {
    const errText = await razorpayRes.text();
    return jsonResponse({ error: "Failed to create Razorpay order", details: errText }, 502);
  }

  const order = await razorpayRes.json();

  return jsonResponse({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId, // safe to expose — this is the public key id, not the secret
  });
}

// -------------------- /api/verify-payment --------------------

async function verifyPayment(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return jsonResponse({ error: "Server is not configured with Razorpay secret" }, 500);
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = await hmacSha256Hex(keySecret, payload);

  const verified = timingSafeEqual(expectedSignature, razorpay_signature);

  return jsonResponse({ verified });
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// -------------------- helpers --------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
