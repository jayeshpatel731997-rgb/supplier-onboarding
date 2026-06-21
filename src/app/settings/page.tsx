import { BuyerShell } from "@/components/buyer-shell";
import { SettingsForm } from "@/components/settings-form";
import { getBuyerSettings } from "@/lib/data";
import { requireBuyer } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const { user } = await requireBuyer();
  const settings = await getBuyerSettings(user.id);

  return (
    <BuyerShell email={user.email ?? ""}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage buyer defaults, reminders, branding, and password.</p>
        </div>
        <SettingsForm settings={settings} />
      </div>
    </BuyerShell>
  );
}
