// api/signal.js — Vercel Serverless Function
// The MT5 EA polls this endpoint: GET /api/signal?secret=XXXX
// Returns the latest Q-Trend signal as flat JSON (easy to parse in MQL5).

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const serverNow = Date.now();

  const expected = process.env.WEBHOOK_SECRET;
  const given = (req.query && req.query.secret) || "";
  if (expected && given !== expected) {
    return res.status(401).json({ status: "unauthorized", server_now: serverNow });
  }

  const { url, token } = getRedis();
  if (!url || !token) {
    return res.status(503).json({ status: "storage_not_configured", server_now: serverNow });
  }

  try {
    const r = await fetch(`${url}/get/qtrend_latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (!j || !j.result) {
      return res.status(200).json({ status: "empty", server_now: serverNow });
    }
    const sig = JSON.parse(j.result);
    return res.status(200).json({
      status: "ok",
      server_now: serverNow,
      id: sig.id,
      action: sig.action,
      strong: !!sig.strong,
      symbol: sig.symbol,
      tf: sig.tf,
      price: sig.price,
      bar_time: sig.bar_time,
      received_at: sig.received_at,
    });
  } catch (e) {
    console.error("signal read error:", e);
    return res.status(500).json({ status: "error", detail: e.message, server_now: serverNow });
  }
}
