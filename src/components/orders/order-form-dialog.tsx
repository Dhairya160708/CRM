"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClientOption {
  id: string;
  name: string;
  country: string;
}
interface ProductOption {
  id: string;
  name: string;
  unit: string;
}
interface ManufacturerOption {
  id: string;
  name: string;
  location: string;
}

const UNITS = ["kg", "g", "MT", "L", "mL", "units"];
const INCOTERMS = ["FOB", "CIF", "EXW", "DAP", "DDP", "CFR", "FCA"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export function OrderFormDialog({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);

  const [form, setForm] = useState({
    clientId: "",
    productId: "",
    manufacturerId: "",
    quantity: "",
    unit: "kg",
    specs: "",
    targetPrice: "",
    currency: "USD",
    incoterms: "",
    deliveryCountry: "",
    priority: "NORMAL",
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/clients").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/products").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/manufacturers").then((r) => (r.ok ? r.json() : [])),
    ]).then(([c, p, m]) => {
      setClients(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setManufacturers(Array.isArray(m) ? m : []);
    });
  }, [open]);

  function reset() {
    setForm({
      clientId: "",
      productId: "",
      manufacturerId: "",
      quantity: "",
      unit: "kg",
      specs: "",
      targetPrice: "",
      currency: "USD",
      incoterms: "",
      deliveryCountry: "",
      priority: "NORMAL",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.productId || !form.quantity) {
      toast.error("Client, product, and quantity are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          productId: form.productId,
          manufacturerId: form.manufacturerId || undefined,
          quantity: parseFloat(form.quantity),
          unit: form.unit,
          specs: form.specs || undefined,
          targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : undefined,
          currency: form.currency,
          incoterms: form.incoterms || undefined,
          deliveryCountry: form.deliveryCountry || undefined,
          priority: form.priority,
        }),
      });
      if (res.ok) {
        toast.success("Order created successfully");
        reset();
        onClose();
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create order");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            New Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm({ ...form, clientId: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Product *</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => {
                  const p = products.find((p) => p.id === v);
                  setForm({ ...form, productId: v, unit: p?.unit ?? "kg" });
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="e.g. 500"
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
                placeholder="e.g. 25.00"
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

            <div className="col-span-2">
              <Label>Specs / Grade / Purity</Label>
              <Textarea
                value={form.specs}
                onChange={(e) => setForm({ ...form, specs: e.target.value })}
                placeholder="e.g. USP grade, 99.5% purity"
                rows={2}
                className="mt-1.5"
              />
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

            <div>
              <Label>Delivery Country</Label>
              <Input
                value={form.deliveryCountry}
                onChange={(e) =>
                  setForm({ ...form, deliveryCountry: e.target.value })
                }
                placeholder="e.g. Germany"
                className="mt-1.5"
              />
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
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Manufacturer (optional)</Label>
              <Select
                value={form.manufacturerId}
                onValueChange={(v) =>
                  setForm({ ...form, manufacturerId: v })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="None selected" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
