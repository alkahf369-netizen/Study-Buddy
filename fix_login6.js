const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/app/login/page.tsx";
let data = fs.readFileSync(file, 'utf8');

// I completely botched the replace. Reverting the file back to original and doing it cleanly.
data = `"use client";
import React, { useState, useEffect, useRef } from "react";
import GoogleForm from "./form";
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
 *   <LoginPage />
 * ====================================================================== */

const cn = (...cls) => cls.filter(Boolean).join(" ");

const WordMark = ({ onDark = true }) => (
  <div className="inline-flex items-center gap-2.5">
    <img
      src="/study-buddy-logo.svg"
      alt="Study Buddy"
      className={\`h-7 w-7 \${onDark ? "text-white" : "text-black"}\`}
      style={{ objectFit: "contain" }}
    />
    <span
      className={\`text-[16px] font-semibold tracking-[-0.005em] \${onDark ? "text-white" : "text-black"}\`}
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      Study Buddy
    </span>
  </div>
);

function BrandPanel() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const container = containerRef.current;
    if (!container) return;

    let rafId;
    const handleMouseMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.05;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.05;

      rafId = requestAnimationFrame(() => {
        container.style.setProperty("--mx", \`\${x}px\`);
        container.style.setProperty("--my", \`\${y}px\`);
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={\`lp-grid relative hidden overflow-hidden bg-black text-white md:flex md:w-[46%] md:min-w-[460px] md:flex-col\`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          transform: "translate(calc(var(--mx, 0px)), calc(var(--my, 0px)))",
          transition: "transform 300ms ease-out",
        }}
      />
      <div className="lp-orb pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-white/[0.06] blur-3xl" />
      <div className="lp-orb-2 pointer-events-none absolute -bottom-40 -left-16 h-[360px] w-[360px] rounded-full bg-white/[0.04] blur-3xl" />
      <div className="lp-sweep pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex h-full flex-col justify-center p-10 lg:p-12">
        <div className="absolute left-10 top-10 lg:left-12 lg:top-12">
          <WordMark onDark={true} />
        </div>

        <div className="max-w-[460px]">
          <h1
            className="text-[36px] font-bold leading-[1.05] tracking-tight lg:text-[46px]"
            style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
          >
            {mounted ? (
              <>
                <TypewriterText text="Study smarter," delay={0} />
                <br />
                <TypewriterText text="not harder." delay={600} />
                <span className="lp-caret ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-white align-middle" />
              </>
            ) : (
              <span className="block min-h-[1.2em]">
                <span className="lp-caret ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-white align-middle" />
              </span>
            )}
          </h1>
          <p className="mt-5 max-w-[420px] text-[14.5px] leading-relaxed text-white/65">
            Generate quizzes from any note. Chat with the smartest models. Track
            your mastery — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}

function TypewriterText({ text, delay }) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    let timeout;
    let interval;
    if (delay > 0) {
      timeout = setTimeout(() => startTyping(), delay);
    } else {
      startTyping();
    }

    function startTyping() {
      interval = setInterval(() => {
        setVisibleChars((prev) => {
          if (prev >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 45); // type speed
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay]);

  return <span>{text.slice(0, visibleChars)}</span>;
}

export default function LoginPage() {
  return (
    <div
      data-testid="login-page"
      className="relative flex min-h-screen w-full overflow-hidden bg-white text-black antialiased"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.04] md:hidden"
        style={{
          backgroundImage: "radial-gradient(rgba(17,24,39,1) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <BrandPanel />

      <div className="relative z-10 flex flex-1 flex-col">
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

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            <div className="relative overflow-hidden rounded-[22px] border border-zinc-200 bg-white p-7 shadow-[0_10px_40px_rgba(17,24,39,0.06)] sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/80 to-transparent"
              />

              <div className="mb-6 flex items-center justify-center">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                    <Sparkle className="h-6 w-6" strokeWidth={2.4} />
                  </div>
                  <span className="lp-ping-dot absolute -right-1 -top-1 h-3 w-3 rounded-full bg-black ring-[3px] ring-white" />
                </div>
              </div>

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

              <GoogleForm />

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  What you get
                </span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <ul className="space-y-2.5">
                <li
                  className="lp-feature-in flex items-start gap-3 rounded-xl px-1"
                  style={{ animationDelay: "160ms" }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-black ring-1 ring-zinc-200">
                    <Zap className="h-[14px] w-[14px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-black">
                      One-click sign-in
                    </div>
                    <div className="text-[12px] leading-snug text-zinc-600">
                      No passwords. No resets. Straight to studying.
                    </div>
                  </div>
                </li>
                <li
                  className="lp-feature-in flex items-start gap-3 rounded-xl px-1"
                  style={{ animationDelay: "250ms" }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-black ring-1 ring-zinc-200">
                    <RefreshCw className="h-[14px] w-[14px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-black">
                      Sync across devices
                    </div>
                    <div className="text-[12px] leading-snug text-zinc-600">
                      Chats, quizzes, and scores — always up to date.
                    </div>
                  </div>
                </li>
                <li
                  className="lp-feature-in flex items-start gap-3 rounded-xl px-1"
                  style={{ animationDelay: "340ms" }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-black ring-1 ring-zinc-200">
                    <Lock className="h-[14px] w-[14px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-black">
                      Private by default
                    </div>
                    <div className="text-[12px] leading-snug text-zinc-600">
                      OAuth 2.0 — we never see your Google password.
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11.5px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-[12px] w-[12px]" />
                OAuth 2.0 &middot; Encrypted
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
              <span className="whitespace-nowrap">Free forever tier</span>
            </div>

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
`;

fs.writeFileSync(file, data);

