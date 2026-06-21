import { apiError, ok } from "@/lib/api";
import { getEnv } from "@/lib/env";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = request.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret");
    if (secret !== getEnv("CRON_SECRET")) {
      return ok({ error: "Unauthorized" }, 401);
    }

    const origin = url.origin;
    const [onboarding, expiry] = await Promise.all([
      fetch(`${origin}/api/reminders/onboarding`, { method: "POST" }),
      fetch(`${origin}/api/reminders/expiry`, { method: "POST" }),
    ]);

    return ok({
      onboarding: await onboarding.json(),
      expiry: await expiry.json(),
    });
  } catch (error) {
    return apiError(error);
  }
}
