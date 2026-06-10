"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PRIORITY_COLORS } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Package,
  FileText, MessageSquare, Activity, Plus, Loader2,
  Building2, User, Pencil, Trash2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { EditOrderDialog } from "@/components/orders/edit-order-dialog";

const STATUS_FLOW = [
  "INQUIRY","SOURCING","QUOTED","NEGOTIATING","CONFIRMED",
  "IN_PRODUCTION","SHIPPED","DELIVERED","CLOSED"
];

interface Order {
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
  createdAt: string;
  updatedAt: string;
  expectedShipDate: string | null;
  actualShipDate: string | null;
  client: { id: string; name: string; nameEncrypted: string; country: string; company: string | null };
  manufacturer: { id: string; name: string; nameEncrypted: string; location: string } | null;
  product: { id: string; name: string; casNumber: string | null; unit: string };
  notes: Array<{ id: string; content: string; createdAt: string; author: { name: string } }>;
  statusHistory: Array<{ id: string; from: string; to: string; changedAt: string; changedBy: string; note: string | null }>;
  documents: Array<{ id: string; name: string; type: string; url: string }>;
  emailThreads: Array<{ id: string; subject: string; aiSummary: string | null; messages: Array<{ id: string; from: string; body: string; sentAt: string; isInbound: boolean }> }>;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadOrder() {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) setOrder(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadOrder(); }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
      loadOrder();
    } else {
      toast.error("Failed to update status");
    }
    setUpdatingStatus(false);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText, orderId: id }),
    });
    if (res.ok) {
      toast.success("Note added");
      setNoteText("");
      loadOrder();
    } else {
      toast.error("Failed to add note");
    }
    setAddingNote(false);
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/notes?id=${noteId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Note deleted"); loadOrder(); }
    else toast.error("Failed to delete note");
  }

  async function handleDeleteOrder() {
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Order deleted");
      router.push("/orders");
    } else {
      toast.error("Failed to delete order — admin required");
    }
    setShowDelete(false);
  }

  if (loading) return (
    <div className="flex flex-col flex-1">
      <Header title="Order Detail" />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col flex-1">
      <Header title="Order Not Found" />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Order not found. <Link href="/orders" className="text-primary hover:underline">Back to orders</Link></p>
      </div>
    </div>
  );

  const currentStatusIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="flex flex-col flex-1">
      <Header title={order.orderNumber} subtitle={`${order.product.name} · ${order.quantity} ${order.unit}`} />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDelete(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Order Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {STATUS_FLOW.map((status, i) => {
                const isDone = i < currentStatusIndex;
                const isCurrent = i === currentStatusIndex;
                const isNext = i === currentStatusIndex + 1;
                return (
                  <div key={status} className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => isNext ? updateStatus(status) : undefined}
                      disabled={updatingStatus || (!isNext && !isCurrent)}
                      className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                        isNext ? "cursor-pointer hover:bg-teal-crm/10" : "cursor-default"
                      } ${isCurrent || isDone ? "" : "opacity-50"}`}
                      title={isNext ? `Advance to ${ORDER_STATUS_LABELS[status]}` : undefined}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-crm" />
                      ) : isCurrent ? (
                        <Clock className="w-5 h-5 text-amber-crm" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className={`text-xs font-medium whitespace-nowrap ${isCurrent ? "text-amber-crm" : isDone ? "text-teal-crm" : "text-muted-foreground"}`}>
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                    </button>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`w-6 h-px mx-1 ${i < currentStatusIndex ? "bg-teal-crm" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {order.status === "CANCELLED" && (
              <p className="text-xs text-red-400 mt-2">This order has been cancelled.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main detail */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="emails">Emails ({order.emailThreads.length})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({order.notes.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Product", value: order.product.name },
                      { label: "CAS Number", value: order.product.casNumber ?? "—" },
                      { label: "Quantity", value: `${order.quantity} ${order.unit}` },
                      { label: "Specs/Grade", value: order.specs ?? "—" },
                      { label: "Target Price", value: order.targetPrice ? formatCurrency(order.targetPrice, order.currency) : "—" },
                      { label: "Confirmed Price", value: order.confirmedPrice ? formatCurrency(order.confirmedPrice, order.currency) : "—" },
                      { label: "Incoterms", value: order.incoterms ?? "—" },
                      { label: "Delivery Country", value: order.deliveryCountry ?? "—" },
                      { label: "Expected Ship", value: formatDate(order.expectedShipDate) },
                      { label: "Actual Ship", value: formatDate(order.actualShipDate) },
                      { label: "Priority", value: <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[order.priority]}`}>{order.priority}</span> },
                      { label: "Created", value: formatDate(order.createdAt) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-xs text-muted-foreground font-medium mb-0.5">{label}</div>
                        <div className="text-sm text-foreground">{value}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emails" className="mt-4 space-y-3">
                {order.emailThreads.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No email threads linked to this order.</CardContent></Card>
                ) : (
                  order.emailThreads.map((thread) => (
                    <Card key={thread.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{thread.subject}</CardTitle>
                        {thread.aiSummary && <p className="text-xs text-muted-foreground">{thread.aiSummary}</p>}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {thread.messages.map((msg) => (
                          <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.isInbound ? "bg-secondary" : "bg-teal-crm/5 border border-teal-crm/20"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">{msg.from}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(msg.sentAt)}</span>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">{msg.body.slice(0, 500)}{msg.body.length > 500 ? "…" : ""}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-4 space-y-3">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add an internal note..."
                      rows={3}
                    />
                    <Button onClick={addNote} disabled={addingNote || !noteText.trim()} size="sm">
                      {addingNote ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                      Add Note
                    </Button>
                  </CardContent>
                </Card>
                {order.notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground flex-1">{note.content}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {note.author.name} · {formatDateTime(note.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {order.statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3">
                        <Activity className="w-4 h-4 text-teal-crm mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-foreground">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ORDER_STATUS_COLORS[h.from]}`}>{ORDER_STATUS_LABELS[h.from]}</span>
                            {" → "}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ORDER_STATUS_COLORS[h.to]}`}>{ORDER_STATUS_LABELS[h.to]}</span>
                          </div>
                          {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                          <div className="text-xs text-muted-foreground">{h.changedBy} · {formatDateTime(h.changedAt)}</div>
                        </div>
                      </div>
                    ))}
                    {order.statusHistory.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No status changes yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Client card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-crm" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/clients/${order.client.id}`} className="group">
                  <div className="text-sm font-medium text-foreground group-hover:text-teal-crm transition-colors">
                    {order.client.name}
                  </div>
                  {order.client.company && <div className="text-xs text-muted-foreground">{order.client.company}</div>}
                  <div className="text-xs text-muted-foreground">{order.client.country}</div>
                </Link>
              </CardContent>
            </Card>

            {/* Manufacturer card */}
            {order.manufacturer && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-crm" />
                    Manufacturer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/manufacturers/${order.manufacturer.id}`} className="group">
                    <div className="text-sm font-medium text-foreground group-hover:text-teal-crm transition-colors">
                      {order.manufacturer.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{order.manufacturer.location}</div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Quick status update */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={order.status} onValueChange={updateStatus} disabled={updatingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <DeleteConfirmDialog
        open={showDelete}
        title="Delete Order"
        description={`Permanently delete order ${order.orderNumber}? This cannot be undone.`}
        onConfirm={handleDeleteOrder}
        onCancel={() => setShowDelete(false)}
      />
      {showEdit && <EditOrderDialog order={order} onClose={() => setShowEdit(false)} onSuccess={loadOrder} />}
    </div>
  );
}
