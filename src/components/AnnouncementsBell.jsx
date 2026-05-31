"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Megaphone,
  Info,
  AlertCircle,
  Wrench,
  X,
  Sparkles,
  Shield,
} from "lucide-react";

const SEEN_KEY = "sb_seen_announcements";

const TYPE_META = {
  info: { Icon: Info, label: "Update" },
  warning: { Icon: AlertCircle, label: "Heads up" },
  maintenance: { Icon: Wrench, label: "Maintenance" },
};

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function loadSeen() {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function AnnouncementsBell({ className = "" }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => (typeof window !== "undefined" ? loadSeen() : new Set()));
  const [mounted, setMounted] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial fetch
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements/active");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.announcements || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    // Refetch every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  // Position popup
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = items.filter((a) => !seen.has(a.id));
  const hasUnread = unread.length > 0;

  const markAllSeen = () => {
    const next = new Set(seen);
    items.forEach((a) => next.add(a.id));
    setSeen(next);
    saveSeen(next);
  };

  // When opened, mark as seen after a short delay so the badge clears smoothly
  useEffect(() => {
    if (open && hasUnread) {
      const t = setTimeout(markAllSeen, 600);
      return () => clearTimeout(t);
    }
  }, [open, hasUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if no items at all
  if (items.length === 0) return null;

  // Dropdown positioning
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const dropdownStyle = !triggerRect
    ? { display: "none" }
    : isMobile
    ? {
        left: 12,
        right: 12,
        top: triggerRect.bottom + 8,
        animation: "dropdownIn 200ms cubic-bezier(0.22, 0.85, 0.3, 1) both",
        transformOrigin: "top center",
      }
    : {
        right: Math.max(16, window.innerWidth - triggerRect.right),
        top: triggerRect.bottom + 10,
        width: 380,
        animation: "dropdownIn 200ms cubic-bezier(0.22, 0.85, 0.3, 1) both",
        transformOrigin: "top right",
      };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Announcements"
        aria-expanded={open}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-black active:bg-zinc-200",
          className
        )}
      >
        <Megaphone className="h-[16px] w-[16px]" />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-black ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[60] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)]"
          style={dropdownStyle}
        >
          {/* Premium hero header — black gradient with subtle dot pattern */}
          <div className="relative overflow-hidden bg-black px-4 py-3.5 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(circle, white 0.6px, transparent 0.6px)",
                backgroundSize: "14px 14px",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.05] blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-[13px] font-semibold tracking-tight">From the team</div>
                  <div className="text-[10.5px] font-medium text-zinc-400">
                    {items.length} active update{items.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
            {items.map((a, i) => {
              const meta = TYPE_META[a.type] || TYPE_META.info;
              const Icon = meta.Icon;
              const isUnseen = !seen.has(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "group relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50",
                    i > 0 && "border-t border-zinc-100"
                  )}
                >
                  {/* Unread indicator */}
                  {isUnseen && (
                    <span
                      aria-hidden
                      className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-black"
                    />
                  )}
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-zinc-100",
                      a.type === "maintenance"
                        ? "bg-black text-white ring-black"
                        : "bg-zinc-50 text-zinc-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold text-black">{a.title}</span>
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{a.message}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-zinc-400">
                      <Shield className="h-2.5 w-2.5" />
                      <span>
                        {a.createdBy?.name || "Admin"}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span>{timeAgo(a.createdAt)}</span>
                      {a.expiresAt && (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span>
                            ends {new Date(a.expiresAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5">
            <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                Posted by Study Buddy
              </span>
              {hasUnread ? (
                <button
                  onClick={markAllSeen}
                  className="font-semibold text-black hover:underline"
                >
                  Mark all read
                </button>
              ) : (
                <span className="text-zinc-400">All caught up</span>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
