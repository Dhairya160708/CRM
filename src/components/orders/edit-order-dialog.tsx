"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

interface OrderLike {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  quantity: number;
  unit: string;
  specs: string | null;
  targetPrice: number | null;
  confirmedPrice: number | null;
  currency: string;
  incoterms: string | null;
  deliveryCountry: string | null;
  expectedShipDate: string | null;
  actualShipDate: string | null;
}

interface Props {
  order: OrderLike;
  onClose: () => void;
  onSuccess: () => void;
}

const UNITS = ["kg", "g", "MT", "L", "mL", "units"];
const INCOTERMS = ["FOB", "CIF", "EXW", "DAP", "DDP", "CFR", "FCA"];

export function EditOrderDialog({ order, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    status: order.status,
    priority: order.priority,
    quantity: String(order.quantity),
    unit: order.unit,
    specs: order.specs ?? "",
    targetPrice: order.targetPrice ? String(order.targetPrice) : "",
    confirmedPrice: order.confirmedPrice ? String(order.confirmedPrice) : "",
    currency: order.currency,
    incoterms: order.incoterms ?? "",
    deliveryCountry: order.deliveryCountry ?? "",
    expectedShipDate: order.expectedShipDate
      ? order.expectedShipDate.split("T")[0]
      : "",
    actualShipDate: order.actualShipDate
      ? order.actualShipDate.split("T")[0]
      : "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          priority: form.priority,
          quantity: parseFloat(form.quantity),
          unit: form.unit,
          specs: form.specs || undefined,
          targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : null,
          confirmedPrice: form.confirmedPrice
            ? parseFloat(form.confirmedPrice)
            : null,
          currency: form.currency,
          incoterms: form.incoterms || undefined,
          deliveryCountry: form.deliveryCountry || undefined,
          expectedShipDate: form.expectedShipDate || null,
          actualShipDate: form.actualShipDate || null,
        }),
      });
      if (res.ok) {
        toast.success("Order updated");
        onClose();
        onSuccess();
      } else {
        toast.error("Failed to update order");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Edit Order {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Price (per unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.targetPrice}
                onChange={(e) =>
                  setForm({ ...form, targetPrice: e.target.value })
                }
                placeholder="Per unit"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Confirmed Price (per unit)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.confirmedPrice}
                onChange={(e) =>
                  setForm({ ...form, confirmedPrice: e.target.value })
                }
                placeholder="Per unit"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "INR"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Incoterms</Label>
              <Select
                value={form.incoterms}
                onValueChange={(v) => setForm({ ...form, incoterms: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {INCOTERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Specs / Grade / Purity</Label>
              <Textarea
                value={form.specs}
                onChange={(e) => setForm({ ...form, specs: e.target.value })}
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Delivery Country</Label>
              <Input
                value={form.deliveryCountry}
                onChange={(e) =>
                  setForm({ ...form, deliveryCountry: e.target.value })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Expected Ship Date</Label>
              <Input
                type="date"
                value={form.expectedShipDate}
                onChange={(e) =>
                  setForm({ ...form, expectedShipDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Actual Ship Date</Label>
              <Input
                type="date"
                value={form.actualShipDate}
                onChange={(e) =>
                  setForm({ ...form, actualShipDate: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
