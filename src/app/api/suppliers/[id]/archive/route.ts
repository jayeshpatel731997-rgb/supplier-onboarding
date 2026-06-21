import { NextResponse } from "next/server";
import { markSupplierArchived } from "@/lib/data";
import { apiError } from "@/lib/api";
import { requireBuyer } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireBuyer();
    await markSupplierArchived(user.id, params.id);
    return NextResponse.redirect(new URL(`/suppliers/${params.id}`, request.url), { status: 303 });
  } catch (error) {
    return apiError(error);
  }
}
