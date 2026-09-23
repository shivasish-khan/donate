// POST /api/create-order
// Creates a Razorpay order server-side so the key secret never touches the browser.
// Requires environment variables (set in Cloudflare Pages > Settings > Environment variables):
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET

export async function onRequestPost(context) {
  const { request, env } = context;

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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Lets you sanity-check in a browser that the function is deployed at all.
export async function onRequestGet() {
  return jsonResponse({ message: "This endpoint only accepts POST requests." }, 405);
}
