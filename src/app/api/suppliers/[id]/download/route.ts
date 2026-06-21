import JSZip from "jszip";
import { apiError } from "@/lib/api";
import { getSupplierDetail } from "@/lib/data";
import { getSupabaseAdmin, requireBuyer } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireBuyer();
    const supplier = await getSupplierDetail(user.id, params.id);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const admin = getSupabaseAdmin();
    const zip = new JSZip();
    for (const document of supplier.documents.filter((item) => item.fileUrl)) {
      const { data, error } = await admin.storage
        .from("supplier-documents")
        .download(document.fileUrl as string);
      if (error) {
        throw new Error(error.message);
      }
      zip.file(document.fileName ?? `${document.documentType}.pdf`, await data.arrayBuffer());
    }

    const content = await zip.generateAsync({ type: "uint8array" });
    const body = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${supplier.companyName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-documents.zip"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
