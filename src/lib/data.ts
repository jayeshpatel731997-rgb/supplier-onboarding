import { addDays, differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";
import { getAppUrl } from "@/lib/env";
import {
  calculateCompletion,
  canAddSupplier,
  DOCUMENT_LABELS,
  DocumentType,
  getDueExpiryWarnings,
  getDueOnboardingReminders,
} from "@/lib/domain";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type BuyerSettings = {
  buyer_id: string;
  required_documents: DocumentType[];
  onboarding_deadline_days: number;
  reminder_days_before_expiry: number[];
  company_name: string;
  logo_url: string | null;
  subscription_status: "free" | "pro";
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
};

export type SupplierListItem = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  attention: boolean;
  completion: number;
  lastActivity: string;
  createdAt: string;
  completedAt: string | null;
  documents: SupplierDocumentView[];
};

export type SupplierDocumentView = {
  id: string;
  documentType: DocumentType;
  label: string;
  fileUrl: string | null;
  fileName: string | null;
  status: string;
  expiryDate: string | null;
  uploadedAt: string | null;
  notes: string | null;
};

export type SupplierDetail = SupplierListItem & {
  token: string;
  tokenExpiresAt: string;
  website: string | null;
  supplierInfo: Record<string, unknown> | null;
  reminderLogs: Array<{
    id: string;
    reminder_type: string;
    sent_at: string;
    document_type: string | null;
  }>;
};

export type ExpiringDocumentItem = {
  supplierId: string;
  supplierName: string;
  document: SupplierDocumentView;
  daysLeft: number;
};

export async function getBuyerSettings(buyerId: string): Promise<BuyerSettings> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("buyer_settings")
    .select("*")
    .eq("buyer_id", buyerId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BuyerSettings;
}

