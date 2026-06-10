"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Globe, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

interface Client {
  id: string;
  name: string;
  company: string | null;
  country: string;
  language: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
      else if (res.status === 403) toast.error("Access denied — Manager or Admin required");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDelete(client: Client) {
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Client deleted"); fetchClients(); }
    else toast.error("Failed to delete — Admin required");
    setDeleteTarget(null);
  }

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1">
      <Header title="Clients" subtitle={`${clients.length} clients`} />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="sm:ml-auto">
            <Plus className="w-4 h-4 mr-2" /> New Client
          </Button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Name", "Company", "Country", "Language", "Tags", "Orders", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">No clients found.</td></tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-teal-crm transition-colors">{client.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{client.company ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3" />{client.country}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{client.language ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{tag}</span>
                        ))}
                        {client.tags.length > 2 && <span className="text-xs text-muted-foreground">+{client.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{client._count.orders}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${client.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/clients/${client.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(client)}>
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

      <ClientFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchClients} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Client"
        description={`Delete client "${deleteTarget?.name}"? All associated data will be removed.`}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
