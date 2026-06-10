import { prisma } from "@/lib/prisma";
import {
  fetchGmailThreads,
  fetchAllGmailThreadIds,
  fetchThreadsBatch,
  parseGmailThread,
  refreshGmailAccessToken,
} from "@/lib/gmail";
import { parseEmailWithAI } from "@/lib/email-parser";
import { decryptIfExists } from "@/lib/encryption";

export interface SyncResult {
  synced: number;
  skipped: number;
  filtered: number;
}

async function getValidAccessToken(userId: string): Promise<string> {
  let gmailToken = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!gmailToken) throw new Error("Gmail not connected. Connect your Gmail account in Settings first.");

  const expiresAt = gmailToken.expiresAt;
  if (gmailToken.refreshToken && expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshGmailAccessToken(gmailToken.refreshToken);
    gmailToken = await prisma.gmailToken.update({
      where: { userId },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
  }

  return gmailToken.accessToken;
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/) ?? from.match(/([^\s]+@[^\s]+)/);
  return (match?.[1] ?? from).toLowerCase().trim();
}

/** Performs one Gmail sync pass for the given user. */
export async function syncGmailForUser(
  userId: string,
  opts: { accessToken?: string; fullSync?: boolean } = {}
): Promise<SyncResult> {
  const useAI = !!process.env.ANTHROPIC_API_KEY;
  const accessToken = opts.accessToken ?? (await getValidAccessToken(userId));

  // Build client email → id lookup map (decrypt in memory)
  const allClients = await prisma.client.findMany({ select: { id: true, email: true } });
  const clientEmailMap = new Map<string, string>();
  for (const c of allClients) {
    try {
      const email = decryptIfExists(c.email).toLowerCase().trim();
      if (email) clientEmailMap.set(email, c.id);
    } catch { /* skip */ }
  }

  let synced = 0;
  let skipped = 0;
  let filtered = 0;

  let gmailThreads;

  if (opts.fullSync) {
    // Paginate entire inbox — fetch all thread IDs first, then pull full data in batches
    const allIds = await fetchAllGmailThreadIds(accessToken, 500);

    // Filter out IDs already in DB
    const existingIds = new Set(
      (await prisma.emailThread.findMany({
        where: { gmailThreadId: { in: allIds } },
        select: { gmailThreadId: true },
      })).map((t) => t.gmailThreadId!)
    );
    const newIds = allIds.filter((id) => !existingIds.has(id));

    gmailThreads = await fetchThreadsBatch(newIds, accessToken, 8);
  } else {
    gmailThreads = await fetchGmailThreads(accessToken, 50);
  }

  for (const gmailThread of gmailThreads) {
    // Skip already-synced (for regular sync path)
    if (!opts.fullSync) {
      const existing = await prisma.emailThread.findUnique({
        where: { gmailThreadId: gmailThread.id },
      });
      if (existing) { skipped++; continue; }
    }

    const parsed = parseGmailThread(gmailThread);

    let aiSummary: string | null = null;

    if (useAI && parsed.messages.length > 0) {
      const content = parsed.messages
        .slice(0, 3)
        .map(
          (m) =>
            `From: ${m.from}\nTo: ${m.to}\nDate: ${m.sentAt.toISOString()}\nSubject: ${m.subject}\n\n${m.body.slice(0, 2000)}`
        )
        .join("\n\n---\n\n");

      try {
        const aiResult = await parseEmailWithAI(content);
        if (!aiResult.isBusinessRelevant) {
          filtered++;
          continue;
        }
        aiSummary = aiResult.summary || null;
      } catch {
        // AI failure → include the email, don't silently drop
      }
    }

    // Auto-link: match sender email to a known client
    const senderEmail = extractEmailAddress(parsed.messages[0]?.from ?? "");
    let matchedClientId: string | null = clientEmailMap.get(senderEmail) ?? null;

    // Auto-link: match order number (ORD-YYYY-NNNN) in subject or first message body
    const searchText = [
      parsed.subject,
      ...(parsed.messages.slice(0, 2).map((m) => m.body.slice(0, 500))),
    ].join(" ");
    const orderNumMatch = searchText.match(/ORD-\d{4}-\d{4}/i);
    let matchedOrderId: string | null = null;

    if (orderNumMatch) {
      const order = await prisma.order.findUnique({
        where: { orderNumber: orderNumMatch[0].toUpperCase() },
        select: { id: true, clientId: true },
      });
      if (order) {
        matchedOrderId = order.id;
        if (!matchedClientId) matchedClientId = order.clientId;
      }
    }

    await prisma.emailThread.create({
      data: {
        gmailThreadId: parsed.gmailThreadId,
        subject: parsed.subject,
        aiSummary,
        ...(matchedClientId ? { clientId: matchedClientId } : {}),
        ...(matchedOrderId ? { orderId: matchedOrderId } : {}),
        messages: {
          create: parsed.messages.map((m) => ({
            gmailId: m.gmailId,
            from: m.from,
            to: m.to,
            subject: m.subject,
            body: m.body,
            sentAt: m.sentAt,
            isInbound: m.isInbound,
          })),
        },
      },
    });
    synced++;
  }

  return { synced, skipped, filtered };
}
