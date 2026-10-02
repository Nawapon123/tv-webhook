// Vercel Serverless Function: api/webhook.js
// Handles incoming alerts from TradingView and optionally forwards to Telegram/Discord

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET (Health Check)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: "online",
      message: "TradingView Webhook on Vercel is running 24/7!",
      instructions: "Send POST requests to this endpoint with JSON payload."
    });
  }

  // Handle POST (TradingView Webhook)
  if (req.method === 'POST') {
    try {
      let data = req.body;

      // Handle raw string body if needed
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          data = { message: data };
        }
      }

      console.log("=== Incoming TradingView Alert ===");
      console.log(JSON.stringify(data, null, 2));

      const action = data.action || data.signal || "ALERT";
      const symbol = data.symbol || data.ticker || "UNKNOWN";
      const price = data.price || "";
      const comment = data.comment || "TradingView Signal";

      // 1. Forward to Telegram (Optional: configure TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID in Vercel)
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramToken && telegramChatId) {
        const text = `🔔 *TradingView Signal*\n\n` +
                     `• *Action:* ${action}\n` +
                     `• *Symbol:* ${symbol}\n` +
                     (price ? `• *Price:* ${price}\n` : '') +
                     `• *Note:* ${comment}\n` +
                     `• *Time:* ${new Date().toISOString()}`;

        try {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: text,
              parse_mode: 'Markdown'
            })
          });
          console.log("Notification forwarded to Telegram successfully");
        } catch (err) {
          console.error("Telegram forward failed:", err);
        }
      }

      // 2. Forward to Discord (Optional: configure DISCORD_WEBHOOK_URL in Vercel)
      const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhook) {
        try {
          await fetch(discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🚨 **TradingView Alert**: **${action}** on **${symbol}** (Price: ${price || 'N/A'}) - ${comment}`
            })
          });
          console.log("Notification forwarded to Discord successfully");
        } catch (err) {
          console.error("Discord forward failed:", err);
        }
      }

      return res.status(200).json({
        status: "success",
        received: {
          action: action,
          symbol: symbol,
          price: price,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({ status: "error", detail: error.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
