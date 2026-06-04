"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function GoogleForm() {
  const [busy, setBusy] = useState(false);
  return (
    <button 
      onClick={() => {
        setBusy(true);
        signIn("google", { callbackUrl: "/" });
      }}
      disabled={busy}
      data-testid="google-signin"
      className={`group relative mt-7 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl text-[15px] font-semibold transition-all duration-200 ${busy ? "cursor-progress bg-zinc-900 text-white" : "bg-black text-white hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] active:translate-y-0 active:scale-[0.99]"}`}
    >
      <span className="lp-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-500 group-hover:rotate-[360deg]">
        <svg
          viewBox="0 0 24 24"
          className="h-[16px] w-[16px]"
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
      </span>
      Continue with Google
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right h-[16px] w-[16px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </button>
  )
}
