"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Package, Users, Factory, Clock, DollarSign,
  Loader2, Download,
} from "lucide-react";
import { toast } from "sonner";

interface ReportData {
  ordersByStatus: { status: string; _count: { id: number } }[];
  monthlyTrend: { month: string; orders: number; revenue: number }[];
  topClients: {
    clientId: string;
    _count: { id: number };
    _sum: { confirmedPrice: number | null };
    client: { id: string; name: string; nameEncrypted: string; country: string } | null;
  }[];
  topManufacturers: {
    manufacturerId: string | null;
    _count: { id: number };
    manufacturer: { id: string; name: string; nameEncrypted: string; location: string } | null;
  }[];
  avgShipDays: number | null;
  totalRevenue: number;
  recentActivity: {
    id: string;
    action: string;
    entity: string | null;
    createdAt: string;
    user: { name: string; email: string };
  }[];
}

const PIE_COLORS = ["#00B4D8", "#F59E0B", "#6366F1", "#10B981", "#F43F5E", "#8B5CF6", "#EC4899", "#14B8A6", "#94A3B8", "#EF4444"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/reports");
        if (res.ok) setData(await res.json());
        else if (res.status === 403) toast.error("Admin access required");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export");
      if (!res.ok) { toast.error("Export failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medtrade-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Reports" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Reports" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Reports are restricted to Admin users.
        </div>
      </div>
    );
  }

  const pieData = data.ordersByStatus.map((s) => ({
    name: ORDER_STATUS_LABELS[s.status] ?? s.status,
    value: s._count.id,
    status: s.status,
  }));

  return (
    <div className="flex flex-col flex-1">
      <Header title="Reports" subtitle="Business analytics and insights" />
      <main className="flex-1 p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-teal-crm" />
              </div>
              <div className="text-2xl font-bold font-mono text-teal-crm">
                {formatCurrency(data.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Orders</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {data.ordersByStatus.reduce((s, o) => s + o._count.id, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Avg Ship Days</span>
                <Clock className="w-4 h-4 text-amber-crm" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-crm">
                {data.avgShipDays != null ? `${data.avgShipDays}d` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Clients</span>
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-green-400">
                {data.topClients.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-crm" />
                Orders by Month (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f1e30", border: "1px solid #1e3a5f", borderRadius: 8 }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#00B4D8" }}
                  />
                  <Bar dataKey="orders" fill="#00B4D8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orders by Status Pie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-crm" />
                Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0f1e30", border: "1px solid #1e3a5f", borderRadius: 8 }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-crm" />
              Revenue by Month (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#0f1e30", border: "1px solid #1e3a5f", borderRadius: 8 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="revenue" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clients & Manufacturers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-crm" />
                Top Clients by Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {data.topClients.map((c, i) => (
                    <div key={c.clientId} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">
                          {c.client?.name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.client?.country} · {c._sum.confirmedPrice ? formatCurrency(c._sum.confirmedPrice) : "—"}
                        </div>
                      </div>
                      <span className="text-sm font-mono font-semibold text-teal-crm">
                        {c._count.id} orders
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Factory className="w-4 h-4 text-teal-crm" />
                Top Manufacturers by Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topManufacturers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {data.topManufacturers.map((m, i) => (
                    <div key={m.manufacturerId ?? i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">
                          {m.manufacturer?.name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.manufacturer?.location}</div>
                      </div>
                      <span className="text-sm font-mono font-semibold text-teal-crm">
                        {m._count.id} orders
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV Report
          </Button>
        </div>
      </main>
    </div>
  );
}
