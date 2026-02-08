import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderData {
  id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_surname: string;
  quantity: number;
  price_usd: number;
  price_tl: number;
  exchange_rate_used: number;
  event_title: string;
  tier_name: string;
  bank_name: string;
  bank_iban: string;
}

const sendTelegramMessage = async (message: string): Promise<void> => {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!botToken || !chatId) {
    console.error("Telegram credentials not configured");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
    } else {
      console.log("Telegram message sent successfully");
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching order details for:", order_id);

    // Fetch order with related data
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_email,
        buyer_name,
        buyer_surname,
        quantity,
        price_usd,
        price_tl,
        exchange_rate_used,
        events (title),
        ticket_tiers (name),
        banks (bank_name, iban)
      `)
      .eq("id", order_id)
      .single();

    if (error || !order) {
      console.error("Error fetching order:", error);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the Telegram message
    const message = `
🎫 <b>سفارش جدید!</b>

🎵 <b>کنسرت:</b> ${order.events?.title || "N/A"}
🎟 <b>نوع بلیط:</b> ${order.ticket_tiers?.name || "N/A"}
📊 <b>تعداد:</b> ${order.quantity}

💰 <b>مبلغ کل:</b> $${Number(order.price_usd).toFixed(2)} USD
💵 <b>معادل لیر:</b> ${Number(order.price_tl).toFixed(2)} TL
📈 <b>نرخ تبدیل:</b> 1 USD = ${Number(order.exchange_rate_used).toFixed(2)} TL

👤 <b>خریدار:</b> ${order.buyer_name} ${order.buyer_surname}
📧 <b>ایمیل:</b> ${order.buyer_email}

🏦 <b>بانک:</b> ${order.banks?.bank_name || "N/A"}
💳 <b>IBAN:</b> <code>${order.banks?.iban || "N/A"}</code>

⏳ وضعیت: در انتظار بررسی
    `.trim();

    await sendTelegramMessage(message);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in telegram-notify function:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});