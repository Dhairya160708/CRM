import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDemoSession } from "@/lib/demo";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await prisma.emailThread.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      order: { select: { id: true, orderNumber: true, status: true, product: true } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !thread.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(thread);
}

const LinkSchema = z.object({
  orderId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  aiSummary: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.emailThread.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !existing.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const thread = await prisma.emailThread.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(thread);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.emailThread.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
