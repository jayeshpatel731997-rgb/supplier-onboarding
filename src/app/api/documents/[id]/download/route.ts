import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSupabaseAdmin, requireBuyer } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireBuyer();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("supplier_documents")
      .select("*, suppliers!inner(buyer_id)")
      .eq("id", params.id)
      .single();

    if (error || data.suppliers.buyer_id !== user.id || !data.file_url) {
      throw new Error("Document not found");
    }

    const { data: signed, error: signError } = await admin.storage
      .from("supplier-documents")
      .createSignedUrl(data.file_url, 60);
    if (signError) {
      throw new Error(signError.message);
    }

    return NextResponse.redirect(new URL(signed.signedUrl, request.url));
  } catch (error) {
    return apiError(error);
  }
}
