"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Key,
  Plus,
  Trash2,
  Power,
  PowerOff,
  RotateCcw,
  Activity,
  Shield,
  ArrowLeft,
  Loader2,
  Users,
  Megaphone,
  LayoutDashboard,
  Search,
  MoreHorizontal,
  Crown,
  Ban,
  CheckCircle2,
  Pencil,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  Wrench,
  Info,
} from "lucide-react";

// ============================================================
// Admin Panel — Strict B&W palette
// ============================================================

type TabId = "overview" | "users" | "keys" | "announcements";

interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  endpoint: string | null;
  isActive: boolean;
  isEnabled: boolean;
  tokenLimit: number | null;
  tokenUsed: number;
  totalRequests: number;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "user" | "admin";
  isBanned: boolean;
  createdAt: string;
  counts: { conversations: number; quizzes: number; apiKeys: number };
  totalTokens: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "maintenance";
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null; image: string | null };
}

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  // Data
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [usageTotals, setUsageTotals] = useState<{ totalTokens: number; totalRequests: number } | null>(null);

  // Bootstrapping
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    bootstrap();
  }, [session, status]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys");
      if (res.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.keys) {
        setIsAdmin(true);
        setKeys(data.keys);
      }
      // Load usage totals for overview
      const usageRes = await fetch("/api/admin/usage");
      if (usageRes.ok) {
        const u = await usageRes.json();
        setUsageTotals(u.totals);
      }
    } catch {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto h-10 w-10 text-zinc-300" />
          <h2
            className="mt-4 text-xl font-bold text-black"
            style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
          >
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-zinc-500">You don&apos;t have admin privileges.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-black"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1
              className="text-lg font-bold tracking-tight text-black sm:text-xl"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.025em" }}
            >
              Admin
            </h1>
            <span className="hidden rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:inline">
              Console
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{session?.user?.email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:flex-row sm:px-6 sm:py-8">
        {/* Tab rail */}
        <nav className="sm:w-[200px] sm:shrink-0">
          <div className="flex gap-1 overflow-x-auto sm:flex-col [scrollbar-width:none]">
            {([
              { id: "overview", label: "Overview", Icon: LayoutDashboard },
              { id: "users", label: "Users", Icon: Users },
              { id: "keys", label: "API Keys", Icon: Key },
              { id: "announcements", label: "Announcements", Icon: Megaphone },
            ] as { id: TabId; label: string; Icon: any }[]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap",
                  tab === id
                    ? "bg-black text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-black"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] text-black">
              {error}
              <button
                onClick={() => setError("")}
                className="ml-2 font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {tab === "overview" && (
            <OverviewTab keys={keys} usageTotals={usageTotals} onJump={(t) => setTab(t)} />
          )}
          {tab === "users" && <UsersTab adminId={session?.user?.id || ""} />}
          {tab === "keys" && <KeysTab keys={keys} setKeys={setKeys} reloadAll={bootstrap} />}
          {tab === "announcements" && <AnnouncementsTab />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({
  keys,
  usageTotals,
  onJump,
}: {
  keys: ApiKeyData[];
  usageTotals: { totalTokens: number; totalRequests: number } | null;
  onJump: (t: TabId) => void;
}) {
  const activeKey = keys.find((k) => k.isActive);
  const totalUsed = usageTotals?.totalTokens || keys.reduce((s, k) => s + k.tokenUsed, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Key className="h-4 w-4" />}
          label="Public keys"
          value={keys.length.toString()}
          sub={`${keys.filter((k) => k.isEnabled).length} enabled`}
          onClick={() => onJump("keys")}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Tokens used"
          value={formatNumber(totalUsed)}
          sub={`${usageTotals?.totalRequests || 0} requests`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Active key"
          value={activeKey?.name || "None"}
          sub={activeKey ? "Serving public users" : "No key active"}
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Quick actions
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ActionCard
            Icon={Users}
            label="Manage users"
            description="Promote, ban, or remove users"
            onClick={() => onJump("users")}
          />
          <ActionCard
            Icon={Key}
            label="API keys"
            description="Rotate, edit, or add public keys"
            onClick={() => onJump("keys")}
          />
          <ActionCard
            Icon={Megaphone}
            label="Announce"
            description="Push a banner to all users"
            onClick={() => onJump("announcements")}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4",
        onClick && "cursor-pointer transition hover:border-black"
      )}
    >
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div
        className="mt-2 truncate text-[24px] font-bold text-black tabular-nums"
        style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.025em" }}
        title={value}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-zinc-500">{sub}</div>
    </div>
  );
}

