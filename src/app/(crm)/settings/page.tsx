"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/utils";
import { Users, Shield, Activity, LogOut, Plus, Trash2, Loader2, Eye, EyeOff, Key, CheckCircle, XCircle, Mail } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
  MANAGER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  VIEWER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("gmail_connected");
    const error = searchParams.get("gmail_error");
    if (connected === "true") toast.success("Gmail connected successfully");
    if (error) toast.error(`Gmail error: ${decodeURIComponent(error)}`);
    // Clean URL
    if (connected || error) {
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" subtitle="System configuration and management" />
      <main className="flex-1 p-6">
        <Tabs defaultValue="session">
          <TabsList className="mb-6">
            <TabsTrigger value="session">Session</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          </TabsList>

          <TabsContent value="session">
            <SessionTab session={session} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="audit">
              <AuditTab />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function SessionTab({ session }: { session: ReturnType<typeof useSession>["data"] }) {
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; expired: boolean } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchGmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/oauth/status");
      if (res.ok) setGmailStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void fetchGmailStatus(); }, [fetchGmailStatus]);

  async function disconnectGmail() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/emails/oauth/status", { method: "DELETE" });
      if (res.ok) {
        toast.success("Gmail disconnected");
        setGmailStatus({ connected: false, expired: false });
      }
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = gmailStatus?.connected && !gmailStatus?.expired;

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-crm" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium text-foreground">{session?.user?.name}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{session?.user?.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                ROLE_COLORS[session?.user?.role ?? "VIEWER"]
              }`}
            >
              {session?.user?.role}
            </span>
          </div>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full mt-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal-crm" />
            Gmail Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {gmailStatus === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-amber-crm">
                <XCircle className="w-3.5 h-3.5" />
                {gmailStatus?.expired ? "Token expired" : "Not connected"}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Connecting Gmail allows the CRM to sync your inbox and use AI to automatically identify
            and import client inquiries — filtering out newsletters and automated emails.
            Requires{" "}
            <code className="bg-secondary px-1 py-0.5 rounded">GMAIL_CLIENT_ID</code> and{" "}
            <code className="bg-secondary px-1 py-0.5 rounded">GMAIL_CLIENT_SECRET</code> in <code className="bg-secondary px-1 py-0.5 rounded">.env.local</code>.
            Add <code className="bg-secondary px-1 py-0.5 rounded">/api/emails/oauth/callback/</code> (prefixed with your app&apos;s origin) as an authorised redirect URI in Google Cloud Console.
          </p>

          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Link href="/emails">
                  <Button variant="outline" size="sm">
                    <Key className="w-3.5 h-3.5 mr-2" />
                    Go to Inbox
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={disconnectGmail}
                  disabled={disconnecting}
                >
                  {disconnecting && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                  Disconnect
                </Button>
              </>
            ) : session?.user?.isDemo ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" className="cursor-not-allowed opacity-60" disabled>
                      <Mail className="w-3.5 h-3.5 mr-2" />
                      Connect Gmail
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>This feature is currently unavailable for demo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Link href="/api/emails/oauth">
                <Button size="sm">
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  Connect Gmail
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleDelete(user: User) {
    const res = await fetch(`/api/settings/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to delete");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Team Members</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5 mr-2" />
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Name", "Email", "Role", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        description={`Delete ${deleteTarget?.name} (${deleteTarget?.email})? This cannot be undone.`}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CreateUserDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VIEWER" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("User created");
        setForm({ name: "", email: "", password: "", role: "VIEWER" });
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-crm" />
            Add Team Member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Password * (min 8 chars)</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={8}
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/audit?page=${page}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-crm" />
          Audit Log ({total} entries)
        </h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["Time", "User", "Action", "Entity", "IP"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{log.user.name}</td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-secondary px-1.5 py-0.5 rounded text-teal-crm">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.entity ? `${log.entity}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                        {log.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                        No audit logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
