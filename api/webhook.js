// api/webhook.js — Vercel Serverless Function
// Receives Q-Trend alerts from TradingView, stores the latest signal in Upstash Redis
// so the MT5 EA can poll it via /api/signal. Optionally forwards to Telegram / Discord.

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redisPipeline(commands) {
  const { url, token } = getRedis();
  if (!url || !token) throw new Error("storage_not_configured");
  const r = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis_http_${r.status}`);
  return r.json();
}

function parseBody(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    try {
      return JSON.parse(s);
    } catch (e) {
      const up = s.toUpperCase();
      const action = up.includes("BUY") ? "BUY" : up.includes("SELL") ? "SELL" : up.includes("CLOSE") ? "CLOSE" : "";
      return { action, strong: up.includes("STRONG"), message: s };
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { url } = getRedis();
    return res.status(200).json({
      status: "online",
      storage: url ? "connected" : "NOT_CONFIGURED",
      secret_required: !!process.env.WEBHOOK_SECRET,
      message: "Q-Trend webhook is running. Send POST from TradingView.",
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const data = parseBody(req.body);

    // Secret check
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && String(data.secret || "") !== expected) {
      console.warn("Rejected webhook: bad secret");
      return res.status(401).json({ status: "error", detail: "invalid secret" });
    }

    const action = String(data.action || data.signal || "").toUpperCase().trim();
    if (!["BUY", "SELL", "CLOSE"].includes(action)) {
      return res.status(400).json({ status: "error", detail: `unknown action '${action}'` });
    }

    const strong = data.strong === true || String(data.strong).toLowerCase() === "true";
    const symbol = String(data.symbol || data.ticker || "").toUpperCase();
    const tf = String(data.tf || data.interval || "");
    const price = Number(data.price) || 0;
    const barTime = String(data.bar_time || data.time || "");
    const receivedAt = Date.now();
    const id = barTime ? `${symbol}_${tf}_${barTime}_${action}` : `${symbol}_${action}_${receivedAt}`;

    const signal = {
      id,
      action,
      strong,
      symbol,
      tf,
      price,
      bar_time: barTime,
      received_at: receivedAt,
    };
    const json = JSON.stringify(signal);

    console.log("Q-Trend signal:", json);

    await redisPipeline([
      ["SET", "qtrend_latest", json],
      ["LPUSH", "qtrend_history", json],
      ["LTRIM", "qtrend_history", "0", "49"],
    ]);

    // Optional Telegram
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChat) {
      const text =
        `🔔 Q-Trend ${strong ? "STRONG " : ""}${action}\n` +
        `Symbol: ${symbol}\nTF: ${tf}\nPrice: ${price}\nTime: ${new Date(receivedAt).toISOString()}`;
      try {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChat, text }),
        });
      } catch (e) {
        console.error("Telegram forward failed:", e);
      }
    }

    // Optional Discord
    const discord = process.env.DISCORD_WEBHOOK_URL;
    if (discord) {
      try {
        await fetch(discord, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 Q-Trend **${strong ? "STRONG " : ""}${action}** ${symbol} (${tf}) @ ${price}`,
          }),
        });
      } catch (e) {
        console.error("Discord forward failed:", e);
      }
    }

    return res.status(200).json({ status: "success", signal });
  } catch (error) {
    console.error("Webhook error:", error);
    const code = error.message === "storage_not_configured" ? 503 : 500;
    return res.status(code).json({ status: "error", detail: error.message });
  }
}
