import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEmailWithAI } from "@/lib/email-parser";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await req.json();
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  // Concatenate all messages for the AI
  const content = thread.messages
    .map(
      (m: { from: string; to: string; sentAt: Date; subject: string; body: string }) =>
        `From: ${m.from}\nTo: ${m.to}\nDate: ${m.sentAt.toISOString()}\nSubject: ${m.subject}\n\n${m.body}`
    )
    .join("\n\n---\n\n");

  const parsed = await parseEmailWithAI(content);

  // Save AI result to the first message and update thread summary
  await prisma.$transaction([
    prisma.emailMessage.update({
      where: { id: thread.messages[0].id },
      data: { aiExtracted: parsed as object },
    }),
    prisma.emailThread.update({
      where: { id: threadId },
      data: { aiSummary: parsed.summary },
    }),
  ]);

  return NextResponse.json(parsed);
}
