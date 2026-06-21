import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileWarning, Users } from "lucide-react";
import { BuyerShell } from "@/components/buyer-shell";
import { DashboardClient } from "@/components/dashboard-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuyerSettings, listSuppliers, buildDashboardStats, getExpiringDocuments } from "@/lib/data";
import { requireBuyer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { user } = await requireBuyer();
  const [suppliers, settings] = await Promise.all([
    listSuppliers(user.id),
    getBuyerSettings(user.id),
  ]);
  const stats = buildDashboardStats(suppliers);
  const expiringDocuments = getExpiringDocuments(suppliers);

  return (
    <BuyerShell email={user.email ?? ""}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Supplier dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track onboarding completion, document status, and upcoming certificate expirations.
            </p>
          </div>
          <Button render={<Link href="/suppliers/new" />}>Add New Supplier</Button>
        </div>

        {settings.subscription_status === "free" && suppliers.length >= 4 ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5" />
            <div>
              <p className="font-semibold">Free plan supplier limit approaching</p>
              <p>Free includes 5 suppliers. Upgrade to Pro for unlimited suppliers, AI extraction, and automatic reminders.</p>
            </div>
            <Button variant="outline" className="ml-auto bg-white" render={<Link href="/pricing" />}>
              Upgrade
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Suppliers" value={stats.total} icon={Users} />
          <StatCard title="Complete" value={stats.complete} icon={CheckCircle2} />
          <StatCard title="Pending" value={stats.pending} icon={Clock3} />
          <StatCard title="Expiring Soon" value={stats.expiringSoon} icon={FileWarning} />
        </div>

        <DashboardClient initialSuppliers={suppliers} expiringDocuments={expiringDocuments} />
      </div>
    </BuyerShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Icon className="text-teal-700" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
