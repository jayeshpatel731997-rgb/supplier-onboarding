import { listSuppliers } from "@/lib/data";
import { apiError, ok } from "@/lib/api";
import { requireBuyer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user } = await requireBuyer();
    const suppliers = await listSuppliers(user.id);
    return ok({ suppliers });
  } catch (error) {
    return apiError(error);
  }
}
