import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { isDemoSession } from "@/lib/demo";
import { z } from "zod";

const UpdateClientSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      orders: { include: { product: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !client.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_CLIENT, entity: "Client", entityId: params.id });

  return NextResponse.json({
    ...client,
    name: decrypt(client.nameEncrypted),
    email: decrypt(client.email),
    phone: client.phone ? decrypt(client.phone) : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateClientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.name) updateData.nameEncrypted = encrypt(data.name);
  if (data.email) updateData.email = encrypt(data.email);
  if (data.phone !== undefined) updateData.phone = data.phone ? encrypt(data.phone) : null;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.country) updateData.country = data.country;
  if (data.language !== undefined) updateData.language = data.language;
  if (data.tags) updateData.tags = data.tags;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const existing = await prisma.client.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !existing.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await prisma.client.update({ where: { id: params.id }, data: updateData });

  await logAudit({ userId: session.user.id, action: AuditActions.UPDATE_CLIENT, entity: "Client", entityId: params.id });

  return NextResponse.json({
    ...client,
    name: decrypt(client.nameEncrypted),
    email: decrypt(client.email),
    phone: client.phone ? decrypt(client.phone) : null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.client.delete({ where: { id: params.id } });

  await logAudit({ userId: session.user.id, action: AuditActions.DELETE_CLIENT, entity: "Client", entityId: params.id });

  return NextResponse.json({ success: true });
}
