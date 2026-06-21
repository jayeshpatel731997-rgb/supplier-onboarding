import { apiError, ok } from "@/lib/api";
import { DOCUMENT_LABELS, type DocumentType } from "@/lib/domain";
import { getBuyerEmail, logReminder, runExpiryWarningSelection } from "@/lib/data";
import { sendExpiryWarning } from "@/lib/resend";

export async function POST() {
  try {
    const due = await runExpiryWarningSelection();
    let sent = 0;

    for (const warning of due) {
      const buyerEmail = await getBuyerEmail(warning.buyerEmail);
      if (!buyerEmail) {
        continue;
      }
      await sendExpiryWarning(
        buyerEmail,
        warning.supplierName,
        DOCUMENT_LABELS[warning.documentType as DocumentType] ?? warning.documentType,
        warning.expiryDate,
        warning.daysLeft,
      );
      await logReminder(warning.supplierId, "expiry", warning.documentType);
      sent += 1;
    }

    return ok({ sent });
  } catch (error) {
    return apiError(error);
  }
}
