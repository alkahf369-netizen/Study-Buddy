"use client";
import React, { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Loader2,
  Check,
  ShieldCheck,
  Sparkles,
  Sparkle,
  Infinity as InfinityIcon,
  Command,
  Zap,
  Lock,
  RefreshCw,
} from "lucide-react";

/* ========================================================================
 * LoginPage — Google-only sign-in
 * ------------------------------------------------------------------------
 * Strict black / white / grayscale palette. Split-screen layout with an
 * animated brand panel and a clean, single-CTA Google sign-in card.
 *
 * Usage:
 *   <LoginPage onAuthSuccess={(payload) => ...} onGoogle={(cb) => ...} />
 *
 * If `onGoogle` is not provided, runs in demo mode with a 1.2 s mock flow.
 * ====================================================================== */

const cn = (...cls: Array<string | false | null | undefined>) => cls.filter(Boolean).join(" ");

/* ---------------- Monochrome "G" glyph (not the official Google logo) ---------------- */
const GoogleGlyph = ({ className = "h-[18px] w-[18px]" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5h5" />
    <path d="M7.5 15.5A6 6 0 0 0 18 12" />
  </svg>
);

/* Study Buddy brand logo — uses the new brand image */
const QuasarLogo = ({ className = "" }: { className?: string; strokeWidth?: number }) => (
  <img src="/study-buddy-logo.svg" alt="Study Buddy" className={className} style={{ objectFit: "contain" }} />
);

/* ---------------- Wordmark ---------------- */
const WordMark = ({ onDark = true, className = "" }) => (
  <div className={cn("inline-flex items-center gap-2.5", className)}>
    <QuasarLogo
      className={cn("h-7 w-7", onDark ? "text-white" : "text-black")}
    />
    <span
      className={cn(
        "text-[16px] font-semibold tracking-[-0.005em]",
        onDark ? "text-white" : "text-black"
      )}
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      Study Buddy
    </span>
  </div>
);

/* =====================================================================
 * Brand panel (LEFT, black) — animated dot grid + typewriter tagline
 * ==================================================================== */
const TAGLINES = [
  "Study smarter, not harder.",
  "From notes to mastery in minutes.",
  "Your personal AI study partner.",
  "Turn any topic into a quiz — instantly.",
];

const BrandPanel = () => {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Typewriter
  useEffect(() => {
    const full = TAGLINES[taglineIdx];
    const speed = deleting ? 28 : 55;
    if (!deleting && typed === full) {
      const holdT = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(holdT);
    }
    if (deleting && typed === "") {
      setDeleting(false);
      setTaglineIdx((i) => (i + 1) % TAGLINES.length);
      return;
    }
    const t = setTimeout(() => {
      setTyped((s) =>
        deleting ? full.slice(0, s.length - 1) : full.slice(0, s.length + 1)
      );
    }, speed);
    return () => clearTimeout(t);
  }, [typed, deleting, taglineIdx]);

  // Mouse-reactive dot grid
  const gridRef = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.setProperty("--mx", `${x * 6}px`);
    el.style.setProperty("--my", `${y * 6}px`);
  };
  const onLeave = () => {
    const el = gridRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "0px");
    el.style.setProperty("--my", "0px");
  };

  return (
    <div
      ref={gridRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="lp-grid relative hidden overflow-hidden bg-black text-white md:flex md:w-[46%] md:min-w-[460px] md:flex-col"
    >
      {/* animated dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          transform: "translate(calc(var(--mx,0px)), calc(var(--my,0px)))",
          transition: "transform 300ms ease-out",
        }}
      />

      {/* drifting orbs */}
      <div className="lp-orb pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-white/[0.06] blur-3xl" />
      <div className="lp-orb-2 pointer-events-none absolute -bottom-40 -left-16 h-[360px] w-[360px] rounded-full bg-white/[0.04] blur-3xl" />

      {/* diagonal light sweep */}
      <div className="lp-sweep pointer-events-none absolute inset-0" />

      {/* content */}
      <div className="relative z-10 flex h-full flex-col justify-center p-10 lg:p-12">
        <div className="absolute left-10 top-10 lg:left-12 lg:top-12">
          <WordMark onDark />
        </div>

        <div className="max-w-[460px]">
          <h1
            className="text-[36px] font-bold leading-[1.05] tracking-tight lg:text-[46px]"
            style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
          >
            <span className="block min-h-[1.2em]">
              {typed}
              <span className="lp-caret ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-white align-middle" />
            </span>
          </h1>
          <p className="mt-5 max-w-[420px] text-[14.5px] leading-relaxed text-white/65">
            Generate quizzes from any note. Chat with the smartest models.
            Track your mastery — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

/* =====================================================================
 * MAIN: LoginPage (Google-only)
 * ==================================================================== */


export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Fix for bfcache (hitting "Back" from Google OAuth)
  useEffect(() => {
    const onRestore = () => {
      setBusy(false);
      setDone(false);
    };
    window.addEventListener("pageshow", onRestore);
    const onVis = () => {
      if (document.visibilityState === "visible") onRestore();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pageshow", onRestore);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const handleGoogle = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setBusy(false);
      setDone(false);
    }
  };

  return (
    <div
      data-testid="login-page"
      className="relative flex min-h-screen w-full overflow-hidden bg-white text-black antialiased"
    >
      {/* Subtle texture for the mobile view */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.04] md:hidden"
        style={{
          backgroundImage:
            "radial-gradient(rgba(17,24,39,1) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <BrandPanel />

      {/* RIGHT: Google sign-in card */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="md:hidden">
            <WordMark onDark={false} />
          </div>
          <span className="hidden md:block" />
          <button
            type="button"
            data-testid="help-link"
            className="text-[12.5px] font-semibold text-zinc-500 transition hover:text-black"
          >
            Need help?
          </button>
        </div>

        {/* center card */}
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            {/* The card itself — gives visual weight against the white panel */}
            <div className="relative overflow-hidden rounded-[22px] border border-zinc-200 bg-white p-7 shadow-[0_10px_40px_rgba(17,24,39,0.06)] sm:p-9">
              {/* subtle top-edge highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/80 to-transparent"
              />

              {/* Brand lockup icon */}
              <div className="mb-6 flex items-center justify-center">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                    <Sparkle className="h-6 w-6" strokeWidth={2.4} />
                  </div>
                  <span className="lp-ping-dot absolute -right-1 -top-1 h-3 w-3 rounded-full bg-black ring-[3px] ring-white" />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center">
                <h2
                  className="text-[26px] font-bold leading-tight tracking-tight text-black sm:text-[30px]"
                  style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
                >
                  Welcome back
                </h2>
                <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-zinc-600">
                  Sign in with Google to pick up exactly where you left off.
                </p>
              </div>

              {/* Google button — PRIMARY, high-contrast black */}
              <button
                type="button"
                data-testid="google-signin"
                onClick={handleGoogle}
                disabled={busy || done}
                className={cn(
                  "group relative mt-7 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl text-[15px] font-semibold transition-all duration-200",
                  done
                    ? "bg-black text-white"
                    : busy
                    ? "cursor-progress bg-zinc-900 text-white"
                    : "bg-black text-white hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] active:translate-y-0 active:scale-[0.99]"
                )}
              >
                {/* shine sweep on idle */}
                {!busy && !done && (
                  <span className="lp-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />
                )}

                {done ? (
                  <span className="lp-pop inline-flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                      <Check className="h-[14px] w-[14px]" strokeWidth={3.5} />
                    </span>
                    Signed in successfully
                  </span>
                ) : busy ? (
                  <>
                    <Loader2 className="h-[17px] w-[17px] animate-spin" />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-500 group-hover:rotate-[360deg]">
                      <GoogleGlyph className="h-[16px] w-[16px]" />
                    </span>
                    Continue with Google
                    <ArrowRight className="h-[16px] w-[16px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  What you get
                </span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              {/* Benefit bullets — adds density & readability */}
              <ul className="space-y-2.5">
                {[
                  {
                    Icon: Zap,
                    title: "One-click sign-in",
                    body: "No passwords. No resets. Straight to studying.",
                  },
                  {
                    Icon: RefreshCw,
                    title: "Sync across devices",
                    body: "Chats, quizzes, and scores — always up to date.",
                  },
                  {
                    Icon: Lock,
                    title: "Private by default",
                    body: "OAuth 2.0 — we never see your Google password.",
                  },
                ].map(({ Icon, title, body }, i) => (
                  <li
                    key={title}
                    className="lp-feature-in flex items-start gap-3 rounded-xl px-1"
                    style={{ animationDelay: `${i * 90 + 160}ms` }}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-black ring-1 ring-zinc-200">
                      <Icon className="h-[14px] w-[14px]" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-black">
                        {title}
                      </div>
                      <div className="text-[12px] leading-snug text-zinc-600">
                        {body}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Below-card trust row */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11.5px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-[12px] w-[12px]" />
                OAuth 2.0 · Encrypted
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
              <span className="whitespace-nowrap">Free forever tier</span>
            </div>

            {/* Legal */}
            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-zinc-500">
              By continuing you agree to our{" "}
              <a
                href="#terms"
                className="font-semibold text-black underline-offset-2 hover:underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#privacy"
                className="font-semibold text-black underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 pb-20 pt-2 text-center text-[11px] text-zinc-500 sm:px-8 md:hidden">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-[11px] w-[11px]" /> Secure
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-zinc-300 xs:inline-block" />
          <span className="whitespace-nowrap">More options coming soon</span>
        </div>
      </div>
    </div>
  );
}
