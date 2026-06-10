import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { demoWhere, demoFlag } from "@/lib/demo";
import { z } from "zod";

const ManufacturerSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  contact: z.string().min(1),
  certifications: z.array(z.string()).default([]),
  reliabilityScore: z.number().min(0).max(5).default(0),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const manufacturers = await prisma.manufacturer.findMany({
    where: demoWhere(session),
    select: {
      id: true,
      nameEncrypted: true,
      location: true,
      certifications: true,
      reliabilityScore: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const decrypted = manufacturers.map(({ nameEncrypted, ...m }) => ({
    ...m,
    name: decrypt(nameEncrypted),
  }));

  await logAudit({ userId: session.user.id, action: AuditActions.VIEW_MANUFACTURER, entity: "Manufacturer" });

  return NextResponse.json(decrypted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ManufacturerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const manufacturer = await prisma.manufacturer.create({
    data: {
      nameEncrypted: encrypt(data.name),
      location: data.location,
      contactEncrypted: encrypt(data.contact),
      certifications: data.certifications,
      reliabilityScore: data.reliabilityScore,
      isDemoData: demoFlag(session),
    },
  });

  await logAudit({ userId: session.user.id, action: AuditActions.CREATE_MANUFACTURER, entity: "Manufacturer", entityId: manufacturer.id });

  return NextResponse.json({ ...manufacturer, name: data.name, contact: data.contact }, { status: 201 });
}
