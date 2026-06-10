import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoWhere } from "@/lib/demo";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ notifications: [] }, { status: 401 });

  const where = demoWhere(session);

  const [overdueOrders, unlinkedEmails] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...where,
        status: { notIn: ["CLOSED", "CANCELLED", "DELIVERED", "SHIPPED"] },
        updatedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: { id: true, orderNumber: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 5,
    }),
    prisma.emailThread.findMany({
      where: { ...where, orderId: null },
      select: { id: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const notifications = [
    ...overdueOrders.map((o) => ({
      id: `order-${o.id}`,
      type: "overdue" as const,
      title: `Order ${o.orderNumber} needs attention`,
      description: "No activity in over 48 hours",
      href: `/orders/${o.id}`,
      createdAt: o.updatedAt,
    })),
    ...unlinkedEmails.map((e) => ({
      id: `email-${e.id}`,
      type: "email" as const,
      title: "New unlinked inquiry",
      description: e.subject,
      href: `/emails/${e.id}`,
      createdAt: e.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ notifications });
}
