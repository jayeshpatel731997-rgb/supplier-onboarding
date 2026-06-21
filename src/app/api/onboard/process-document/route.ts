import { apiError, ok } from "@/lib/api";
import { extractDocumentExpiry } from "@/lib/claude";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const processDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const { documentId } = processDocumentSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: document, error } = await admin
      .from("supplier_documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (error || !document.file_url) {
      throw new Error("Document not found");
    }

    const { data: file, error: downloadError } = await admin.storage
      .from("supplier-documents")
      .download(document.file_url);
    if (downloadError) {
      throw new Error(downloadError.message);
    }

    const extraction = await extractDocumentExpiry(
      Buffer.from(await file.arrayBuffer()).toString("base64"),
      document.document_type,
    );
    const { error: updateError } = await admin
      .from("supplier_documents")
      .update({
        expiry_date: extraction.expiry_date,
        notes: `Claude extraction: issue date ${extraction.issue_date ?? "unknown"}, document number ${extraction.document_number ?? "unknown"}, coverage ${extraction.coverage_amount ?? "unknown"}.`,
      })
      .eq("id", documentId);
    if (updateError) {
      throw new Error(updateError.message);
    }

    return ok(extraction);
  } catch (error) {
    return apiError(error);
  }
}
