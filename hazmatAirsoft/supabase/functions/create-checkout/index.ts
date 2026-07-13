import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { address, city, zip_code, success_url, cancel_url } =
      await req.json();

    if (!address || !city || !zip_code) {
      return new Response(
        JSON.stringify({ error: "Adresse incomplète" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: cartItems, error: cartErr } = await supabaseClient
      .from("cart_items")
      .select("quantity, products(id, name, price, image_url)")
      .eq("user_id", user.id);

    if (cartErr || !cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Panier vide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const line_items = cartItems.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.products.name,
          ...(item.products.image_url
            ? { images: [item.products.image_url] }
            : {}),
        },
        unit_amount: Math.round(item.products.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      metadata: {
        user_id: user.id,
        address,
        city,
        zip_code,
      },
      success_url: success_url || "http://127.0.0.1:5500/index.html?payment=success",
      cancel_url: cancel_url || "http://127.0.0.1:5500/index.html?payment=cancel",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
