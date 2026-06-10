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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, X, Star } from "lucide-react";
import { toast } from "sonner";

interface ManufacturerLike {
  id?: string;
  name?: string;
  location?: string;
  contact?: string;
  certifications?: string[];
  reliabilityScore?: number;
  isActive?: boolean;
}

interface Props {
  open: boolean;
  manufacturer?: ManufacturerLike;
  onClose: () => void;
  onSuccess: () => void;
}

const CERT_OPTIONS = [
  "GMP",
  "ISO 9001",
  "ISO 14001",
  "FSSAI",
  "WHO-GMP",
  "EU-GMP",
  "US-FDA",
  "HACCP",
  "REACH",
];

export function ManufacturerFormDialog({
  open,
  manufacturer,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!manufacturer?.id;
  const [loading, setLoading] = useState(false);
  const [certInput, setCertInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    location: "",
    contact: "",
    certifications: [] as string[],
    reliabilityScore: 0,
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: manufacturer?.name ?? "",
        location: manufacturer?.location ?? "",
        contact: manufacturer?.contact ?? "",
        certifications: manufacturer?.certifications ?? [],
        reliabilityScore: manufacturer?.reliabilityScore ?? 0,
        isActive: manufacturer?.isActive ?? true,
      });
      setCertInput("");
    }
  }, [open, manufacturer]);

  function addCert(cert?: string) {
    const c = cert ?? certInput.trim();
    if (c && !form.certifications.includes(c)) {
      setForm({ ...form, certifications: [...form.certifications, c] });
    }
    if (!cert) setCertInput("");
  }

  function removeCert(cert: string) {
    setForm({
      ...form,
      certifications: form.certifications.filter((c) => c !== cert),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.location || !form.contact) {
      toast.error("Name, location, and contact are required");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit
        ? `/api/manufacturers/${manufacturer!.id}`
        : "/api/manufacturers";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          contact: form.contact,
          certifications: form.certifications,
          reliabilityScore: form.reliabilityScore,
          isActive: form.isActive,
        }),
      });
      if (res.ok) {
        toast.success(isEdit ? "Manufacturer updated" : "Manufacturer created");
        onClose();
        onSuccess();
      } else {
        toast.error("Failed to save manufacturer");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="w-4 h-4 text-primary" />
            ) : (
              <Plus className="w-4 h-4 text-primary" />
            )}
            {isEdit ? "Edit Manufacturer" : "New Manufacturer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Manufacturer name"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label>Location (City, State) *</Label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="e.g. Mumbai, Maharashtra"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label>Contact (email or phone) *</Label>
              <Input
                value={form.contact}
                onChange={(e) =>
                  setForm({ ...form, contact: e.target.value })
                }
                placeholder="contact@manufacturer.com"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) =>
                  setForm({ ...form, isActive: v === "active" })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reliability Rating</Label>
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, reliabilityScore: i + 1 })
                    }
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        i < form.reliabilityScore
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground hover:text-amber-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <Label>Certifications</Label>
              <div className="flex gap-2 mt-1.5">
                <Select onValueChange={(v) => addCert(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add from list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CERT_OPTIONS.filter(
                      (c) => !form.certifications.includes(c)
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCert();
                    }
                  }}
                  placeholder="Custom cert..."
                  className="flex-1"
                />
              </div>
              {form.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full"
                    >
                      {cert}
                      <button
                        type="button"
                        onClick={() => removeCert(cert)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
              ) : isEdit ? (
                <Pencil className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isEdit ? "Save Changes" : "Create Manufacturer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
