import { z } from "zod";
import { DOCUMENT_TYPES } from "@/lib/domain";

const phone = z.string().trim().min(7, "Enter a valid phone number").max(30);
const optionalPhone = z.string().trim().max(30).optional().or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a work email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mode: z.enum(["sign-in", "sign-up"]),
});

export const inviteSupplierSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  contactName: z.string().trim().min(2, "Contact name is required"),
  contactEmail: z.string().trim().email("Enter a valid supplier email"),
  contactPhone: optionalPhone,
  requiredDocuments: z
    .array(z.enum(DOCUMENT_TYPES))
    .min(1, "Select at least one required document"),
  personalMessage: z.string().trim().max(1200).optional(),
});

export const settingsSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  requiredDocuments: z.array(z.enum(DOCUMENT_TYPES)).min(1),
  onboardingDeadlineDays: z.coerce.number().int().min(1).max(120),
  reminderDaysBeforeExpiry: z
    .array(z.coerce.number().int().min(1).max(365))
    .min(1, "Add at least one expiry reminder day"),
});

export const onboardSubmitSchema = z.object({
  token: z.string().uuid(),
  business: z.object({
    legalCompanyName: z.string().trim().min(2, "Legal company name is required"),
    businessType: z.enum(["llc", "corporation", "sole_proprietor", "partnership"]),
    taxId: z.string().trim().min(4, "Tax ID/EIN is required"),
    addressLine1: z.string().trim().min(3, "Address is required"),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    zip: z.string().trim().min(4, "ZIP/postal code is required"),
    country: z.string().trim().min(2, "Country is required"),
    website: z.string().trim().url("Enter a valid website").optional().or(z.literal("")),
    phone,
  }),
  contact: z.object({
    primaryContactName: z.string().trim().min(2, "Primary contact name is required"),
    primaryContactEmail: z.string().trim().email("Enter a valid contact email"),
    primaryContactPhone: phone,
    apEmail: z.string().trim().email("Enter a valid AP email"),
  }),
  banking: z.object({
    paymentMethod: z.enum(["ach", "check", "wire"]),
    bankName: z.string().trim().optional(),
    accountType: z.enum(["checking", "savings"]).optional(),
  }),
  diversityCertifications: z.array(z.string()).default([]),
});

export const uploadDocumentSchema = z.object({
  token: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
});
