import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, ensureBuyerSettings } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await ensureBuyerSettings(user.id, user.email ?? "");
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
