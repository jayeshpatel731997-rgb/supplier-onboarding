import { BuyerShell } from "@/components/buyer-shell";
import { InviteSupplierForm } from "@/components/invite-supplier-form";
import { getBuyerSettings, getSupplierCount } from "@/lib/data";
import { requireBuyer } from "@/lib/supabase/server";

export default async function NewSupplierPage() {
  const { user } = await requireBuyer();
  const [settings, supplierCount] = await Promise.all([
    getBuyerSettings(user.id),
    getSupplierCount(user.id),
  ]);

  return (
    <BuyerShell email={user.email ?? ""}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Add supplier</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a secure magic link with the exact documents this supplier must submit.
          </p>
        </div>
        <InviteSupplierForm
          defaultDocuments={settings.required_documents}
          subscriptionStatus={settings.subscription_status}
          supplierCount={supplierCount}
        />
      </div>
    </BuyerShell>
  );
}
