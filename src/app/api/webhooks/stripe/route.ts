import { apiError, ok } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing Stripe signature");
    }
    const stripe = getStripe();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, getEnv("STRIPE_WEBHOOK_SECRET"));
    const admin = getSupabaseAdmin();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const buyerId = session.metadata?.buyerId || session.client_reference_id;
      if (buyerId) {
        await admin
          .from("buyer_settings")
          .update({
            subscription_status: "pro",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          })
          .eq("buyer_id", buyerId);
      }
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused"
    ) {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      await admin
        .from("buyer_settings")
        .update({ subscription_status: "free", subscription_expires_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      await admin
        .from("buyer_settings")
        .update({
          subscription_status: subscription.status === "active" || subscription.status === "trialing" ? "pro" : "free",
          subscription_expires_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq("stripe_customer_id", customerId);
    }

    return ok({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
