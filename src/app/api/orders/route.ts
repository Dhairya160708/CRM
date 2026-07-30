import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditActions } from "@/lib/audit";
import { demoFlag } from "@/lib/demo";
import { getOrders } from "@/lib/queries/orders";
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
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "25");

  const result = await getOrders(session, {
    status: searchParams.get("status"),
    clientId: searchParams.get("clientId"),
    search: searchParams.get("search"),
    page,
    limit,
  });

  return NextResponse.json(result);
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
