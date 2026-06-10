"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatDateTime, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  Search, Mail, MailOpen, Link2, Plus, RefreshCw, Loader2,
  Sparkles, ExternalLink, Filter, CloudDownload, Wifi, WifiOff, Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { NewThreadDialog } from "@/components/emails/new-thread-dialog";
import { LinkOrderDialog } from "@/components/emails/link-order-dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

interface EmailThread {
  id: string;
  subject: string;
  gmailThreadId: string | null;
  aiSummary: string | null;
  updatedAt: string;
  createdAt: string;
  client: { id: string; nameEncrypted: string; country: string } | null;
  order: { id: string; orderNumber: string; status: string } | null;
  messages: { from: string; sentAt: string; body: string }[];
  _count: { messages: number };
}

export default function EmailsPage() {
  const { data: session } = useSession();
  const isDemo = !!session?.user?.isDemo;
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [linkTarget, setLinkTarget] = useState<EmailThread | null>(null);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailThread | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (unlinkedOnly) params.set("unlinked", "true");
      const res = await fetch(`/api/emails?${params}`);
      const data = await res.json();
      setThreads(data.threads ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, unlinkedOnly]);

  const checkGmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/oauth/status");
      if (res.ok) {
        const data = await res.json() as { connected: boolean; expired: boolean };
        setGmailConnected(data.connected && !data.expired);
      }
    } catch {
      setGmailConnected(false);
    }
  }, []);

  useEffect(() => {
    void fetchThreads();
    void checkGmailStatus();
  }, [fetchThreads, checkGmailStatus]);

  async function syncGmail(fullSync = false) {
    if (fullSync) setFullSyncing(true);
    else setSyncing(true);
    try {
      const res = await fetch("/api/emails/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullSync ? { fullSync: true } : {}),
      });
      const data = await res.json() as { synced?: number; skipped?: number; filtered?: number; error?: string };
      if (res.ok) {
        const { synced = 0, filtered = 0 } = data;
        setLastSyncAt(new Date());
        if (synced === 0 && filtered === 0) {
          toast.info(fullSync ? "Full sync complete — inbox is up to date" : "Inbox is up to date");
        } else {
          toast.success(
            `${fullSync ? "Full sync: " : ""}${synced} new thread${synced !== 1 ? "s" : ""} imported` +
            (filtered > 0 ? ` · ${filtered} non-business filtered` : "")
          );
        }
        void fetchThreads();
      } else {
        toast.error(data.error ?? "Sync failed");
        if (res.status === 400 && data.error?.includes("not connected")) {
          setGmailConnected(false);
        }
      }
    } finally {
      setSyncing(false);
      setFullSyncing(false);
    }
  }

  async function deleteThread(thread: EmailThread) {
    const res = await fetch(`/api/emails/${thread.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Email thread deleted");
      void fetchThreads();
    } else {
      toast.error("Failed to delete — Manager or Admin required");
    }
    setDeleteTarget(null);
  }

  async function parseWithAI(thread: EmailThread) {
    setParsingId(thread.id);
    try {
      const res = await fetch("/api/emails/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });
      if (res.ok) {
        toast.success("AI parsing complete");
        void fetchThreads();
      } else {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "AI parsing failed");
      }
    } finally {
      setParsingId(null);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Email Inbox" subtitle={`${total} threads`} />
      <main className="flex-1 p-4 md:p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, summary..."
              className="pl-9"
            />
          </div>
          <Button
            variant={unlinkedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnlinkedOnly(!unlinkedOnly)}
          >
            <Filter className="w-3.5 h-3.5 mr-2" />
            Unlinked Only
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {/* Gmail connection status + sync */}
            {gmailConnected === null ? null : gmailConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void syncGmail(false)}
                  disabled={syncing || fullSyncing}
                  className="text-teal-crm border-teal-crm/40 hover:bg-teal-crm/10"
                >
                  {syncing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <CloudDownload className="w-3.5 h-3.5 mr-2" />
                  )}
                  {syncing ? "Syncing…" : "Sync"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void syncGmail(true)}
                  disabled={syncing || fullSyncing}
                  title="Scan entire inbox history"
                >
                  {fullSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  )}
                  {fullSyncing ? "Scanning…" : "Full Scan"}
                </Button>
              </>
            ) : isDemo ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="text-amber-crm border-amber-crm/40 cursor-not-allowed opacity-60" disabled>
                      <WifiOff className="w-3.5 h-3.5 mr-2" />
                      Connect Gmail
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>This feature is currently unavailable for demo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Link href="/api/emails/oauth">
                <Button variant="outline" size="sm" className="text-amber-crm border-amber-crm/40 hover:bg-amber-crm/10">
                  <WifiOff className="w-3.5 h-3.5 mr-2" />
                  Connect Gmail
                </Button>
              </Link>
            )}

            <Button variant="outline" size="sm" onClick={fetchThreads}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add Thread
            </Button>
          </div>
        </div>

        {/* Gmail not connected notice */}
        {gmailConnected === false && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-crm/30 bg-amber-crm/5 px-4 py-3 text-sm text-amber-crm">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>
              Gmail not connected. Click <strong>Connect Gmail</strong> to link your account and start syncing real emails.
              You can also configure OAuth credentials in{" "}
              <Link href="/settings" className="underline underline-offset-2">Settings</Link>.
            </span>
          </div>
        )}

        {gmailConnected && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi className="w-3.5 h-3.5 text-teal-crm" />
            <span>Gmail connected · AI filters non-business emails · auto-syncs daily</span>
            {lastSyncAt && (
              <span className="ml-auto">Last sync: {lastSyncAt.toLocaleTimeString()}</span>
            )}
          </div>
        )}

        {/* Thread list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mail className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No email threads found.{" "}
                {gmailConnected ? (
                  <button onClick={() => void syncGmail(true)} className="text-primary hover:underline">
                    Run full inbox scan
                  </button>
                ) : (
                  <button onClick={() => setShowNew(true)} className="text-primary hover:underline">
                    Add one manually
                  </button>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                onLink={() => setLinkTarget(thread)}
                onParse={() => void parseWithAI(thread)}
                isParsing={parsingId === thread.id}
                onRefresh={fetchThreads}
                onDelete={() => setDeleteTarget(thread)}
                isDemo={isDemo}
              />
            ))}
          </div>
        )}
      </main>

      <NewThreadDialog open={showNew} onClose={() => setShowNew(false)} onSuccess={fetchThreads} />
      {linkTarget && (
        <LinkOrderDialog
          thread={linkTarget}
          onClose={() => setLinkTarget(null)}
          onSuccess={fetchThreads}
        />
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Email Thread"
        description={`Delete "${deleteTarget?.subject}"? This removes the thread and all its messages from the CRM. The original email in Gmail is not affected.`}
        onConfirm={() => { if (deleteTarget) void deleteThread(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ThreadRow({
  thread,
  onLink,
  onParse,
  isParsing,
  onRefresh: _onRefresh,
  onDelete,
  isDemo,
}: {
  thread: EmailThread;
  onLink: () => void;
  onParse: () => void;
  isParsing: boolean;
  onRefresh: () => void;
  onDelete: () => void;
  isDemo: boolean;
}) {
  const firstMsg = thread.messages[0];
  const isUnlinked = !thread.order;

  return (
    <div
      className={`border rounded-xl bg-card transition-colors hover:border-teal-crm/30 ${
        isUnlinked ? "border-amber-crm/30" : "border-border"
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="mt-0.5 flex-shrink-0">
          {isUnlinked ? (
            <Mail className="w-4 h-4 text-amber-crm" />
          ) : (
            <MailOpen className="w-4 h-4 text-teal-crm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/emails/${thread.id}`}
                className="text-sm font-medium text-foreground hover:text-teal-crm transition-colors line-clamp-1"
              >
                {thread.subject}
              </Link>
              {firstMsg && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {firstMsg.from} · {formatDateTime(firstMsg.sentAt)}
                </p>
              )}
              {thread.aiSummary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                  <Sparkles className="w-3 h-3 inline mr-1 text-teal-crm" />
                  {thread.aiSummary}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground font-mono">
                {thread._count.messages} msg{thread._count.messages !== 1 ? "s" : ""}
              </span>
              {thread.order && (
                <Link href={`/orders/${thread.order.id}`}>
                  <Badge className={`text-xs cursor-pointer ${ORDER_STATUS_COLORS[thread.order.status]}`}>
                    {thread.order.orderNumber}
                  </Badge>
                </Link>
              )}
              {thread.client && (
                <span className="text-xs text-muted-foreground">{thread.client.country}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Link href={`/emails/${thread.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                View
              </Button>
            </Link>
            {isDemo ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs cursor-not-allowed opacity-60" disabled>
                      <Sparkles className="w-3 h-3 mr-1.5 text-teal-crm" />
                      AI Parse
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>This feature is currently unavailable for demo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onParse}
                disabled={isParsing}
              >
                {isParsing ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1.5 text-teal-crm" />
                )}
                AI Parse
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${isUnlinked ? "text-amber-crm" : ""}`}
              onClick={onLink}
            >
              <Link2 className="w-3 h-3 mr-1.5" />
              {thread.order ? "Re-link Order" : "Link to Order"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