function ActionCard({
  Icon,
  label,
  description,
  onClick,
}: {
  Icon: any;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-black"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition group-hover:bg-black group-hover:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-black">{label}</div>
        <div className="truncate text-[11.5px] text-zinc-500">{description}</div>
      </div>
    </button>
  );
}

// ============================================================
// Users Tab
// ============================================================

function UsersTab({ adminId }: { adminId: string }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "banned" | "users">("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserData | null>(null);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        filter,
        page: page.toString(),
        pageSize: "25",
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (id: string, body: any) => {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update user");
      } else {
        fetchUsers();
      }
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (id: string) => {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete user");
      } else {
        setConfirmDelete(null);
        fetchUsers();
      }
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100/80 p-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "users", label: "Users" },
              { id: "admins", label: "Admins" },
              { id: "banned", label: "Banned" },
            ] as { id: typeof filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                filter === f.id ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-zinc-400 tabular-nums">
          {pagination.total} total
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] text-black">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-[13px] text-zinc-500">No users match your filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === adminId}
                pending={actionId === u.id}
                onPromote={() => updateUser(u.id, { role: "admin" })}
                onDemote={() => updateUser(u.id, { role: "user" })}
                onBan={() => updateUser(u.id, { isBanned: true })}
                onUnban={() => updateUser(u.id, { isBanned: false })}
                onDelete={() => setConfirmDelete(u)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-zinc-500">
          <span>
            Page <span className="font-semibold text-black">{pagination.page}</span> of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete user"
          message={
            <>
              Permanently delete <strong>{confirmDelete.name || confirmDelete.email}</strong>? This will
              remove all their conversations, quizzes, and API keys. This cannot be undone.
            </>
          }
          confirmLabel="Delete user"
          onConfirm={() => deleteUser(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          pending={actionId === confirmDelete.id}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  pending,
  onPromote,
  onDemote,
  onBan,
  onUnban,
  onDelete,
}: {
  user: UserData;
  isSelf: boolean;
  pending: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === "admin";

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50">
      {/* Avatar */}
      <div className="relative shrink-0">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[12px] font-semibold text-white">
            {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        {user.isBanned && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black text-white ring-2 ring-white">
            <Ban className="h-2 w-2" />
          </span>
        )}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-black">
            {user.name || "(no name)"}
          </span>
          {isAdmin && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-black px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-white">
              <Crown className="h-2.5 w-2.5" />
              Admin
            </span>
          )}
          {isSelf && (
            <span className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 bg-white px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-zinc-600">
              You
            </span>
          )}
        </div>
        <div className="truncate text-[11.5px] text-zinc-500">{user.email}</div>
      </div>

      {/* Stats */}
      <div className="hidden shrink-0 items-baseline gap-3 text-[11px] text-zinc-500 sm:flex">
        <span className="tabular-nums">
          <strong className="text-black">{user.counts.conversations}</strong> chats
        </span>
        <span className="tabular-nums">
          <strong className="text-black">{user.counts.quizzes}</strong> quizzes
        </span>
        <span className="tabular-nums">
          <strong className="text-black">{formatNumber(user.totalTokens)}</strong> tokens
        </span>
      </div>

      <div className="hidden text-[11px] text-zinc-400 tabular-nums sm:block">
        {formatDate(user.createdAt)}
      </div>

      {/* Actions menu */}
      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          disabled={isSelf || pending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Actions"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
        {menuOpen && !isSelf && (
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
            style={{ animation: "dropdownIn 180ms cubic-bezier(0.22, 0.85, 0.3, 1) both" }}
            onClick={() => setMenuOpen(false)}
          >
            {!isAdmin ? (
              <MenuItem Icon={Crown} label="Promote to admin" onClick={onPromote} />
            ) : (
              <MenuItem Icon={Crown} label="Demote to user" onClick={onDemote} />
            )}
            {!user.isBanned ? (
              <MenuItem Icon={Ban} label="Ban user" onClick={onBan} />
            ) : (
              <MenuItem Icon={CheckCircle2} label="Unban user" onClick={onUnban} />
            )}
            <div className="my-1 h-px bg-zinc-100" />
            <MenuItem Icon={Trash2} label="Delete user" onClick={onDelete} destructive />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  Icon,
  label,
  onClick,
  destructive,
}: {
  Icon: any;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] font-medium transition-colors",
        destructive
          ? "text-black hover:bg-zinc-100 hover:text-black"
          : "text-zinc-700 hover:bg-zinc-50 hover:text-black"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

// ============================================================
// API Keys Tab — with edit + rotate
// ============================================================

function KeysTab({
  keys,
  setKeys,
  reloadAll,
}: {
  keys: ApiKeyData[];
  setKeys: (k: ApiKeyData[]) => void;
  reloadAll: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ApiKeyData | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const refetch = async () => {
    const res = await fetch("/api/admin/keys");
    const data = await res.json();
    if (data.keys) setKeys(data.keys);
  };

  const updateKey = async (id: string, body: any) => {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update key");
        return false;
      }
      await refetch();
      return true;
    } finally {
      setActionId(null);
    }
  };

  const deleteKey = async (id: string) => {
    setActionId(id);
    try {
      await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await refetch();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] text-black">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold text-black">Public API Keys</h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Used by visitors who haven&apos;t added their own key
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" /> Add key
          </button>
        </div>

        {showAddForm && (
          <AddKeyForm
            onCancel={() => setShowAddForm(false)}
            onCreated={async () => {
              setShowAddForm(false);
              await refetch();
            }}
            onError={setError}
          />
        )}

        {keys.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Key className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-[13px] text-zinc-500">No public API keys yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {keys.map((k) => (
              <KeyRow
                key={k.id}
                data={k}
                pending={actionId === k.id}
                onUpdate={(body) => updateKey(k.id, body)}
                onDelete={() => setConfirmDelete(k)}
              />
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete API key"
          message={
            <>
              Permanently delete <strong>{confirmDelete.name}</strong>? Any user relying on it will lose
              access immediately.
            </>
          }
          confirmLabel="Delete key"
          onConfirm={() => deleteKey(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          pending={actionId === confirmDelete.id}
        />
      )}
    </div>
  );
}

function AddKeyForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void;
  onCreated: () => void;
  onError: (s: string) => void;
}) {
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [tokenLimit, setTokenLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onError("");
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Public API Key",
          key: keyValue,
          endpoint,
          tokenLimit: tokenLimit || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) onError(data.error || "Failed to add key");
      else onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-b border-zinc-100 bg-zinc-50/60 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. NanoGPT Main)"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black"
        />
        <input
          value={tokenLimit}
          onChange={(e) => setTokenLimit(e.target.value)}
          placeholder="Token limit (optional)"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black"
        />
        <input
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          required
          placeholder="API Key *"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black sm:col-span-2"
        />
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          placeholder="Endpoint URL * (e.g. https://nano-gpt.com/api/v1)"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black sm:col-span-2"
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add public key
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-black"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function KeyRow({
  data,
  pending,
  onUpdate,
  onDelete,
}: {
  data: ApiKeyData;
  pending: boolean;
  onUpdate: (body: any) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [editEndpoint, setEditEndpoint] = useState(data.endpoint || "");
  const [editLimit, setEditLimit] = useState(data.tokenLimit?.toString() || "");
  const [newKey, setNewKey] = useState("");

  const usagePercent = data.tokenLimit
    ? Math.min(100, Math.round((data.tokenUsed / data.tokenLimit) * 100))
    : null;

  const saveEdit = async () => {
    const ok = await onUpdate({
      name: editName,
      endpoint: editEndpoint,
      tokenLimit: editLimit === "" ? null : editLimit,
    });
    if (ok) setEditing(false);
  };

  const saveRotate = async () => {
    if (!newKey.trim()) return;
    const ok = await onUpdate({ key: newKey.trim() });
    if (ok) {
      setNewKey("");
      setRotating(false);
    }
  };

  return (
    <div className={cn("px-5 py-4 transition", !data.isEnabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-black">{data.name}</span>
            {data.isActive && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-black px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Active
              </span>
            )}
            {!data.isEnabled && (
              <span className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600">
                Disabled
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-zinc-500">
            <span className="font-mono">{data.key}</span>
            <span className="text-zinc-300">·</span>
            <span className="truncate">{data.endpoint}</span>
          </div>

          {/* Usage */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-zinc-600">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Activity className="h-3 w-3" />
              <span className="font-semibold text-black">{formatNumber(data.tokenUsed)}</span>
              {data.tokenLimit && <span className="text-zinc-400">/ {formatNumber(data.tokenLimit)}</span>}
              <span className="text-zinc-400">tokens</span>
            </span>
            {usagePercent !== null && (
              <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
            <span className="text-zinc-400 tabular-nums">{data.totalRequests} requests</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!data.isActive && data.isEnabled && (
            <IconButton
              Icon={Power}
              title="Set as active"
              onClick={() => onUpdate({ setActive: true })}
            />
          )}
          <IconButton
            Icon={data.isEnabled ? PowerOff : Power}
            title={data.isEnabled ? "Disable" : "Enable"}
            onClick={() => onUpdate({ isEnabled: !data.isEnabled })}
          />
          <IconButton
            Icon={Pencil}
            title="Edit details"
            onClick={() => setEditing(!editing)}
            active={editing}
          />
          <IconButton
            Icon={RefreshCw}
            title="Rotate key"
            onClick={() => setRotating(!rotating)}
            active={rotating}
          />
          <IconButton Icon={RotateCcw} title="Reset usage" onClick={() => onUpdate({ resetUsage: true })} />
          <IconButton Icon={Trash2} title="Delete" onClick={onDelete} destructive />
          {pending && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-zinc-400" />}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Name"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-black outline-none transition focus:border-black"
            />
            <input
              value={editLimit}
              onChange={(e) => setEditLimit(e.target.value)}
              placeholder="Token limit (empty = unlimited)"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-black outline-none transition focus:border-black"
            />
            <input
              value={editEndpoint}
              onChange={(e) => setEditEndpoint(e.target.value)}
              placeholder="Endpoint URL"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-black outline-none transition focus:border-black sm:col-span-2"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={saveEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-zinc-800"
            >
              <Save className="h-3 w-3" /> Save changes
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditName(data.name);
                setEditEndpoint(data.endpoint || "");
                setEditLimit(data.tokenLimit?.toString() || "");
              }}
              className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rotate form */}
      {rotating && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-zinc-600">
            <RefreshCw className="h-3 w-3" />
            Replace the secret key value. Usage counter will reset.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste new API key value..."
              className="flex-1 min-w-[260px] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-black outline-none transition focus:border-black"
            />
            <button
              onClick={saveRotate}
              disabled={!newKey.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> Replace
            </button>
            <button
              onClick={() => {
                setRotating(false);
                setNewKey("");
              }}
              className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  Icon,
  title,
  onClick,
  active,
  destructive,
}: {
  Icon: any;
  title: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition",
        active
          ? "bg-black text-white"
          : destructive
          ? "text-zinc-500 hover:bg-zinc-100 hover:text-black"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ============================================================
// Announcements Tab
// ============================================================

function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (data.announcements) setItems(data.announcements);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateOne = async (id: string, body: any) => {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to update");
      else fetchAll();
    } finally {
      setActionId(null);
    }
  };

  const deleteOne = async (id: string) => {
    setActionId(id);
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      fetchAll();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] text-black">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold text-black">Announcements</h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Active items show up in everyone&apos;s top-bar bell
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        {(showForm || editing) && (
          <AnnouncementForm
            existing={editing}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              fetchAll();
            }}
            onError={setError}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-[13px] text-zinc-500">No announcements yet.</p>
            <p className="text-[11.5px] text-zinc-400">
              Push a banner to all users — useful for outages, new features, or maintenance.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((a) => (
              <AnnouncementRow
                key={a.id}
                data={a}
                pending={actionId === a.id}
                onToggle={() => updateOne(a.id, { isActive: !a.isActive })}
                onEdit={() => setEditing(a)}
                onDelete={() => setConfirmDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete announcement"
          message={
            <>
              Permanently delete <strong>{confirmDelete.title}</strong>?
            </>
          }
          confirmLabel="Delete"
          onConfirm={() => deleteOne(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          pending={actionId === confirmDelete.id}
        />
      )}
    </div>
  );
}

const ANNOUNCEMENT_TYPES = [
  { id: "info", label: "Info", Icon: Info },
  { id: "warning", label: "Warning", Icon: AlertCircle },
  { id: "maintenance", label: "Maintenance", Icon: Wrench },
] as const;

function AnnouncementForm({
  existing,
  onCancel,
  onSaved,
  onError,
}: {
  existing: Announcement | null;
  onCancel: () => void;
  onSaved: () => void;
  onError: (s: string) => void;
}) {
  const [title, setTitle] = useState(existing?.title || "");
  const [message, setMessage] = useState(existing?.message || "");
  const [type, setType] = useState<Announcement["type"]>(existing?.type || "info");
  const [expiresAt, setExpiresAt] = useState(
    existing?.expiresAt ? new Date(existing.expiresAt).toISOString().slice(0, 16) : ""
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onError("");
    try {
      const url = existing ? `/api/admin/announcements/${existing.id}` : "/api/admin/announcements";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          type,
          isActive,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) onError(data.error || "Failed");
      else onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-b border-zinc-100 bg-zinc-50/60 p-5">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="E.g. Scheduled maintenance — May 30"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={3}
            placeholder="What should users know?"
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black placeholder:text-zinc-400 outline-none transition focus:border-black"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Type
            </label>
            <div className="flex gap-1 rounded-lg bg-zinc-100/80 p-0.5">
              {ANNOUNCEMENT_TYPES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-medium transition-colors",
                    type === id
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Expires at <span className="font-normal normal-case text-zinc-400">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black outline-none transition focus:border-black"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-zinc-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-3.5 w-3.5 accent-black"
          />
          Show to users immediately
        </label>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {existing ? "Save changes" : "Publish"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-black"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AnnouncementRow({
  data,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: {
  data: Announcement;
  pending: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = ANNOUNCEMENT_TYPES.find((t) => t.id === data.type)?.Icon || Info;
  const isExpired = data.expiresAt && new Date(data.expiresAt) < new Date();
  const isLive = data.isActive && !isExpired;

  return (
    <div className="flex items-start gap-3 px-5 py-4 transition hover:bg-zinc-50">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isLive ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
        )}
      >
        <TypeIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-semibold text-black">{data.title}</span>
          {isLive ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-black px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
              <span className="h-1 w-1 rounded-full bg-white" />
              Live
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600">
              Expired
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600">
              Hidden
            </span>
          )}
          <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-zinc-600">
            {data.type}
          </span>
        </div>
        <div className="mt-1 line-clamp-2 text-[12px] text-zinc-600">{data.message}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-zinc-400">
          <span>By {data.createdBy.name || data.createdBy.email}</span>
          <span>·</span>
          <span>Created {formatDate(data.createdAt)}</span>
          {data.expiresAt && (
            <>
              <span>·</span>
              <span>Expires {formatDate(data.expiresAt)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          Icon={data.isActive ? PowerOff : Power}
          title={data.isActive ? "Hide" : "Publish"}
          onClick={onToggle}
        />
        <IconButton Icon={Pencil} title="Edit" onClick={onEdit} />
        <IconButton Icon={Trash2} title="Delete" onClick={onDelete} destructive />
        {pending && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-zinc-400" />}
      </div>
    </div>
  );
}

// ============================================================
// Confirm Modal
// ============================================================

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  pending,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h3 className="text-[15px] font-bold text-black">{title}</h3>
        <p className="mt-2 text-[13px] text-zinc-600">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-black"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
