import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ParsedEmailData {
  isBusinessRelevant: boolean;
  relevanceReason: string;
  isInquiry: boolean;
  productName: string | null;
  quantity: number | null;
  unit: string | null;
  specs: string | null;
  targetPrice: number | null;
  currency: string | null;
  deliveryCountry: string | null;
  deliveryPort: string | null;
  incoterms: string | null;
  requiredDocuments: string[];
  urgency: "low" | "normal" | "high" | "urgent";
  summary: string;
  suggestedStatus: string | null;
}

export async function parseEmailWithAI(emailContent: string): Promise<ParsedEmailData> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "You are a strict email classifier for a pharmaceutical raw materials trading company in India. " +
      "The business ONLY deals in bulk raw pharmaceutical ingredients — APIs, excipients, and chemicals — " +
      "sourced from Indian manufacturers for foreign buyers/agents. " +
      "Your classification must be very precise. Only mark emails as relevant if they directly relate " +
      "to this specific trade. Respond with ONLY a valid JSON object, no explanation, no markdown.",
    messages: [
      {
        role: "user",
        content: `Classify this email as RELEVANT or NOT RELEVANT to a pharma raw materials trading business.

MARK AS RELEVANT (isBusinessRelevant: true) ONLY if the email is:
- An inquiry about a pharmaceutical raw material, API, excipient, or bulk chemical
- A price quote, counter-offer, or negotiation for such materials
- An order confirmation, purchase order, or proforma invoice for pharma materials
- A follow-up on an active order (production, quality, delivery)
- A shipping document request or dispatch update for pharma materials (COA, MSDS, invoice)
- A communication from a manufacturer/supplier about pharma product availability or pricing
- A payment confirmation or LC (letter of credit) related to a pharma trade order

MARK AS NOT RELEVANT (isBusinessRelevant: false) if the email is:
- A bank transaction alert, account statement, or any email from a bank or financial institution
- A payment receipt from PayPal, Stripe, Razorpay, or any payment gateway
- A newsletter, promotional offer, or marketing email from any company
- A software/SaaS subscription, invoice, or renewal notice
- A social media notification (LinkedIn, Twitter, Facebook, etc.)
- A utility bill or telecom bill
- A job board or recruitment email
- An automated system alert, IT notification, or server monitoring email
- A shipping update from a consumer service (Amazon, Flipkart, courier tracking)
- Any email unrelated to pharmaceutical raw material trade

Return this JSON:
{
  "isBusinessRelevant": boolean,
  "relevanceReason": string,
  "isInquiry": boolean,
  "productName": string | null,
  "quantity": number | null,
  "unit": string | null,
  "specs": string | null,
  "targetPrice": number | null,
  "currency": string | null,
  "deliveryCountry": string | null,
  "deliveryPort": string | null,
  "incoterms": string | null,
  "requiredDocuments": string[],
  "urgency": "low" | "normal" | "high" | "urgent",
  "summary": string,
  "suggestedStatus": string | null
}

Email:
${emailContent}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");
  return JSON.parse(jsonMatch[0]) as ParsedEmailData;
}
