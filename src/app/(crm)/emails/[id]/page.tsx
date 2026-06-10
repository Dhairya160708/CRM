"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import { Loader2, ArrowLeft, Sparkles, Link2, Mail, User, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { LinkOrderDialog } from "@/components/emails/link-order-dialog";

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  isInbound: boolean;
  aiExtracted: Record<string, unknown> | null;
}

interface EmailThread {
  id: string;
  subject: string;
  aiSummary: string | null;
  gmailThreadId: string | null;
  updatedAt: string;
  client: { id: string; nameEncrypted: string; country: string } | null;
  order: { id: string; orderNumber: string; status: string; product: { name: string } } | null;
  messages: EmailMessage[];
}

export default function EmailThreadPage() {
  const { data: session } = useSession();
  const isDemo = !!session?.user?.isDemo;
  const { id } = useParams<{ id: string }>();
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [showLink, setShowLink] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails/${id}`);
      if (res.ok) setThread(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleParse() {
    setParsing(true);
    try {
      const res = await fetch("/api/emails/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: id }),
      });
      if (res.ok) {
        toast.success("AI parsing complete");
        load();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "AI parsing failed");
      }
    } finally {
      setParsing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Email Thread" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col flex-1">
        <Header title="Email Thread" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Thread not found.
        </div>
      </div>
    );
  }

  const aiData = thread.messages[0]?.aiExtracted;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={thread.subject}
        subtitle={`${thread.messages.length} messages`}
      />
      <main className="flex-1 p-6">
        <div className="mb-4">
          <Link href="/emails">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              Back to Inbox
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2 space-y-4">
            {thread.messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-xl p-4 ${
                  msg.isInbound
                    ? "bg-card border-border"
                    : "bg-teal-crm/5 border-teal-crm/20"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {msg.from}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      To: {msg.to} · {formatDateTime(msg.sentAt)}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${msg.isInbound ? "text-muted-foreground" : "text-teal-crm border-teal-crm/30"}`}
                  >
                    {msg.isInbound ? "Inbound" : "Outbound"}
                  </Badge>
                </div>
                <Separator className="mb-3" />
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {msg.body}
                </pre>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isDemo ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button className="w-full cursor-not-allowed opacity-60" variant="outline" size="sm" disabled>
                          <Sparkles className="w-3.5 h-3.5 mr-2 text-teal-crm" />
                          Parse with AI
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>This feature is currently unavailable for demo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={handleParse}
                    disabled={parsing}
                  >
                    {parsing ? (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-2 text-teal-crm" />
                    )}
                    Parse with AI
                  </Button>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLink(true)}
                >
                  <Link2 className="w-3.5 h-3.5 mr-2" />
                  {thread.order ? "Re-link Order" : "Link to Order"}
                </Button>
              </CardContent>
            </Card>

            {/* Linked Order */}
            {thread.order && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-teal-crm" />
                    Linked Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/orders/${thread.order.id}`}
                    className="block p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="font-mono text-xs text-teal-crm">{thread.order.orderNumber}</div>
                    <div className="text-sm text-foreground mt-0.5">{thread.order.product.name}</div>
                    <span
                      className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[thread.order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[thread.order.status]}
                    </span>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            {thread.aiSummary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-crm" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">{thread.aiSummary}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Extracted Data */}
            {aiData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-crm" />
                    Extracted Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(aiData)
                    .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-foreground font-medium ml-2 text-right">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Client */}
            {thread.client && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-teal-crm" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/clients/${thread.client.id}`}
                    className="text-sm text-foreground hover:text-teal-crm"
                  >
                    {thread.client.nameEncrypted}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{thread.client.country}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {showLink && (
        <LinkOrderDialog
          thread={thread}
          onClose={() => setShowLink(false)}
          onSuccess={() => { setShowLink(false); load(); }}
        />
      )}
    </div>
  );
}
