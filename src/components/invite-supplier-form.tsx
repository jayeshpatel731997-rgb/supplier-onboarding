"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_LABELS, DOCUMENT_TYPES, type DocumentType } from "@/lib/domain";
import { inviteSupplierSchema } from "@/lib/validations";

export function InviteSupplierForm({
  defaultDocuments,
  subscriptionStatus,
  supplierCount,
}: {
  defaultDocuments: DocumentType[];
  subscriptionStatus: "free" | "pro";
  supplierCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>(defaultDocuments);
  const freeLimitReached = subscriptionStatus === "free" && supplierCount >= 5;

  const remaining = useMemo(() => Math.max(0, 5 - supplierCount), [supplierCount]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    const form = new FormData(event.currentTarget);
    const payload = {
      companyName: String(form.get("companyName") ?? ""),
      contactName: String(form.get("contactName") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      contactPhone: String(form.get("contactPhone") ?? ""),
      personalMessage: String(form.get("personalMessage") ?? ""),
      requiredDocuments: selectedDocs,
    };

    const parsed = inviteSupplierSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""])));
      return;
    }

    setLoading(true);
    const response = await fetch("/api/suppliers/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = (await response.json()) as { supplierId?: string; error?: string };
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Could not send invite");
      return;
    }

    toast.success("Supplier invitation sent");
    router.push(`/suppliers/${data.supplierId}`);
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Supplier invitation</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-5">
          {freeLimitReached ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Free plan is limited to 5 suppliers. Upgrade to Pro to keep inviting suppliers.
              <Button className="mt-3" variant="outline" render={<Link href="/pricing" />}>
                Upgrade to Pro
              </Button>
            </div>
          ) : subscriptionStatus === "free" ? (
            <p className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
              Free plan remaining supplier invites: {remaining}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="companyName" label="Company name" error={errors.companyName} />
            <Field id="contactName" label="Contact name" error={errors.contactName} />
            <Field id="contactEmail" type="email" label="Contact email" error={errors.contactEmail} />
            <Field id="contactPhone" label="Phone" error={errors.contactPhone} />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Required documents</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOCUMENT_TYPES.map((documentType) => (
                <label key={documentType} className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(documentType)}
                    onChange={(event) =>
                      setSelectedDocs((current) =>
                        event.target.checked
                          ? [...current, documentType]
                          : current.filter((item) => item !== documentType),
                      )
                    }
                  />
                  <span>{DOCUMENT_LABELS[documentType]}</span>
                </label>
              ))}
            </div>
            {errors.requiredDocuments ? <p className="text-sm text-destructive">{errors.requiredDocuments}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="personalMessage">Optional personal message</Label>
            <Textarea id="personalMessage" name="personalMessage" rows={4} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading || freeLimitReached}>
            <Send data-icon="inline-start" />
            {loading ? "Sending..." : "Send Onboarding Invite"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} aria-invalid={Boolean(error)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
