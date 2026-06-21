import { apiError, ok } from "@/lib/api";
import { getSupabaseAdmin, requireBuyer } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const { user } = await requireBuyer();
    const body = settingsSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("buyer_settings")
      .update({
        company_name: body.companyName,
        required_documents: body.requiredDocuments,
        onboarding_deadline_days: body.onboardingDeadlineDays,
        reminder_days_before_expiry: body.reminderDaysBeforeExpiry,
      })
      .eq("buyer_id", user.id);
    if (error) {
      throw new Error(error.message);
    }
    return ok({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
