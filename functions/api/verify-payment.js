// POST /api/verify-payment
// Verifies the Razorpay payment signature server-side using the Web Crypto API
// (Cloudflare's runtime does not have Node's `crypto` module, but `crypto.subtle` works).
// Requires RAZORPAY_KEY_SECRET to be set as an environment variable.

export async function onRequestPost(context) {
  const { request, env } = context;

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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
