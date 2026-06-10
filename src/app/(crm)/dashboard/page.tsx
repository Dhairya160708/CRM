import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoWhere } from "@/lib/demo";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  ShoppingCart, Clock, TrendingUp, AlertTriangle,
  Package, ArrowRight, Activity
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const where = demoWhere(session);

  const [
    totalActiveOrders,
    pendingOrders,
    shippedThisMonth,
    recentOrders,
    overdueOrders,
    statusBreakdown,
  ] = await Promise.all([
    prisma.order.count({ where: { ...where, status: { notIn: ["CLOSED", "CANCELLED", "DELIVERED"] } } }),
    prisma.order.count({ where: { ...where, status: "INQUIRY" } }),
    prisma.order.count({
      where: {
        ...where,
        status: "SHIPPED",
        actualShipDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.order.findMany({
      where,
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, orderNumber: true, status: true, quantity: true, unit: true, updatedAt: true,
        client: { select: { nameEncrypted: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        ...where,
        status: { notIn: ["CLOSED", "CANCELLED", "DELIVERED", "SHIPPED"] },
        updatedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: {
        id: true, orderNumber: true,
        client: { select: { nameEncrypted: true } },
        product: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const { decrypt } = await import("@/lib/encryption");

  function safeName(enc: string) {
    try { return decrypt(enc); } catch { return enc; }
  }

  const stats = [
    {
      title: "Active Orders",
      value: totalActiveOrders,
      icon: ShoppingCart,
      color: "text-teal-crm",
      bg: "bg-teal-crm/10",
      href: "/orders",
    },
    {
      title: "Awaiting Response",
      value: pendingOrders,
      icon: Clock,
      color: "text-amber-crm",
      bg: "bg-amber-crm/10",
      href: "/orders?status=INQUIRY",
    },
    {
      title: "Shipped This Month",
      value: shippedThisMonth,
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-400/10",
      href: "/orders?status=SHIPPED",
    },
    {
      title: "Overdue (>48h)",
      value: overdueOrders.length,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-400/10",
      href: "/orders",
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" subtitle="Overview of your trading operations" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-teal-crm/30 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {stat.title}
                    </span>
                    <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${stat.color} font-mono`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-crm" />
                    Recent Orders
                  </CardTitle>
                  <Link href="/orders" className="text-xs text-teal-crm hover:underline flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentOrders.map((order: (typeof recentOrders)[number]) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-teal-crm">{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        <div className="text-sm text-foreground mt-0.5 truncate">
                          {order.product.name} · {order.quantity} {order.unit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {safeName(order.client.nameEncrypted)} · {formatDateTime(order.updatedAt)}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-teal-crm transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                  {recentOrders.length === 0 && (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No orders yet. <Link href="/orders" className="text-teal-crm hover:underline">Create one</Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Status breakdown + Alerts */}
          <div className="space-y-4">
            {/* Status Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-crm" />
                  Pipeline Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statusBreakdown.map((s: (typeof statusBreakdown)[number]) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[s.status]}`}>
                      {ORDER_STATUS_LABELS[s.status]}
                    </span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {s._count.id}
                    </span>
                  </div>
                ))}
                {statusBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Overdue Alerts */}
            {overdueOrders.length > 0 && (
              <Card className="border-amber-crm/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-crm">
                    <AlertTriangle className="w-4 h-4" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overdueOrders.map((order: (typeof overdueOrders)[number]) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block p-2 rounded-lg bg-amber-crm/5 border border-amber-crm/20 hover:border-amber-crm/40 transition-colors"
                    >
                      <div className="font-mono text-xs text-amber-crm">{order.orderNumber}</div>
                      <div className="text-xs text-foreground truncate mt-0.5">{order.product.name}</div>
                      <div className="text-xs text-muted-foreground">{safeName(order.client.nameEncrypted)}</div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
