import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGmailForUser } from "@/lib/email-sync";

/**
 * Cron entry point for syncing Gmail inboxes — performs one sync pass per
 * connected user per invocation. Schedule this with an external cron
 * (e.g. Vercel Cron) hitting this route with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.gmailToken.findMany({ select: { userId: true } });

  const results: { userId: string; synced?: number; skipped?: number; filtered?: number; error?: string }[] = [];

  for (const { userId } of tokens) {
    try {
      const result = await syncGmailForUser(userId);
      results.push({ userId, ...result });
    } catch (err) {
      results.push({ userId, error: err instanceof Error ? err.message : "Sync failed" });
    }
  }

  return NextResponse.json({ results });
}
