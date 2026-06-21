import { differenceInCalendarDays } from "date-fns";
import { apiError, ok } from "@/lib/api";
import { getAppUrl } from "@/lib/env";
import { getBuyerSettings, logReminder, runOnboardingReminderSelection } from "@/lib/data";
import { sendReminderEmail } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const admin = getSupabaseAdmin();
    const due = await runOnboardingReminderSelection();
    let sent = 0;

    for (const reminder of due) {
      const { data: supplier, error } = await admin
        .from("suppliers")
        .select("*")
        .eq("id", reminder.id)
        .single();
      if (error) {
        throw new Error(error.message);
      }
      const settings = await getBuyerSettings(supplier.buyer_id);
      const daysLeft = Math.max(
        0,
        differenceInCalendarDays(new Date(supplier.token_expires_at), new Date()),
      );
      await sendReminderEmail(
        supplier.contact_email,
        supplier.company_name,
        settings.company_name || "your buyer",
        `${getAppUrl()}/onboard/${supplier.onboarding_token}`,
        daysLeft,
      );
      await logReminder(supplier.id, "onboarding");
      sent += 1;
    }

    return ok({ sent });
  } catch (error) {
    return apiError(error);
  }
}
