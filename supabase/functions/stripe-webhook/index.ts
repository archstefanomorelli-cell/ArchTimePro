import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "unpaid";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  if (status === "incomplete") return "past_due";
  return "inactive";
}

function firstPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function unixToIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

serve(async (request) => {
  const signature = request.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return jsonResponse({ error: "Missing Stripe signature or webhook secret" }, 400);
  }

  try {
    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );

    const supabase = getSupabaseAdmin();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const studioId = session.client_reference_id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (!studioId || !subscriptionId || !customerId) {
        return jsonResponse({ ok: true, ignored: "checkout session without studio/subscription/customer" });
      }

      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: "active",
          plan_type: "founder",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_checkout_session_id: session.id,
          stripe_last_event_id: event.id,
        })
        .eq("id", studioId);

      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
      const appStatus = event.type === "customer.subscription.deleted"
        ? "canceled"
        : mapStripeSubscriptionStatus(subscription.status);

      const { error } = await supabase
        .from("studios")
        .update({
          subscription_status: appStatus,
          plan_type: "founder",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: firstPriceId(subscription),
          stripe_current_period_end: unixToIso(subscription.current_period_end),
          stripe_last_event_id: event.id,
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const appStatus = event.type === "invoice.payment_succeeded" ? "active" : "past_due";

      if (!subscriptionId && !customerId) {
        return jsonResponse({ ok: true, ignored: "invoice without subscription/customer" });
      }

      let query = supabase
        .from("studios")
        .update({
          subscription_status: appStatus,
          plan_type: "founder",
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          stripe_last_event_id: event.id,
        });

      query = subscriptionId
        ? query.eq("stripe_subscription_id", subscriptionId)
        : query.eq("stripe_customer_id", customerId);

      const { error } = await query;
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: true, ignored: event.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe webhook failed";
    console.error(message);
    return jsonResponse({ error: message }, 400);
  }
});
