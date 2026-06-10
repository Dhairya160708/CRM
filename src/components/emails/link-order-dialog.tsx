"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Link2 } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  product: { name: string };
  client: { nameEncrypted: string };
}

interface Thread {
  id: string;
  subject: string;
  order: { id: string; orderNumber: string } | null;
}

interface Props {
  thread: Thread;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkOrderDialog({ thread, onClose, onSuccess }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/orders?${params}`);
        const data = await res.json();
        setOrders(data.orders ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [search]);

  async function linkOrder(orderId: string | null) {
    setLinking(true);
    try {
      const res = await fetch(`/api/emails/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        toast.success(orderId ? "Linked to order" : "Unlinked from order");
        onSuccess();
      } else {
        toast.error("Failed to update link");
      }
    } finally {
      setLinking(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-teal-crm" />
            Link to Order
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Linking: <span className="text-foreground font-medium">{thread.subject}</span>
        </p>

        {thread.order && (
          <div className="p-3 rounded-lg bg-teal-crm/10 border border-teal-crm/20 text-sm">
            Currently linked to{" "}
            <span className="font-mono text-teal-crm">{thread.order.orderNumber}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-xs text-red-400"
              onClick={() => linkOrder(null)}
              disabled={linking}
            >
              Unlink
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                onClick={() => linkOrder(order.id)}
                disabled={linking}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-crm/30 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-teal-crm">{order.orderNumber}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="text-sm text-foreground truncate">{order.product.name}</div>
                  <div className="text-xs text-muted-foreground">{order.client.nameEncrypted}</div>
                </div>
              </button>
            ))
          )}
          {!loading && orders.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No orders found</p>
          )}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
