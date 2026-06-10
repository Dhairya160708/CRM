import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoWhere, demoFlag } from "@/lib/demo";
import { z } from "zod";

const CreateThreadSchema = z.object({
  subject: z.string().min(1),
  clientId: z.string().optional(),
  orderId: z.string().optional(),
  gmailThreadId: z.string().optional(),
  messages: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      htmlBody: z.string().optional(),
      sentAt: z.string(),
      isInbound: z.boolean(),
      gmailId: z.string().optional(),
    })
  ).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const orderId = searchParams.get("orderId");
  const unlinked = searchParams.get("unlinked") === "true";
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "30");

  const where: Record<string, unknown> = { ...demoWhere(session) };
  if (clientId) where.clientId = clientId;
  if (orderId) where.orderId = orderId;
  if (unlinked) where.orderId = null;
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { aiSummary: { contains: search, mode: "insensitive" } },
    ];
  }

  const [threads, total] = await Promise.all([
    prisma.emailThread.findMany({
      where,
      include: {
        client: true,
        order: { select: { id: true, orderNumber: true, status: true } },
        messages: {
          orderBy: { sentAt: "asc" },
          take: 1,
          select: { from: true, sentAt: true, body: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailThread.count({ where }),
  ]);

  return NextResponse.json({ threads, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateThreadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const thread = await prisma.emailThread.create({
    data: {
      subject: data.subject,
      clientId: data.clientId,
      orderId: data.orderId,
      gmailThreadId: data.gmailThreadId,
      isDemoData: demoFlag(session),
      messages: data.messages
        ? {
            create: data.messages.map((m) => ({
              from: m.from,
              to: m.to,
              subject: m.subject,
              body: m.body,
              htmlBody: m.htmlBody,
              sentAt: new Date(m.sentAt),
              isInbound: m.isInbound,
              gmailId: m.gmailId,
            })),
          }
        : undefined,
    },
    include: { messages: true },
  });

  return NextResponse.json(thread, { status: 201 });
}
