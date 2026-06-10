import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { demoWhere, demoFlag } from "@/lib/demo";
import { z } from "zod";

const ClientSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  country: z.string().min(1),
  language: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const clients = await prisma.client.findMany({
    where: demoWhere(session),
    select: {
      id: true,
      nameEncrypted: true,
      company: true,
      country: true,
      language: true,
      tags: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const decrypted = clients.map(({ nameEncrypted, ...c }) => ({
    ...c,
    name: decrypt(nameEncrypted),
  }));

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_CLIENT, entity: "Client" });

  return NextResponse.json(decrypted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ClientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const client = await prisma.client.create({
    data: {
      nameEncrypted: encrypt(data.name),
      company: data.company,
      country: data.country,
      language: data.language,
      email: encrypt(data.email),
      phone: data.phone ? encrypt(data.phone) : null,
      tags: data.tags,
      isDemoData: demoFlag(session),
    },
  });

  await logAudit({ userId: session.user.id, action: AuditActions.CREATE_CLIENT, entity: "Client", entityId: client.id });

  return NextResponse.json({ ...client, name: data.name, email: data.email }, { status: 201 });
}
