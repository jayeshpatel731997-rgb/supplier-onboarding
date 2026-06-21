"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOCUMENT_LABELS, DOCUMENT_TYPES, type DocumentType } from "@/lib/domain";
import type { BuyerSettings } from "@/lib/data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SettingsForm({ settings }: { settings: BuyerSettings }) {
  const [companyName, setCompanyName] = useState(settings.company_name);
  const [requiredDocuments, setRequiredDocuments] = useState<DocumentType[]>(settings.required_documents);
  const [deadline, setDeadline] = useState(String(settings.onboarding_deadline_days));
  const [reminderDays, setReminderDays] = useState(settings.reminder_days_before_expiry.join(", "));
  const [password, setPassword] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  async function saveSettings() {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName,
        requiredDocuments,
        onboardingDeadlineDays: Number(deadline),
        reminderDaysBeforeExpiry: reminderDays
          .split(",")
          .map((item) => Number(item.trim()))
          .filter(Boolean),
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Settings could not be saved");
      return;
    }
    toast.success("Settings saved");
  }

  async function uploadLogo(file: File | null) {
    if (!file) {
      return;
    }
    setLogoUploading(true);
    const body = new FormData();
    body.set("logo", file);
    const response = await fetch("/api/settings/logo", { method: "POST", body });
    setLogoUploading(false);
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Logo upload failed");
      return;
    }
    toast.success("Logo uploaded");
  }

  async function changePassword() {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Password changed");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="logo">Logo upload</Label>
            <Input id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)} />
            <p className="text-sm text-muted-foreground">{logoUploading ? "Uploading..." : "PNG, JPEG, WebP, or SVG up to 2MB."}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Onboarding Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {DOCUMENT_TYPES.map((documentType) => (
              <label key={documentType} className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  checked={requiredDocuments.includes(documentType)}
                  onChange={(event) =>
                    setRequiredDocuments((current) =>
                      event.target.checked
                        ? [...current, documentType]
                        : current.filter((item) => item !== documentType),
                    )
                  }
                />
                {DOCUMENT_LABELS[documentType]}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deadline">Onboarding deadline days</Label>
              <Input id="deadline" type="number" min={1} max={120} value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reminders">Expiry reminder days</Label>
              <Input id="reminders" value={reminderDays} onChange={(event) => setReminderDays(event.target.value)} />
              <p className="text-xs text-muted-foreground">Comma separated, for example: 90, 60, 30, 7</p>
            </div>
          </div>
          <Button type="button" onClick={saveSettings}>
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={changePassword}>
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
