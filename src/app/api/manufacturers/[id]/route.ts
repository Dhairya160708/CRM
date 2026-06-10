import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { isDemoSession } from "@/lib/demo";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
  contact: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  reliabilityScore: z.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: params.id },
    include: {
      products: { include: { product: true } },
      orders: { include: { product: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!manufacturer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !manufacturer.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_MANUFACTURER, entity: "Manufacturer", entityId: params.id });

  return NextResponse.json({
    ...manufacturer,
    name: decrypt(manufacturer.nameEncrypted),
    contact: decrypt(manufacturer.contactEncrypted),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.name) updateData.nameEncrypted = encrypt(data.name);
  if (data.contact) updateData.contactEncrypted = encrypt(data.contact);
  if (data.location) updateData.location = data.location;
  if (data.certifications) updateData.certifications = data.certifications;
  if (data.reliabilityScore !== undefined) updateData.reliabilityScore = data.reliabilityScore;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const existing = await prisma.manufacturer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !existing.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const manufacturer = await prisma.manufacturer.update({ where: { id: params.id }, data: updateData });

  await logAudit({ userId: session.user.id, action: AuditActions.UPDATE_MANUFACTURER, entity: "Manufacturer", entityId: params.id });

  return NextResponse.json({
    ...manufacturer,
    name: decrypt(manufacturer.nameEncrypted),
    contact: decrypt(manufacturer.contactEncrypted),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.manufacturer.delete({ where: { id: params.id } });

  await logAudit({ userId: session.user.id, action: AuditActions.DELETE_MANUFACTURER, entity: "Manufacturer", entityId: params.id });

  return NextResponse.json({ success: true });
}
