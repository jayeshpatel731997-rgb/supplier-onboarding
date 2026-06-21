"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileUp, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import type { SupplierDocumentView } from "@/lib/data";
import { DOCUMENT_LABELS, type DocumentType } from "@/lib/domain";
import { onboardSubmitSchema } from "@/lib/validations";

const steps = ["Business Info", "Contact Info", "Banking", "Documents"];

type FieldState = Record<string, string>;

export function OnboardingWizard({
  token,
  supplierName,
  buyerCompany,
  documents,
}: {
  token: string;
  supplierName: string;
  buyerCompany: string;
  documents: SupplierDocumentView[];
}) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploaded, setUploaded] = useState<Record<string, boolean>>(
    Object.fromEntries(documents.map((document) => [document.documentType, document.status !== "pending"])),
  );
  const [form, setForm] = useState<FieldState>({
    legalCompanyName: supplierName,
    businessType: "llc",
    country: "US",
    paymentMethod: "ach",
    accountType: "checking",
  });

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-xl items-center">
        <Card className="rounded-lg">
          <CardHeader>
            <CheckCircle2 className="text-emerald-700" />
            <CardTitle>Submission received</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Thank you. {buyerCompany} has been notified and can review your supplier profile and documents.
          </CardContent>
        </Card>
      </div>
    );
  }

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function next() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function uploadDocument(documentType: DocumentType, file: File | null) {
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Only PDF documents can be uploaded");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF must be 10MB or smaller");
      return;
    }

    const body = new FormData();
    body.set("token", token);
    body.set("documentType", documentType);
    body.set("file", file);
    const response = await fetch("/api/onboard/upload", { method: "POST", body });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }

    setUploaded((current) => ({ ...current, [documentType]: true }));
    toast.success(`${DOCUMENT_LABELS[documentType]} uploaded`);
  }

  async function submit() {
    setErrors({});
    const payload = {
      token,
      business: {
        legalCompanyName: form.legalCompanyName ?? "",
        businessType: form.businessType,
        taxId: form.taxId ?? "",
        addressLine1: form.addressLine1 ?? "",
        addressLine2: form.addressLine2 ?? "",
        city: form.city ?? "",
        state: form.state ?? "",
        zip: form.zip ?? "",
        country: form.country ?? "US",
        website: form.website ?? "",
        phone: form.businessPhone ?? "",
      },
      contact: {
        primaryContactName: form.primaryContactName ?? "",
        primaryContactEmail: form.primaryContactEmail ?? "",
        primaryContactPhone: form.primaryContactPhone ?? "",
        apEmail: form.apEmail ?? "",
      },
      banking: {
        paymentMethod: form.paymentMethod,
        bankName: form.bankName ?? "",
        accountType: form.accountType,
      },
      diversityCertifications: (form.diversityCertifications ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const parsed = onboardSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setErrors(Object.fromEntries(Object.entries(flat.fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""])));
      toast.error("Please fix the highlighted fields");
      return;
    }

    const missingDocuments = documents.filter((document) => !uploaded[document.documentType]);
    if (missingDocuments.length) {
      toast.error(`Upload required documents: ${missingDocuments.map((item) => item.label).join(", ")}`);
      return;
    }

    setLoading(true);
    const response = await fetch("/api/onboard/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error ?? "Submission failed");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-teal-700">{buyerCompany}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{supplierName} onboarding</h1>
        <p className="mt-2 text-sm text-muted-foreground">Complete all four steps and upload each required PDF document.</p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
          <Progress value={((step + 1) / steps.length) * 100} />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {steps.map((label, index) => (
              <span key={label} className={index === step ? "font-semibold text-teal-700" : ""}>
                {index + 1}. {label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 0 ? <BusinessStep form={form} setField={setField} errors={errors} /> : null}
          {step === 1 ? <ContactStep form={form} setField={setField} /> : null}
          {step === 2 ? <BankingStep form={form} setField={setField} /> : null}
          {step === 3 ? (
            <DocumentStep documents={documents} uploaded={uploaded} uploadDocument={uploadDocument} />
          ) : null}
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Onboarding"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function BusinessStep({ form, setField, errors }: StepProps) {
  const fieldErrors = errors ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="legalCompanyName" label="Legal company name" form={form} setField={setField} error={fieldErrors.legalCompanyName} />
      <SelectField id="businessType" label="Business type" form={form} setField={setField} options={[["llc", "LLC"], ["corporation", "Corporation"], ["sole_proprietor", "Sole Proprietor"], ["partnership", "Partnership"]]} />
      <Field id="taxId" label="Tax ID/EIN" form={form} setField={setField} />
      <Field id="businessPhone" label="Phone" form={form} setField={setField} />
      <Field id="addressLine1" label="Address line 1" form={form} setField={setField} />
      <Field id="addressLine2" label="Address line 2" form={form} setField={setField} />
      <Field id="city" label="City" form={form} setField={setField} />
      <Field id="state" label="State" form={form} setField={setField} />
      <Field id="zip" label="ZIP/postal code" form={form} setField={setField} />
      <Field id="country" label="Country" form={form} setField={setField} />
      <Field id="website" label="Website" form={form} setField={setField} />
    </div>
  );
}

function ContactStep({ form, setField }: StepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="primaryContactName" label="Primary contact name" form={form} setField={setField} />
      <Field id="primaryContactEmail" label="Primary contact email" type="email" form={form} setField={setField} />
      <Field id="primaryContactPhone" label="Primary contact phone" form={form} setField={setField} />
      <Field id="apEmail" label="AP email for invoices" type="email" form={form} setField={setField} />
    </div>
  );
}

function BankingStep({ form, setField }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
        <LockKeyhole className="mt-0.5 text-teal-700" />
        Banking preferences are transmitted over HTTPS and stored in your buyer&apos;s secured Supabase database.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="paymentMethod" label="Payment method" form={form} setField={setField} options={[["ach", "ACH"], ["check", "Check"], ["wire", "Wire"]]} />
        <Field id="bankName" label="Bank name" form={form} setField={setField} />
        <SelectField id="accountType" label="Account type" form={form} setField={setField} options={[["checking", "Checking"], ["savings", "Savings"]]} />
        <Field id="diversityCertifications" label="Diversity certifications, comma separated" form={form} setField={setField} />
      </div>
    </div>
  );
}

function DocumentStep({
  documents,
  uploaded,
  uploadDocument,
}: {
  documents: SupplierDocumentView[];
  uploaded: Record<string, boolean>;
  uploadDocument: (documentType: DocumentType, file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {documents.map((document) => (
        <div key={document.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-medium">
              {document.label} <span className="text-red-600">*</span>
            </p>
            <p className="text-sm text-muted-foreground">PDF only, maximum 10MB</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={uploaded[document.documentType] ? "uploaded" : "pending"} />
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <FileUp />
              Upload PDF
              <input
                className="sr-only"
                type="file"
                accept="application/pdf"
                onChange={(event) => uploadDocument(document.documentType, event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

type StepProps = {
  form: FieldState;
  setField: (key: string, value: string) => void;
  errors?: Record<string, string>;
};

function Field({ id, label, form, setField, type = "text", error }: StepProps & { id: string; label: string; type?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={form[id] ?? ""} type={type} onChange={(event) => setField(id, event.target.value)} aria-invalid={Boolean(error)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  form,
  setField,
  options,
}: StepProps & { id: string; label: string; options: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-8 rounded-lg border border-input bg-white px-3 text-sm"
        value={form[id] ?? options[0][0]}
        onChange={(event) => setField(id, event.target.value)}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
