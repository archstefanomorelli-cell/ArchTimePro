import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const FOUNDER_AMOUNT_CENTS = 1990;
const FOUNDER_CURRENCY = "eur";

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

function assertFounderSubscription(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  const expectedPriceId = Deno.env.get("STRIPE_FOUNDER_PRICE_ID")?.trim();
  const isExpectedPrice = !expectedPriceId || price?.id === expectedPriceId;
  const isExpectedAmount = price?.unit_amount === FOUNDER_AMOUNT_CENTS;
  const isExpectedCurrency = price?.currency === FOUNDER_CURRENCY;
  const isMonthly = price?.recurring?.interval === "month" && (price.recurring.interval_count ?? 1) === 1;

  if (!price || !isExpectedPrice || !isExpectedAmount || !isExpectedCurrency || !isMonthly) {
    throw new Error("Unexpected Stripe subscription price");
  }
}

function unixToIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

async function syncCurrentSubscription(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  assertFounderSubscription(subscription);
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  let { data: studio, error: lookupError } = await supabase
    .from("studios")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!studio) {
    const customerLookup = await supabase
      .from("studios")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (customerLookup.error) throw customerLookup.error;
    studio = customerLookup.data;
  }

  if (!studio) return false;

  const { data: updated, error: updateError } = await supabase
    .from("studios")
    .update({
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      plan_type: "founder",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstPriceId(subscription),
      stripe_current_period_end: unixToIso(subscription.current_period_end),
      stripe_last_event_id: eventId,
    })
    .eq("id", studio.id)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) throw new Error("Stripe subscription update matched no studio");
  return true;
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

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      assertFounderSubscription(subscription);

      const { data: updated, error } = await supabase
        .from("studios")
        .update({
          subscription_status: mapStripeSubscriptionStatus(subscription.status),
          plan_type: "founder",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_checkout_session_id: session.id,
          stripe_price_id: firstPriceId(subscription),
          stripe_current_period_end: unixToIso(subscription.current_period_end),
          stripe_last_event_id: event.id,
        })
        .eq("id", studioId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("Checkout matched no studio");
      return jsonResponse({ ok: true });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const eventSubscription = event.data.object as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
      const synced = await syncCurrentSubscription(supabase, subscription, event.id);
      return jsonResponse({ ok: true, synced });
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
      if (!subscriptionId) {
        return jsonResponse({ ok: true, ignored: "invoice without subscription" });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const synced = await syncCurrentSubscription(supabase, subscription, event.id);
      return jsonResponse({ ok: true, synced });
    }

    return jsonResponse({ ok: true, ignored: event.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe webhook failed";
    console.error(message);
    return jsonResponse({ error: message }, 400);
  }
});
