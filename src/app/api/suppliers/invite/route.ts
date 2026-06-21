import { createSupplierInvite, getBuyerEmail } from "@/lib/data";
import { apiError, ok } from "@/lib/api";
import { sendOnboardingInvite } from "@/lib/resend";
import { requireBuyer } from "@/lib/supabase/server";
import { inviteSupplierSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const { user } = await requireBuyer();
    const body = inviteSupplierSchema.parse(await request.json());
    const { supplier, settings, inviteUrl } = await createSupplierInvite({
      buyerId: user.id,
      companyName: body.companyName,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      requiredDocuments: body.requiredDocuments,
    });

    await sendOnboardingInvite(
      body.contactEmail,
      body.companyName,
      settings.company_name || (await getBuyerEmail(user.id)),
      inviteUrl,
      body.personalMessage,
    );

    return ok({ supplierId: supplier.id, inviteUrl }, 201);
  } catch (error) {
    return apiError(error);
  }
}
