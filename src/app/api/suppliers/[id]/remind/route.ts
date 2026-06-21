import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { getBuyerSettings, getSupplierDetail, logReminder } from "@/lib/data";
import { apiError } from "@/lib/api";
import { sendReminderEmail } from "@/lib/resend";
import { requireBuyer } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireBuyer();
    const form = await request.formData();
    const supplier = await getSupplierDetail(user.id, params.id);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const settings = await getBuyerSettings(user.id);
    await sendReminderEmail(
      supplier.contactEmail,
      supplier.companyName,
      settings.company_name || user.email || "your buyer",
      `${getAppUrl()}/onboard/${supplier.token}`,
      Math.max(0, Math.ceil((new Date(supplier.tokenExpiresAt).getTime() - Date.now()) / 86400000)),
    );
    await logReminder(supplier.id, "onboarding", String(form.get("documentType") ?? ""));
    return NextResponse.redirect(new URL(`/suppliers/${params.id}`, request.url), { status: 303 });
  } catch (error) {
    return apiError(error);
  }
}
