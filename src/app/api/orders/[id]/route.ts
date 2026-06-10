import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { isDemoSession } from "@/lib/demo";
import { z } from "zod";

const UpdateOrderSchema = z.object({
  status: z.enum(["INQUIRY","SOURCING","QUOTED","NEGOTIATING","CONFIRMED","IN_PRODUCTION","SHIPPED","DELIVERED","CLOSED","CANCELLED"]).optional(),
  priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  specs: z.string().optional(),
  targetPrice: z.number().optional().nullable(),
  confirmedPrice: z.number().optional().nullable(),
  currency: z.string().optional(),
  incoterms: z.string().optional(),
  deliveryCountry: z.string().optional(),
  manufacturerId: z.string().optional().nullable(),
  expectedShipDate: z.string().optional().nullable(),
  actualShipDate: z.string().optional().nullable(),
  statusNote: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      manufacturer: true,
      product: true,
      emailThreads: { include: { messages: { orderBy: { sentAt: "asc" } } }, orderBy: { updatedAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !order.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = {
    ...order,
    client: { ...order.client, name: decrypt(order.client.nameEncrypted) },
    manufacturer: order.manufacturer
      ? { ...order.manufacturer, name: decrypt(order.manufacturer.nameEncrypted) }
      : null,
  };
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isDemoSession(session) && !existing.isDemoData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = { ...data };
  delete updateData.statusNote;

  if (data.expectedShipDate === null) updateData.expectedShipDate = null;
  else if (data.expectedShipDate) updateData.expectedShipDate = new Date(data.expectedShipDate);

  if (data.actualShipDate === null) updateData.actualShipDate = null;
  else if (data.actualShipDate) updateData.actualShipDate = new Date(data.actualShipDate);

  const order = await prisma.order.update({
    where: { id: params.id },
    data: updateData,
    include: { client: true, product: true, manufacturer: true },
  });

  // Log status change
  if (data.status && data.status !== existing.status) {
    await prisma.statusHistory.create({
      data: {
        orderId: params.id,
        from: existing.status,
        to: data.status,
        changedBy: session.user.name ?? session.user.email ?? "system",
        note: data.statusNote,
      },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: AuditActions.UPDATE_ORDER,
    entity: "Order",
    entityId: params.id,
    details: data as Record<string, unknown>,
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.order.delete({ where: { id: params.id } });

  await logAudit({
    userId: session.user.id,
    action: AuditActions.DELETE_ORDER,
    entity: "Order",
    entityId: params.id,
  });

  return NextResponse.json({ success: true });
}
