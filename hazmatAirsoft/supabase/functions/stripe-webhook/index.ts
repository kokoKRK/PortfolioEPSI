import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): Promise<boolean> {
  const parts = header.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === sig;
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    console.error("Webhook signature verification failed");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = JSON.parse(body);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { user_id, address, city, zip_code } = session.metadata || {};

    if (!user_id) {
      console.error("No user_id in session metadata");
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: cartItems, error: cartErr } = await supabaseAdmin
      .from("cart_items")
      .select("quantity, products(id, name, price)")
      .eq("user_id", user_id);

    if (cartErr || !cartItems || cartItems.length === 0) {
      console.error("Cart empty or error:", cartErr);
      return new Response(JSON.stringify({ received: true, note: "cart_empty" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const total = cartItems.reduce(
      (sum: number, item: any) => sum + item.products.price * item.quantity,
      0
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id,
        total,
        address: address || "",
        city: city || "",
        zip_code: zip_code || "",
        card_last4: "stripe",
        stripe_session_id: session.id,
        status: "confirmed",
      })
      .select()
      .single();

    if (orderErr) {
      console.error("Order creation error:", orderErr);
      return new Response(JSON.stringify({ error: "Order creation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.products.id,
      quantity: item.quantity,
      unit_price: item.products.price,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("Order items error:", itemsErr);
    }

    await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", user_id);

    console.log(`Order ${order.id} created for user ${user_id}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
