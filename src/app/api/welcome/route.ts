import { apiError, ok } from "@/lib/api";
import { sendWelcomeEmail } from "@/lib/resend";
import { requireBuyer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { user } = await requireBuyer();
    if (user.email) {
      await sendWelcomeEmail(user.email, user.email.split("@")[0] ?? "there");
    }
    return ok({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}
