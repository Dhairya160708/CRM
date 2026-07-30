"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PRIORITY_COLORS, formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Filter, Eye, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  quantity: number;
  unit: string;
  targetPrice: number | null;
  confirmedPrice: number | null;
  currency: string;
  deliveryCountry: string | null;
  updatedAt: string;
  createdAt: string;
  client: { id: string; name: string; nameEncrypted: string; country: string };
  product: { id: string; name: string };
  manufacturer: { id: string; name: string; nameEncrypted: string } | null;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "INQUIRY", label: "Inquiry" },
  { value: "SOURCING", label: "Sourcing" },
  { value: "QUOTED", label: "Quoted" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface OrdersTableProps {
  initialOrders: Order[];
  initialTotal: number;
  initialSearch: string;
  initialStatus: string;
}

export function OrdersTable({ initialOrders, initialTotal, initialSearch, initialStatus }: OrdersTableProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const search = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const isFirstRun = useRef(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchOrders();
  }, [fetchOrders]);

  async function handleDelete(order: Order) {
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Order ${order.orderNumber} deleted`);
      fetchOrders();
    } else {
      toast.error("Failed to delete order");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Orders" subtitle={`${total} total orders`} />
      <main className="flex-1 p-4 md:p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search orders, products..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)} className="sm:ml-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["Order #", "Client", "Product", "Qty", "Price", "Status", "Priority", "Last Activity", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No orders found.{" "}
                      <button onClick={() => setShowCreateDialog(true)} className="text-primary hover:underline">Create one</button>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`} className="font-mono text-xs text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-[140px] truncate">
                        {order.client.name}
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-[160px] truncate">{order.product.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {order.quantity} {order.unit}
                      </td>
                      <td className="px-4 py-3 text-foreground font-mono text-xs whitespace-nowrap">
                        {order.confirmedPrice
                          ? formatCurrency(order.confirmedPrice, order.currency)
                          : order.targetPrice
                          ? formatCurrency(order.targetPrice, order.currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[order.priority]}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(order)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <OrderFormDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onSuccess={fetchOrders} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Order"
        description={`Delete order ${deleteTarget?.orderNumber}? This action cannot be undone.`}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
