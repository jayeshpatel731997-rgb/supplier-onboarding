import { apiError, ok } from "@/lib/api";
import { extractDocumentExpiry } from "@/lib/claude";
import { uploadDocumentSchema } from "@/lib/validations";
import { getOnboardingByToken } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const parsed = uploadDocumentSchema.parse({
      token: form.get("token"),
      documentType: form.get("documentType"),
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new Error("PDF file is required");
    }
    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are accepted");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("PDF must be 10MB or smaller");
    }

    const onboarding = await getOnboardingByToken(parsed.token);
    if (!onboarding || onboarding.isExpired || onboarding.supplier.status === "complete") {
      throw new Error("Onboarding link is no longer valid");
    }

    const admin = getSupabaseAdmin();
    const path = `${onboarding.supplier.id}/${parsed.documentType}-${Date.now()}.pdf`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("supplier-documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    let expiryDate: string | null = null;
    let notes = "Uploaded successfully.";
    if (onboarding.buyerSettings.subscription_status === "pro") {
      const base64 = Buffer.from(bytes).toString("base64");
      const extraction = await extractDocumentExpiry(base64, parsed.documentType);
      expiryDate = extraction.expiry_date;
      notes = `Claude extraction: issue date ${extraction.issue_date ?? "unknown"}, document number ${extraction.document_number ?? "unknown"}, coverage ${extraction.coverage_amount ?? "unknown"}.`;
    } else {
      notes = "Uploaded successfully. AI expiry extraction is available on the Pro plan.";
    }

    const { error: updateError } = await admin
      .from("supplier_documents")
      .update({
        file_url: path,
        file_name: file.name,
        status: "uploaded",
        expiry_date: expiryDate,
        uploaded_at: new Date().toISOString(),
        notes,
      })
      .eq("supplier_id", onboarding.supplier.id)
      .eq("document_type", parsed.documentType);
    if (updateError) {
      throw new Error(updateError.message);
    }

    await admin.from("suppliers").update({ status: "in_progress" }).eq("id", onboarding.supplier.id);

    return ok({ uploaded: true, expiryDate });
  } catch (error) {
    return apiError(error);
  }
}
