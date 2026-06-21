import { differenceInCalendarDays, parseISO } from "date-fns";

export const DOCUMENT_TYPES = [
  "w9",
  "insurance_cert",
  "bank_info",
  "business_license",
  "questionnaire",
  "iso_cert",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  w9: "W-9",
  insurance_cert: "Certificate of Insurance",
  bank_info: "Voided Check",
  business_license: "Business License",
  questionnaire: "Supplier Questionnaire",
  iso_cert: "ISO Cert",
};

export type SupplierStatus = "invited" | "in_progress" | "complete" | "expired";
export type SubscriptionStatus = "free" | "pro";

export type CompletionInput = {
  hasBusinessInfo: boolean;
  hasContactInfo: boolean;
  hasBankingInfo: boolean;
  requiredDocuments: string[];
  uploadedDocuments: string[];
};

export function calculateCompletion(input: CompletionInput) {
  const totalSections = 3 + input.requiredDocuments.length;
  if (totalSections === 0) {
    return 0;
  }

  const completedSections =
    Number(input.hasBusinessInfo) +
    Number(input.hasContactInfo) +
    Number(input.hasBankingInfo) +
    input.requiredDocuments.filter((documentType) =>
      input.uploadedDocuments.includes(documentType),
    ).length;

  return Math.round((completedSections / totalSections) * 100);
}

export function canAddSupplier(input: {
  subscriptionStatus: SubscriptionStatus;
  supplierCount: number;
}) {
  if (input.subscriptionStatus === "pro") {
    return { allowed: true, remaining: null };
  }

  const remaining = Math.max(0, 5 - input.supplierCount);
  return { allowed: remaining > 0, remaining };
}

type IncompleteSupplierReminderInput = {
  id: string;
  status: SupplierStatus;
  createdAt: string;
  contactEmail: string;
  companyName: string;
  lastReminderAt: string | null;
};

export function getDueOnboardingReminders(
  suppliers: IncompleteSupplierReminderInput[],
  now = new Date(),
) {
  return suppliers.filter((supplier) => {
    if (supplier.status === "complete" || supplier.status === "expired") {
      return false;
    }

    const anchor = supplier.lastReminderAt ?? supplier.createdAt;
    return differenceInCalendarDays(now, parseISO(anchor)) >= 3;
  });
}

type ExpiryWarningInput = {
  supplierId: string;
  supplierName: string;
  buyerEmail: string;
  documentType: string;
  expiryDate: string;
  lastSentDaysLeft: number[];
};

export function getDueExpiryWarnings(
  documents: ExpiryWarningInput[],
  now = new Date(),
  reminderDays = [90, 60, 30, 7],
) {
  return documents.flatMap((document) => {
    const daysLeft = differenceInCalendarDays(parseISO(document.expiryDate), now);
    if (!reminderDays.includes(daysLeft) || document.lastSentDaysLeft.includes(daysLeft)) {
      return [];
    }

    return [
      {
        supplierId: document.supplierId,
        supplierName: document.supplierName,
        buyerEmail: document.buyerEmail,
        documentType: document.documentType,
        expiryDate: document.expiryDate,
        daysLeft,
      },
    ];
  });
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export type ClaudeExpiryResult = {
  expiry_date: string | null;
  issue_date: string | null;
  document_number: string | null;
  coverage_amount: string | null;
};

export function parseClaudeExpiryJson(content: string): ClaudeExpiryResult {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Claude response did not contain a JSON object");
  }

  const parsed = JSON.parse(content.slice(start, end + 1)) as Partial<ClaudeExpiryResult>;
  const result: ClaudeExpiryResult = {
    expiry_date: parsed.expiry_date ?? null,
    issue_date: parsed.issue_date ?? null,
    document_number: parsed.document_number ?? null,
    coverage_amount: parsed.coverage_amount ?? null,
  };

  for (const field of ["expiry_date", "issue_date"] as const) {
    if (result[field] !== null && !datePattern.test(result[field])) {
      throw new Error(`${field} must be YYYY-MM-DD or null`);
    }
  }

  return result;
}

export function documentExpiryTone(expiryDate: string | null, now = new Date()) {
  if (!expiryDate) {
    return "neutral";
  }

  const daysLeft = differenceInCalendarDays(parseISO(expiryDate), now);
  if (daysLeft < 30) {
    return "red";
  }
  if (daysLeft < 90) {
    return "yellow";
  }
  return "neutral";
}
