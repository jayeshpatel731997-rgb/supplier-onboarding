import { apiError, ok } from "@/lib/api";
import { getBuyerEmail, getOnboardingByToken } from "@/lib/data";
import { sendCompletionNotification } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { onboardSubmitSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = onboardSubmitSchema.parse(await request.json());
    const onboarding = await getOnboardingByToken(body.token);
    if (!onboarding || onboarding.isExpired || onboarding.supplier.status === "complete") {
      throw new Error("Onboarding link is no longer valid");
    }

    const missing = onboarding.documents.filter((document) => document.status === "pending");
    if (missing.length) {
      throw new Error(`Missing required documents: ${missing.map((document) => document.label).join(", ")}`);
    }

    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: infoError } = await admin.from("supplier_info").upsert(
      {
        supplier_id: onboarding.supplier.id,
        tax_id: body.business.taxId,
        business_type: body.business.businessType,
        address_line1: body.business.addressLine1,
        address_line2: body.business.addressLine2 || null,
        city: body.business.city,
        state: body.business.state,
        zip: body.business.zip,
        country: body.business.country,
        bank_name: body.banking.bankName || null,
        account_type: body.banking.accountType || null,
        payment_method: body.banking.paymentMethod,
        diversity_certifications: body.diversityCertifications,
        primary_contact_name: body.contact.primaryContactName,
        primary_contact_email: body.contact.primaryContactEmail,
        primary_contact_phone: body.contact.primaryContactPhone,
        ap_email: body.contact.apEmail,
        submitted_at: now,
      },
      { onConflict: "supplier_id" },
    );
    if (infoError) {
      throw new Error(infoError.message);
    }

    const { error: supplierError } = await admin
      .from("suppliers")
      .update({
        company_name: body.business.legalCompanyName,
        contact_name: body.contact.primaryContactName,
        contact_email: body.contact.primaryContactEmail,
        contact_phone: body.contact.primaryContactPhone,
        website: body.business.website || null,
        status: "complete",
        completed_at: now,
      })
      .eq("id", onboarding.supplier.id);
    if (supplierError) {
      throw new Error(supplierError.message);
    }

    const buyerEmail = await getBuyerEmail(onboarding.supplier.buyer_id);
    if (buyerEmail) {
      await sendCompletionNotification(
        buyerEmail,
        onboarding.buyerSettings.company_name || "Procurement team",
        body.business.legalCompanyName,
      );
    }

    return ok({ submitted: true });
  } catch (error) {
    return apiError(error);
  }
}
