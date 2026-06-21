import { headers } from "next/headers";
import { apiError } from "@/lib/api";
import { getAppUrl, getEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getBuyerSettings } from "@/lib/data";
import { getSupabaseAdmin, requireBuyer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { user } = await requireBuyer();
    const settings = await getBuyerSettings(user.id);
    const stripe = getStripe();
    let customerId = settings.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { buyerId: user.id },
      });
      customerId = customer.id;
      await getSupabaseAdmin()
        .from("buyer_settings")
        .update({ stripe_customer_id: customerId })
        .eq("buyer_id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: getEnv("STRIPE_PRO_PRICE_ID"), quantity: 1 }],
      success_url: `${getAppUrl()}/dashboard?checkout=success`,
      cancel_url: `${getAppUrl()}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      metadata: { buyerId: user.id },
    });

    return Response.redirect(session.url ?? new URL("/pricing", headers().get("origin") ?? getAppUrl()).toString(), 303);
  } catch (error) {
    return apiError(error);
  }
}
