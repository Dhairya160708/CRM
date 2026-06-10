import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { logAudit, AuditActions } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAudit({
    userId: session.user.id,
    action: AuditActions.VIEW_REPORTS,
    entity: "Report",
  });

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    ordersByStatus,
    ordersByMonth,
    topClients,
    topManufacturers,
    avgShipTime,
    totalRevenue,
    recentActivity,
  ] = await Promise.all([
    // Orders by status
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Orders + revenue by month (last 12 months)
    prisma.order.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: {
        createdAt: true,
        confirmedPrice: true,
        currency: true,
        status: true,
      },
    }),

    // Top clients by order count
    prisma.order.groupBy({
      by: ["clientId"],
      _count: { id: true },
      _sum: { confirmedPrice: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),

    // Top manufacturers
    prisma.order.groupBy({
      by: ["manufacturerId"],
      _count: { id: true },
      where: { manufacturerId: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),

    // Average days from order to ship
    prisma.order.findMany({
      where: {
        status: { in: ["SHIPPED", "DELIVERED", "CLOSED"] },
        actualShipDate: { not: null },
      },
      select: { createdAt: true, actualShipDate: true },
    }),

    // Total confirmed revenue
    prisma.order.aggregate({
      _sum: { confirmedPrice: true },
      where: {
        status: { in: ["CONFIRMED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CLOSED"] },
      },
    }),

    // Recent audit activity
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  // Resolve client and manufacturer names
  const clientIds = topClients.map((c: { clientId: string }) => c.clientId);
  const mfgIds = topManufacturers.map((m: { manufacturerId: string | null }) => m.manufacturerId).filter(Boolean) as string[];

  const [clients, manufacturers] = await Promise.all([
    prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, nameEncrypted: true, country: true } }),
    prisma.manufacturer.findMany({ where: { id: { in: mfgIds } }, select: { id: true, nameEncrypted: true, location: true } }),
  ]);

  const clientMap = Object.fromEntries(clients.map((c: { id: string; nameEncrypted: string; country: string }) => [c.id, c]));
  const mfgMap = Object.fromEntries(manufacturers.map((m: { id: string; nameEncrypted: string; location: string }) => [m.id, m]));

  // Build monthly buckets
  const monthMap: Record<string, { month: string; orders: number; revenue: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    monthMap[key] = { month: label, orders: 0, revenue: 0 };
  }

  for (const order of ordersByMonth as { createdAt: Date; confirmedPrice: number | null }[]) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[key]) {
      monthMap[key].orders++;
      if (order.confirmedPrice) monthMap[key].revenue += order.confirmedPrice;
    }
  }

  // Average ship time
  let totalDays = 0;
  let shippedCount = 0;
  for (const o of avgShipTime as { createdAt: Date; actualShipDate: Date | null }[]) {
    if (o.actualShipDate) {
      const days = (o.actualShipDate.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      totalDays += days;
      shippedCount++;
    }
  }

  return NextResponse.json({
    ordersByStatus,
    monthlyTrend: Object.values(monthMap),
    topClients: topClients.map((c: typeof topClients[number]) => {
      const raw = clientMap[c.clientId] ?? null;
      return {
        ...c,
        client: raw ? { ...raw, name: decrypt(raw.nameEncrypted) } : null,
      };
    }),
    topManufacturers: topManufacturers.map((m: typeof topManufacturers[number]) => {
      const raw = m.manufacturerId ? mfgMap[m.manufacturerId] ?? null : null;
      return {
        ...m,
        manufacturer: raw ? { ...raw, name: decrypt(raw.nameEncrypted) } : null,
      };
    }),
    avgShipDays: shippedCount > 0 ? Math.round(totalDays / shippedCount) : null,
    totalRevenue: totalRevenue._sum.confirmedPrice ?? 0,
    recentActivity,
  });
}