export async function getSupplierCount(buyerId: string) {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function createSupplierInvite(input: {
  buyerId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  requiredDocuments: DocumentType[];
}) {
  const admin = getSupabaseAdmin();
  const settings = await getBuyerSettings(input.buyerId);
  const supplierCount = await getSupplierCount(input.buyerId);
  const limit = canAddSupplier({
    subscriptionStatus: settings.subscription_status,
    supplierCount,
  });

  if (!limit.allowed) {
    throw new Error("Free plan is limited to 5 suppliers. Upgrade to Pro to invite more suppliers.");
  }

  const tokenExpiresAt = addDays(new Date(), settings.onboarding_deadline_days).toISOString();
  const { data: supplier, error } = await admin
    .from("suppliers")
    .insert({
      buyer_id: input.buyerId,
      company_name: input.companyName,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      token_expires_at: tokenExpiresAt,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const documents = input.requiredDocuments.map((documentType) => ({
    supplier_id: supplier.id,
    document_type: documentType,
  }));

  const { error: documentError } = await admin.from("supplier_documents").insert(documents);
  if (documentError) {
    throw new Error(documentError.message);
  }

  return {
    supplier,
    settings,
    inviteUrl: `${getAppUrl()}/onboard/${supplier.onboarding_token}`,
  };
}

export async function listSuppliers(buyerId: string): Promise<SupplierListItem[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("suppliers")
    .select("*, supplier_documents(*), supplier_info(*)")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeSupplier);
}

export async function getSupplierDetail(
  buyerId: string,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("suppliers")
    .select("*, supplier_documents(*), supplier_info(*), reminder_logs(*)")
    .eq("buyer_id", buyerId)
    .eq("id", supplierId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    ...normalizeSupplier(data),
    token: data.onboarding_token,
    tokenExpiresAt: data.token_expires_at,
    website: data.website,
    supplierInfo: Array.isArray(data.supplier_info) ? data.supplier_info[0] ?? null : data.supplier_info,
    reminderLogs: data.reminder_logs ?? [],
  };
}

export async function getOnboardingByToken(token: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("suppliers")
    .select("*, supplier_documents(*)")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const buyerSettings = await getBuyerSettings(data.buyer_id);

  return {
    supplier: data,
    documents: ((data.supplier_documents ?? []) as Array<Record<string, unknown>>).map(
      normalizeDocument,
    ),
    buyerSettings,
    isExpired: new Date(data.token_expires_at) < new Date(),
  };
}

export async function getBuyerEmail(buyerId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(buyerId);
  if (error) {
    throw new Error(error.message);
  }
  return data.user.email ?? "";
}

export function buildDashboardStats(suppliers: SupplierListItem[]) {
  return {
    total: suppliers.length,
    complete: suppliers.filter((supplier) => supplier.status === "complete").length,
    pending: suppliers.filter((supplier) => supplier.status !== "complete").length,
    expiringSoon: suppliers.flatMap((supplier) =>
      supplier.documents.filter((document) => {
        if (!document.expiryDate) {
          return false;
        }
        const days = differenceInCalendarDays(new Date(document.expiryDate), new Date());
        return days >= 0 && days <= 90;
      }),
    ).length,
  };
}

export function getExpiringDocuments(suppliers: SupplierListItem[]): ExpiringDocumentItem[] {
  return suppliers
    .flatMap((supplier) =>
      supplier.documents
        .filter((document) => document.expiryDate)
        .map((document) => ({
          supplierId: supplier.id,
          supplierName: supplier.companyName,
          document,
          daysLeft: differenceInCalendarDays(new Date(document.expiryDate as string), new Date()),
        })),
    )
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export async function markSupplierArchived(buyerId: string, supplierId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("suppliers")
    .update({ status: "expired" })
    .eq("buyer_id", buyerId)
    .eq("id", supplierId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getReminderCandidates() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("suppliers")
    .select("*, reminder_logs(*)")
    .in("status", ["invited", "in_progress"]);

  if (error) {
    throw new Error(error.message);
  }

  const supplierRows = (data ?? []) as any[];
  const settings = await Promise.all(
    Array.from(new Set(supplierRows.map((supplier: any) => supplier.buyer_id))).map((buyerId) =>
      getBuyerSettings(buyerId),
    ),
  );
  const settingsByBuyer = new Map(settings.map((item) => [item.buyer_id, item]));

  return supplierRows.filter(
    (row: any) => settingsByBuyer.get(row.buyer_id)?.subscription_status === "pro",
  );
}

export async function getExpiryWarningCandidates() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("supplier_documents")
    .select("*, suppliers!inner(*, reminder_logs(*))")
    .not("expiry_date", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const documentRows = (data ?? []) as any[];
  const buyerIds = Array.from(new Set(documentRows.map((row: any) => row.suppliers.buyer_id)));
  const settings = await Promise.all(buyerIds.map((buyerId) => getBuyerSettings(buyerId)));
  const proBuyers = new Set(
    settings
      .filter((item) => item.subscription_status === "pro")
      .map((item) => item.buyer_id),
  );

  return documentRows.filter((row: any) => proBuyers.has(row.suppliers.buyer_id));
}

export async function runOnboardingReminderSelection(now = new Date()) {
  const candidates = await getReminderCandidates();
  return getDueOnboardingReminders(
    candidates.map((supplier: any) => {
      const onboardingLogs = (supplier.reminder_logs ?? [])
        .filter((log: { reminder_type: string }) => log.reminder_type === "onboarding")
        .sort((a: { sent_at: string }, b: { sent_at: string }) =>
          b.sent_at.localeCompare(a.sent_at),
        );

      return {
        id: supplier.id,
        status: supplier.status,
        createdAt: supplier.created_at,
        contactEmail: supplier.contact_email,
        companyName: supplier.company_name,
        lastReminderAt: onboardingLogs[0]?.sent_at ?? null,
      };
    }),
    now,
  );
}

export async function runExpiryWarningSelection(now = new Date()) {
  const candidates = await getExpiryWarningCandidates();
  return getDueExpiryWarnings(
    candidates.map((document: any) => {
      const supplier = document.suppliers;
      const logs = (supplier.reminder_logs ?? []).filter(
        (log: { reminder_type: string; document_type: string | null }) =>
          log.reminder_type === "expiry" && log.document_type === document.document_type,
      );

      return {
        supplierId: supplier.id,
        supplierName: supplier.company_name,
        buyerEmail: supplier.buyer_id,
        documentType: document.document_type,
        expiryDate: document.expiry_date,
        lastSentDaysLeft: logs
          .map((log: { sent_at: string }) =>
            differenceInCalendarDays(new Date(document.expiry_date), new Date(log.sent_at)),
          )
          .filter((days: number) => [90, 60, 30, 7].includes(days)),
      };
    }),
    now,
    [90, 60, 30, 7],
  );
}

export async function logReminder(
  supplierId: string,
  reminderType: "onboarding" | "expiry",
  documentType?: string,
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("reminder_logs").insert({
    supplier_id: supplierId,
    reminder_type: reminderType,
    document_type: documentType ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeSupplier(row: Record<string, any>): SupplierListItem {
  const documents = ((row.supplier_documents ?? []) as Array<Record<string, unknown>>).map(
    normalizeDocument,
  );
  const info = Array.isArray(row.supplier_info) ? row.supplier_info[0] : row.supplier_info;
  const uploadedDocuments = documents
    .filter((document) => ["uploaded", "verified"].includes(document.status))
    .map((document) => document.documentType);
  const completion = calculateCompletion({
    hasBusinessInfo: Boolean(info?.tax_id && info?.address_line1),
    hasContactInfo: Boolean(info?.primary_contact_email || row.contact_email),
    hasBankingInfo: Boolean(info?.payment_method),
    requiredDocuments: documents.map((document) => document.documentType),
    uploadedDocuments,
  });
  const attention = documents.some((document) => {
    if (!document.expiryDate) {
      return false;
    }
    const days = differenceInCalendarDays(new Date(document.expiryDate), new Date());
    return days >= 0 && days < 30;
  });

  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    attention,
    completion,
    lastActivity: formatDistanceToNowStrict(new Date(row.updated_at ?? row.created_at), {
      addSuffix: true,
    }),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    documents,
  };
}

function normalizeDocument(row: Record<string, unknown>): SupplierDocumentView {
  const documentType = row.document_type as DocumentType;
  return {
    id: row.id as string,
    documentType,
    label: DOCUMENT_LABELS[documentType] ?? String(row.document_type),
    fileUrl: (row.file_url as string | null) ?? null,
    fileName: (row.file_name as string | null) ?? null,
    status: (row.status as string) ?? "pending",
    expiryDate: (row.expiry_date as string | null) ?? null,
    uploadedAt: (row.uploaded_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}
