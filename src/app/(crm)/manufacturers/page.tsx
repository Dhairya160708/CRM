"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Trash2, Loader2, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ManufacturerFormDialog } from "@/components/manufacturers/manufacturer-form-dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

interface Manufacturer {
  id: string;
  name: string;
  location: string;
  certifications: string[];
  reliabilityScore: number;
  isActive: boolean;
  _count: { orders: number };
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manufacturers");
      if (res.ok) setManufacturers(await res.json());
      else if (res.status === 403) toast.error("Access denied — Manager or Admin required");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchManufacturers(); }, [fetchManufacturers]);

  async function handleDelete(m: Manufacturer) {
    const res = await fetch(`/api/manufacturers/${m.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Manufacturer deleted"); fetchManufacturers(); }
    else toast.error("Failed to delete — Admin required");
    setDeleteTarget(null);
  }

  const filtered = manufacturers.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1">
      <Header title="Manufacturers" subtitle={`${manufacturers.length} manufacturers`} />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search manufacturers..." className="pl-9" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="sm:ml-auto">
            <Plus className="w-4 h-4 mr-2" />New Manufacturer
          </Button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Name", "Location", "Certifications", "Orders", "Rating", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">No manufacturers found.</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/manufacturers/${m.id}`} className="font-medium text-foreground hover:text-teal-crm transition-colors">{m.name}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{m.location}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.certifications.slice(0, 3).map((c) => (
                          <span key={c} className="text-xs px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium">{m._count.orders}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < m.reliabilityScore ? "text-amber-crm fill-amber-crm" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${m.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/manufacturers/${m.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m)}>
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
      </main>

      <ManufacturerFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchManufacturers} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Manufacturer"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
