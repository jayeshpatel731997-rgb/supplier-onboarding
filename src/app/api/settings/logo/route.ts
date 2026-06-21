import { apiError, ok } from "@/lib/api";
import { getSupabaseAdmin, requireBuyer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { user } = await requireBuyer();
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      throw new Error("Logo file is required");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Logo must be 2MB or smaller");
    }

    const extension = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo-${Date.now()}.${extension}`;
    const admin = getSupabaseAdmin();
    const { error: uploadError } = await admin.storage
      .from("buyer-logos")
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = admin.storage.from("buyer-logos").getPublicUrl(path);
    const { error: updateError } = await admin
      .from("buyer_settings")
      .update({ logo_url: data.publicUrl })
      .eq("buyer_id", user.id);
    if (updateError) {
      throw new Error(updateError.message);
    }
    return ok({ logoUrl: data.publicUrl });
  } catch (error) {
    return apiError(error);
  }
}
