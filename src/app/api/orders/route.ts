import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";
import { demoWhere, demoFlag } from "@/lib/demo";
import { z } from "zod";

const CreateOrderSchema = z.object({
  clientId: z.string(),
  productId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  specs: z.string().optional(),
  targetPrice: z.number().optional(),
  currency: z.string().default("USD"),
  incoterms: z.string().optional(),
  deliveryCountry: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  manufacturerId: z.string().optional(),
  expectedShipDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "25");

  const where: Record<string, unknown> = { ...demoWhere(session) };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
      { deliveryCountry: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        priority: true,
        quantity: true,
        unit: true,
        targetPrice: true,
        confirmedPrice: true,
        currency: true,
        deliveryCountry: true,
        updatedAt: true,
        createdAt: true,
        client: { select: { id: true, nameEncrypted: true, country: true } },
        product: { select: { id: true, name: true } },
        manufacturer: { select: { id: true, nameEncrypted: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const decryptedOrders = orders.map((o) => ({
    ...o,
    client: { ...o.client, name: decrypt(o.client.nameEncrypted) },
    manufacturer: o.manufacturer
      ? { ...o.manufacturer, name: decrypt(o.manufacturer.nameEncrypted) }
      : null,
  }));

  return NextResponse.json({ orders: decryptedOrders, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // Generate unique order number
  let orderNumber: string;
  let attempts = 0;
  do {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 9000) + 1000;
    orderNumber = `ORD-${year}-${rand}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (!exists) break;
    attempts++;
  } while (attempts < 10);

  const order = await prisma.order.create({
    data: {
      orderNumber: orderNumber!,
      clientId: data.clientId,
      productId: data.productId,
      quantity: data.quantity,
      unit: data.unit,
      specs: data.specs,
      targetPrice: data.targetPrice,
      currency: data.currency,
      incoterms: data.incoterms,
      deliveryCountry: data.deliveryCountry,
      priority: data.priority,
      manufacturerId: data.manufacturerId,
      isDemoData: demoFlag(session),
      expectedShipDate: data.expectedShipDate ? new Date(data.expectedShipDate) : undefined,
      statusHistory: {
        create: {
          from: "INQUIRY",
          to: "INQUIRY",
          changedBy: session.user.name ?? session.user.email ?? "system",
          note: "Order created",
        },
      },
    },
    include: { client: true, product: true },
  });

  await logAudit({
    userId: session.user.id,
    action: AuditActions.CREATE_ORDER,
    entity: "Order",
    entityId: order.id,
    details: { orderNumber: order.orderNumber },
  });

  return NextResponse.json(order, { status: 201 });
}
