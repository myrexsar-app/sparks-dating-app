export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  const sk = process.env.STRIPE_SECRET_KEY;

  if (!sk)    return res.status(500).json({ error: "Stripe key not configured" });
  if (!email) return res.status(400).json({ error: "Email required" });

  const auth = Buffer.from(sk + ":").toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    // 1. Find Stripe customer by email
    const custResp = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers }
    );
    const custData = await custResp.json();
    if (!custData.data?.length)
      return res.status(404).json({ error: "No Stripe customer found for this email" });

    const customerId = custData.data[0].id;

    // 2. Get active subscriptions
    const subResp = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
      { headers }
    );
    const subData = await subResp.json();
    if (!subData.data?.length)
      return res.status(404).json({ error: "No active subscription found" });

    const sub = subData.data[0];

    // 3. Cancel at period end (user keeps access until billing cycle ends)
    const cancelResp = await fetch(
      `https://api.stripe.com/v1/subscriptions/${sub.id}`,
      { method: "POST", headers, body: "cancel_at_period_end=true" }
    );
    const cancelData = await cancelResp.json();

    if (cancelData.error)
      return res.status(400).json({ error: cancelData.error.message });

    return res.status(200).json({
      success: true,
      cancelAt: cancelData.current_period_end,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
