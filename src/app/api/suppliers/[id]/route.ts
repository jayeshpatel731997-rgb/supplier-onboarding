import { getSupplierDetail } from "@/lib/data";
import { apiError, ok } from "@/lib/api";
import { requireBuyer } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireBuyer();
    const supplier = await getSupplierDetail(user.id, params.id);
    if (!supplier) {
      return ok({ error: "Supplier not found" }, 404);
    }
    return ok({ supplier });
  } catch (error) {
    return apiError(error);
  }
}
