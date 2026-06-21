import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { parseClaudeExpiryJson } from "@/lib/domain";

let anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: getEnv("ANTHROPIC_API_KEY") });
  }
  return anthropic;
}

export async function extractDocumentExpiry(fileBase64: string, documentType: string) {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: "You are a document processing assistant for procurement",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: fileBase64,
            },
          },
          {
            type: "text",
            text: `Extract from this ${documentType}:
expiry_date (YYYY-MM-DD or null),
issue_date (YYYY-MM-DD or null),
document_number (string or null),
coverage_amount (string or null)
Return ONLY valid JSON.`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseClaudeExpiryJson(text);
}
