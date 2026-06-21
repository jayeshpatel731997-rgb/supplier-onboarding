import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";

type AnyDatabase = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, { Row: any }>;
    Functions: Record<string, { Args: any; Returns: any }>;
  };
};

export function createSupabaseServerClient(): any {
  const cookieStore = cookies();

  return createServerClient<AnyDatabase>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  ) as any;
}

let adminClient: any = null;

export function getSupabaseAdmin(): any {
  if (!adminClient) {
    adminClient = createClient<AnyDatabase>(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return adminClient;
}

export async function requireBuyer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureBuyerSettings(user.id, user.email ?? "");
  return { user, supabase };
}

export async function ensureBuyerSettings(buyerId: string, email: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("buyer_settings")
    .select("id")
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (data) {
    return;
  }

  await admin.from("buyer_settings").insert({
    buyer_id: buyerId,
    company_name: email.split("@")[1] ?? "Procurement Team",
  });
}
