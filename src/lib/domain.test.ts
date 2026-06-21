import { describe, expect, it } from "vitest";
import {
  calculateCompletion,
  canAddSupplier,
  documentExpiryTone,
  getDueOnboardingReminders,
  getDueExpiryWarnings,
  parseClaudeExpiryJson,
} from "@/lib/domain";

const fixedNow = new Date("2026-05-21T12:00:00.000Z");

describe("supplier completion", () => {
  it("counts profile, contact, banking, and required uploaded documents", () => {
    const completion = calculateCompletion({
      hasBusinessInfo: true,
      hasContactInfo: true,
      hasBankingInfo: false,
      requiredDocuments: ["w9", "insurance_cert"],
      uploadedDocuments: ["w9"],
    });

    expect(completion).toBe(60);
  });

  it("returns 100 when every section and required document is complete", () => {
    const completion = calculateCompletion({
      hasBusinessInfo: true,
      hasContactInfo: true,
      hasBankingInfo: true,
      requiredDocuments: ["w9", "insurance_cert"],
      uploadedDocuments: ["w9", "insurance_cert"],
    });

    expect(completion).toBe(100);
  });
});

describe("plan limits", () => {
  it("blocks the sixth supplier on the free plan", () => {
    expect(canAddSupplier({ subscriptionStatus: "free", supplierCount: 5 })).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("allows unlimited suppliers on pro", () => {
    expect(canAddSupplier({ subscriptionStatus: "pro", supplierCount: 250 })).toEqual({
      allowed: true,
      remaining: null,
    });
  });
});

describe("reminder eligibility", () => {
  it("sends onboarding reminders every three days after invite", () => {
    const due = getDueOnboardingReminders(
      [
        {
          id: "supplier-a",
          status: "invited",
          createdAt: "2026-05-15T12:00:00.000Z",
          contactEmail: "ap@example.com",
          companyName: "Apex Metals",
          lastReminderAt: "2026-05-18T12:00:00.000Z",
        },
        {
          id: "supplier-b",
          status: "in_progress",
          createdAt: "2026-05-20T12:00:00.000Z",
          contactEmail: "ops@example.com",
          companyName: "Beta Parts",
          lastReminderAt: null,
        },
      ],
      fixedNow,
    );

    expect(due.map((supplier) => supplier.id)).toEqual(["supplier-a"]);
  });

  it("sends expiry warnings only on configured day windows", () => {
    const due = getDueExpiryWarnings(
      [
        {
          supplierId: "supplier-a",
          supplierName: "Apex Metals",
          buyerEmail: "buyer@example.com",
          documentType: "insurance_cert",
          expiryDate: "2026-06-20",
          lastSentDaysLeft: [],
        },
        {
          supplierId: "supplier-b",
          supplierName: "Beta Parts",
          buyerEmail: "buyer@example.com",
          documentType: "business_license",
          expiryDate: "2026-06-19",
          lastSentDaysLeft: [],
        },
      ],
      fixedNow,
      [90, 60, 30, 7],
    );

    expect(due).toEqual([
      {
        supplierId: "supplier-a",
        supplierName: "Apex Metals",
        buyerEmail: "buyer@example.com",
        documentType: "insurance_cert",
        expiryDate: "2026-06-20",
        daysLeft: 30,
      },
    ]);
  });
});

describe("document expiry parsing", () => {
  it("extracts valid JSON even when Claude wraps the object in prose", () => {
    expect(
      parseClaudeExpiryJson('Here is the result: {"expiry_date":"2026-12-31","issue_date":null,"document_number":"COI-42","coverage_amount":"$1M"}'),
    ).toEqual({
      expiry_date: "2026-12-31",
      issue_date: null,
      document_number: "COI-42",
      coverage_amount: "$1M",
    });
  });

  it("rejects impossible date formats", () => {
    expect(() => parseClaudeExpiryJson('{"expiry_date":"12/31/2026"}')).toThrow(
      "expiry_date must be YYYY-MM-DD or null",
    );
  });
});

describe("expiry UI tone", () => {
  it("marks documents under 30 days as red and under 90 as yellow", () => {
    expect(documentExpiryTone("2026-06-10", fixedNow)).toBe("red");
    expect(documentExpiryTone("2026-08-01", fixedNow)).toBe("yellow");
    expect(documentExpiryTone("2026-12-31", fixedNow)).toBe("neutral");
  });
});
