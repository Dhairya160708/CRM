"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Globe, Mail, Phone, Plus, Loader2, Pencil, Trash2, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";

interface Client {
  id: string;
  name: string;
  company: string | null;
  country: string;
  language: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  orders: Array<{ id: string; orderNumber: string; status: string; product: { name: string }; quantity: number; unit: string; confirmedPrice: number | null; currency: string; createdAt: string }>;
  notes: Array<{ id: string; content: string; createdAt: string; author: { name: string } }>;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  async function loadClient() {
    const res = await fetch(`/api/clients/${id}`);
    if (res.ok) setClient(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadClient(); }, [id]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, clientId: id }),
    });
    if (res.ok) { toast.success("Note added"); setNoteText(""); loadClient(); }
    else toast.error("Failed to add note");
    setAddingNote(false);
  }

  if (loading) return (
    <div className="flex flex-col flex-1">
      <Header title="Client" />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!client) return (
    <div className="flex flex-col flex-1">
      <Header title="Client Not Found" />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Link href="/clients" className="text-primary hover:underline">Back to clients</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1">
      <Header title={client.name} subtitle={client.company ?? client.country} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/clients"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${client.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                    {client.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {[
                  { label: "Country", value: client.country, icon: Globe },
                  { label: "Email", value: client.email, icon: Mail },
                  { label: "Phone", value: client.phone ?? "—", icon: Phone },
                  { label: "Language", value: client.language ?? "—", icon: null },
                  { label: "Client Since", value: formatDate(client.createdAt), icon: null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-sm text-foreground mt-0.5">{value}</div>
                  </div>
                ))}
                {client.tags.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">Orders ({client.orders.length})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({client.notes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        {["Order #", "Product", "Qty", "Price", "Status", "Date"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {client.orders.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No orders yet.</td></tr>
                      ) : (
                        client.orders.map((order) => (
                          <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/orders/${order.id}`} className="font-mono text-xs text-primary hover:underline">{order.orderNumber}</Link>
                            </td>
                            <td className="px-4 py-3 text-sm truncate max-w-[160px]">{order.product.name}</td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{order.quantity} {order.unit}</td>
                            <td className="px-4 py-3 text-xs font-mono">{order.confirmedPrice ? formatCurrency(order.confirmedPrice, order.currency) : "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(order.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4 space-y-3">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." rows={3} />
                    <Button size="sm" onClick={addNote} disabled={addingNote || !noteText.trim()}>
                      {addingNote ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                      Add Note
                    </Button>
                  </CardContent>
                </Card>
                {client.notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      <p className="text-sm text-foreground">{note.content}</p>
                      <div className="text-xs text-muted-foreground mt-2">{note.author.name} · {formatDateTime(note.createdAt)}</div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      {showEdit && <ClientFormDialog open={showEdit} client={client} onClose={() => setShowEdit(false)} onSuccess={loadClient} />}
    </div>
  );
}
