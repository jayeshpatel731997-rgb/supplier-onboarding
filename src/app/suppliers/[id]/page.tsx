import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Download, Mail, RotateCcw } from "lucide-react";
import { BuyerShell } from "@/components/buyer-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { documentExpiryTone } from "@/lib/domain";
import { getSupplierDetail } from "@/lib/data";
import { requireBuyer } from "@/lib/supabase/server";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const { user } = await requireBuyer();
  const supplier = await getSupplierDetail(user.id, params.id);

  if (!supplier) {
    notFound();
  }

  return (
    <BuyerShell email={user.email ?? ""}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <StatusBadge status={supplier.attention ? "attention" : supplier.status} />
              <span className="text-sm text-muted-foreground">{supplier.completion}% complete</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{supplier.companyName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {supplier.contactName} · {supplier.contactEmail}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={`/api/suppliers/${supplier.id}/resend`} method="post">
              <Button variant="outline">
                <RotateCcw data-icon="inline-start" />
                Resend Invite
              </Button>
            </form>
            <Button variant="outline" render={<Link href={`/api/suppliers/${supplier.id}/download`} />}>
              <Download data-icon="inline-start" />
              Download All
            </Button>
            <form action={`/api/suppliers/${supplier.id}/archive`} method="post">
              <Button variant="destructive">
                <Archive data-icon="inline-start" />
                Archive
              </Button>
            </form>
          </div>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={supplier.completion} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {supplier.documents.map((document) => {
                const tone = documentExpiryTone(document.expiryDate);
                return (
                  <div key={document.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                    <div>
                      <p className="font-medium">{document.label}</p>
                      <p className="text-sm text-muted-foreground">{document.fileName ?? "Awaiting upload"}</p>
                      {document.notes ? <p className="mt-1 text-xs text-muted-foreground">{document.notes}</p> : null}
                    </div>
                    <StatusBadge status={document.status} />
                    <span
                      className={
                        tone === "red"
                          ? "text-sm font-semibold text-red-700"
                          : tone === "yellow"
                            ? "text-sm font-semibold text-amber-700"
                            : "text-sm text-muted-foreground"
                      }
                    >
                      {document.expiryDate ?? "No expiry"}
                    </span>
                    <div className="flex gap-2">
                      {document.fileUrl ? (
                        <Button size="sm" variant="outline" render={<Link href={`/api/documents/${document.id}/download`} />}>
                          Download
                        </Button>
                      ) : null}
                      <form action={`/api/suppliers/${supplier.id}/remind`} method="post">
                        <input type="hidden" name="documentType" value={document.documentType} />
                        <Button size="sm" variant="ghost">
                          <Mail data-icon="inline-start" />
                          Reminder
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Business Info</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {supplier.supplierInfo ? (
                  Object.entries(supplier.supplierInfo)
                    .filter(([key]) => !["id", "supplier_id"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[0.8fr_1fr] gap-3">
                        <span className="text-muted-foreground">{key.replaceAll("_", " ")}</span>
                        <span className="break-words font-medium">{Array.isArray(value) ? value.join(", ") : String(value ?? "-")}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">Business details have not been submitted.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <TimelineItem label="Supplier invited" value={new Date(supplier.createdAt).toLocaleString()} />
                {supplier.completedAt ? <TimelineItem label="Onboarding completed" value={new Date(supplier.completedAt).toLocaleString()} /> : null}
                {supplier.reminderLogs.map((log) => (
                  <TimelineItem
                    key={log.id}
                    label={`${log.reminder_type} reminder sent${log.document_type ? ` for ${log.document_type}` : ""}`}
                    value={new Date(log.sent_at).toLocaleString()}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BuyerShell>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{value}</p>
      <Separator className="mt-3" />
    </div>
  );
}
