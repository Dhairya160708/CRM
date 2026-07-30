import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { demoWhere } from "@/lib/demo";

export interface OrdersQueryParams {
  status?: string | null;
  clientId?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export async function getOrders(session: Session, params: OrdersQueryParams = {}) {
  const { status, clientId, search, page = 1, limit = 25 } = params;

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

  return { orders: decryptedOrders, total, page, limit };
}

export type OrderListItem = Awaited<ReturnType<typeof getOrders>>["orders"][number];
