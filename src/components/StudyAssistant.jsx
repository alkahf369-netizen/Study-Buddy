import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Sparkles,
  Upload,
  ArrowUp,
  FileText,
  Check,
  X,
  Lightbulb,
  MessageSquare,
  Settings,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Zap,
  ListChecks,
  MessageCircle,
  ChevronDown,
  Bot,
  User,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Gem,
  Asterisk,
  Atom,
  SlidersHorizontal,
  Database,
  ChevronRight,
  Brain,
  Target,
  Minus,
  Wand2,
  Paperclip,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
  Layers,
  ImageOff,
  BarChart3,
  Code,
  BookOpen,
} from "lucide-react";

/* Quasar AI Logo — Q with sparkle star (inline SVG, uses currentColor) */
const QuasarLogo = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
    <circle cx="52" cy="52" r="28" stroke="currentColor" strokeWidth="5.5" fill="none"/>
    <line x1="72" y1="72" x2="105" y2="105" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round"/>
    <path d="M52,32 Q54.5,47 67,52 Q54.5,57 52,72 Q49.5,57 37,52 Q49.5,47 52,32Z" fill="currentColor"/>
  </svg>
);

/* Generic monogram glyph used as a placeholder mark (not a brand reproduction) */
const KMonogram = ({ className = "h-3.5 w-3.5", strokeWidth = 2.2 }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 4v16" />
    <path d="M7 12 L17 4" />
    <path d="M7 12 L17 20" />
  </svg>
);

/**
 * TypeScript interface reference (documented for consumer use):
 *
 * interface QuizQuestion {
 *   question: string;
 *   options: string[];
 *   correctAnswer: string;
 *   explanation: string;
 * }
 */

/* ---------------- Dummy Data ---------------- */

const DUMMY_QUIZ = [
  {
    question:
      "Which data structure uses LIFO (Last In, First Out) ordering for element access?",
    options: ["Queue", "Stack", "Linked List", "Binary Tree"],
    correctAnswer: "Stack",
    explanation:
      "A Stack follows the LIFO principle — the last element pushed onto the stack is the first one to be popped off. Think of a stack of plates: you always take the top one first. Queues, in contrast, use FIFO (First In, First Out).",
  },
  {
    question:
      "What is the time complexity of binary search on a sorted array of n elements?",
    options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
    correctAnswer: "O(log n)",
    explanation:
      "Binary search repeatedly halves the search interval. After k comparisons, the size of the search space is n/2^k. We stop when the space is 1, giving k = log₂(n). Hence, the complexity is O(log n).",
  },
  {
    question:
      "In React, which hook is used to perform side effects such as data fetching?",
    options: ["useState", "useMemo", "useEffect", "useRef"],
    correctAnswer: "useEffect",
    explanation:
      "useEffect runs after the render is committed to the screen, making it ideal for side effects like data fetching, subscriptions, and DOM mutations. useState handles state, useMemo memoizes values, and useRef persists mutable values across renders.",
  },
  {
    question: "Which of the following is NOT a primary color in the RGB color model?",
    options: ["Red", "Green", "Yellow", "Blue"],
    correctAnswer: "Yellow",
    explanation:
      "The RGB color model uses Red, Green, and Blue as additive primary colors. Yellow is a primary color in subtractive models like CMYK (used in printing), but in RGB, yellow is formed by mixing red and green light.",
  },
  {
    question:
      "What keyword in JavaScript is used to declare a variable whose value cannot be reassigned?",
    options: ["var", "let", "const", "static"],
    correctAnswer: "const",
    explanation:
      "const creates a binding that cannot be reassigned. Note that const does not make objects or arrays immutable — you can still mutate their contents — but the variable itself cannot be reassigned to a new reference.",
  },
];

const DUMMY_RECENT_CHATS = [
  { id: "c1", title: "Explain neural network backpropagation", date: "Today" },
  { id: "c2", title: "Brainstorm startup ideas for students", date: "Today" },
  { id: "c3", title: "Debug my Python recursion function", date: "Yesterday" },
  { id: "c4", title: "Summarize The Great Gatsby", date: "Yesterday" },
  { id: "c5", title: "Essay outline on climate policy", date: "2 days ago" },
  { id: "c6", title: "Calculus integration techniques", date: "4 days ago" },
];

const DUMMY_RECENT_MCQ = [
  { id: "m1", title: "Data Structures — Stacks & Queues", date: "Today" },
  { id: "m2", title: "React Hooks Deep Dive", date: "Today" },
  { id: "m3", title: "Binary Search Algorithms", date: "Yesterday" },
  { id: "m4", title: "Organic Chemistry — Alkanes", date: "Yesterday" },
  { id: "m5", title: "World War II Key Events", date: "2 days ago" },
  { id: "m6", title: "Photosynthesis Fundamentals", date: "1 week ago" },
];

/* ---------------- MCQ Generation Controls ---------------- */
/**
 * Complexity levels — modern, study-focused tiering inspired loosely by
 * Bloom's taxonomy. The backend should map these IDs to its prompting strategy.
 */
const COMPLEXITY_LEVELS = [
  {
    id: "recall",
    label: "Recall",
    description: "Quick fact-check, definitions",
    icon: Lightbulb,
  },
  {
    id: "apply",
    label: "Apply",
    description: "Practical use & worked scenarios",
    icon: Zap,
  },
  {
    id: "analyze",
    label: "Analyze",
    description: "Break it down, compare ideas",
    icon: Brain,
  },
  {
    id: "mastery",
    label: "Mastery",
    description: "Exam-grade, multi-step reasoning",
    icon: Target,
  },
];

/* ===== BACKEND INTEGRATION NOTE — read carefully when wiring the API =====

The MCQ composer collects three generation parameters and forwards them all
to the backend on submit:

  {
    text:          string,        // the user's pasted material (or filename)
    complexity:    "recall" | "apply" | "analyze" | "mastery",
    count:         number,        // user-requested # of MCQs (1..50)
    aiAutoCount:   boolean,       // if true → AI decides the optimal count
  }

Why `aiAutoCount` exists:
  Users will sometimes ask for 20 MCQs from a 2-line paragraph. To avoid the
  AI hallucinating filler questions, this toggle lets the user defer to the
  model's judgment. When `aiAutoCount === true`:
    1. The backend MUST IGNORE the `count` field entirely.
    2. The model picks a reasonable number based on the source's depth.
    3. The response should include the actual `count` used so the UI can
       reflect it back to the user.
  When `aiAutoCount === false`:
    The backend should honor `count` exactly, but is still free to refuse /
    warn the client if the source material is clearly insufficient.

Frontend's job is purely to collect & forward these params — the backend
is the source of truth for what gets generated.
======================================================================= */

const ComplexityPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = COMPLEXITY_LEVELS.find((l) => l.id === value) || COMPLEXITY_LEVELS[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="complexity-trigger"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 sm:gap-2 sm:px-3"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black text-white ring-1 ring-black/10">
          <CurrentIcon className="h-3 w-3" />
        </span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          className={cn(
            "h-[14px] w-[14px] text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm sm:hidden" 
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            data-testid="complexity-dropdown"
            className="fixed left-1/2 top-1/2 z-[101] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl sm:absolute sm:bottom-full sm:left-0 sm:top-auto sm:mb-2 sm:w-[300px] sm:-translate-x-0 sm:-translate-y-0 sm:origin-bottom-left sm:shadow-[0_12px_40px_rgba(17,24,39,0.12)]"
          >
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Complexity
          </div>
          {COMPLEXITY_LEVELS.map((lvl) => {
            const active = lvl.id === value;
            const Icon = lvl.icon;
            return (
              <button
                key={lvl.id}
                data-testid={`complexity-${lvl.id}`}
                onClick={() => {
                  onChange(lvl.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-black text-white"
                    : "text-zinc-800 hover:bg-zinc-100"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                    active
                      ? "bg-white text-black ring-white/30"
                      : "bg-black text-white ring-black/10"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {lvl.label}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 truncate text-[11.5px]",
                      active ? "text-white/75" : "text-zinc-500"
                    )}
                  >
                    {lvl.description}
                  </div>
                </div>
                {active && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
};

const CountStepper = ({ value, onChange, aiAuto, onToggleAiAuto, min = 1, max = 50 }) => {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {/* AI Auto pill (left segment) */}
      <button
        data-testid="ai-auto-toggle"
        onClick={onToggleAiAuto}
        title={
          aiAuto
            ? "AI decides the optimal number of questions"
            : "Let AI decide the number of questions"
        }
        className={cn(
          "flex items-center gap-1.5 px-2.5 text-[12px] font-semibold transition-colors sm:px-3",
          aiAuto
            ? "bg-black text-white"
            : "text-zinc-600 hover:bg-zinc-50 hover:text-black"
        )}
      >
        <Wand2 className="h-[13px] w-[13px]" />
        <span className="hidden sm:inline">Auto</span>
      </button>

      <span className="w-px bg-zinc-200" />

      {/* Stepper (right segment) */}
      <div
        className={cn(
          "flex items-center",
          aiAuto && "pointer-events-none opacity-40"
        )}
      >
        <button
          data-testid="count-dec"
          onClick={dec}
          disabled={aiAuto || value <= min}
          className="flex h-full w-7 items-center justify-center text-zinc-600 transition hover:bg-zinc-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-8"
          aria-label="Decrease"
        >
          <Minus className="h-[13px] w-[13px]" />
        </button>
        <span
          data-testid="count-value"
          className="flex min-w-[28px] items-center justify-center px-1 text-[13px] font-semibold tabular-nums text-black sm:min-w-[36px]"
        >
          {aiAuto ? "—" : value}
        </span>
        <button
          data-testid="count-inc"
          onClick={inc}
          disabled={aiAuto || value >= max}
          className="flex h-full w-7 items-center justify-center text-zinc-600 transition hover:bg-zinc-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-8"
          aria-label="Increase"
        >
          <Plus className="h-[13px] w-[13px]" />
        </button>
      </div>
    </div>
  );
};

/* ---------------- Settings persistence ---------------- */
const SETTINGS_KEY = "sa.settings.v1";

const DEFAULT_SETTINGS = {
  displayName: "",
  email: "",
  image: "",
  defaultModelId: "deepseek/deepseek-v4-flash",
  sendOnEnter: true, // false → Cmd/Ctrl+Enter sends, Enter inserts newline
};

const loadSettings = () => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings) => {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
};

/* ---------------- Token Usage Tracking ---------------- */
const TOKEN_USAGE_KEY = "quasar_token_usage";

const loadTokenUsage = () => {
  try {
    const raw = window.localStorage.getItem(TOKEN_USAGE_KEY);
    if (!raw) return { totalInput: 0, totalOutput: 0, totalRequests: 0, history: [] };
    return JSON.parse(raw);
  } catch {
    return { totalInput: 0, totalOutput: 0, totalRequests: 0, history: [] };
  }
};

const saveTokenUsage = (usage) => {
  try {
    window.localStorage.setItem(TOKEN_USAGE_KEY, JSON.stringify(usage));
  } catch { /* ignore */ }
};

const addTokenEntry = (inputTokens, outputTokens, modelName) => {
  const usage = loadTokenUsage();
  usage.totalInput += inputTokens;
  usage.totalOutput += outputTokens;
  usage.totalRequests += 1;
  // Keep last 50 entries
  usage.history = [
    { input: inputTokens, output: outputTokens, model: modelName, time: Date.now() },
    ...(usage.history || []),
  ].slice(0, 50);
  saveTokenUsage(usage);
  return usage;
};

const resetTokenUsage = () => {
  saveTokenUsage({ totalInput: 0, totalOutput: 0, totalRequests: 0, history: [] });
};

const formatTokenCount = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

/* ---------------- Fetch helpers for user's backend ----------------
 * Uses relative `/api/...` paths — compatible with Next.js App Router
 * same-origin deployment. When the frontend is served beside the
 * backend (as the user intends), these calls route correctly.
 */
const API_BASE =
  (typeof window !== "undefined" && window.__STUDY_AI_API_BASE__) || "";

const buildUrl = (path) => `${API_BASE}${path}`;

/** Convert a File to raw base64 (WITHOUT the `data:...;base64,` prefix). */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });

/** Convert an array of File objects → Gemini-style `inlineData` parts. */
const filesToInlineParts = async (files) => {
  if (!files || files.length === 0) return [];
  const parts = await Promise.all(
    files.map(async (f) => ({
      inlineData: {
        data: await fileToBase64(f),
        mimeType: f.type || "application/octet-stream",
      },
    }))
  );
  return parts;
};

/** POST a quiz generation request to the user's backend. */
const postGenerateQuiz = async ({ text, files, modelId }) => {
  const res = await fetch(buildUrl("/api/generate-quiz"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, files, modelId }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
};

/** POST a general chat message to the user's backend. */
const postChat = async ({ text, files, modelId, messages }) => {
  const res = await fetch(buildUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, files, modelId, messages }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data };
};

/** GET chat/quiz history from the user's backend. */
const getHistory = async () => {
  try {
    const res = await fetch(buildUrl("/api/history"), { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
};

/* ----------- Conversation CRUD helpers (server-side) ----------- */

/** Create a new conversation on the server */
const apiCreateConversation = async (title, kind = "chat") => {
  try {
    const res = await fetch(buildUrl("/api/conversations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

/** Load all conversations (for sidebar) */
const apiListConversations = async (kind) => {
  try {
    const url = kind
      ? buildUrl(`/api/conversations?kind=${kind}`)
      : buildUrl("/api/conversations");
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

/** Load a single conversation with all messages */
const apiLoadConversation = async (id) => {
  try {
    const res = await fetch(buildUrl(`/api/conversations/${id}`));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

/** Save a message to a conversation */
const apiSaveMessage = async (conversationId, { role, content, model, provider, files }) => {
  try {
    await fetch(buildUrl(`/api/conversations/${conversationId}/messages`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, model, provider, files }),
    });
  } catch {
    // Fire-and-forget — don't block the UI
  }
};

/** Delete a conversation */
const apiDeleteConversation = async (id) => {
  try {
    const res = await fetch(buildUrl(`/api/conversations/${id}`), {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
};

/* ---------------- AI Models ---------------- */

// Black & white styling for provider badges (study-friendly)
const PROVIDER_STYLES = {
  Google: "bg-black text-white ring-black/20",
  Anthropic: "bg-black text-white ring-black/20",
  OpenAI: "bg-black text-white ring-black/20",
  Kimi: "bg-black text-white ring-black/20",
};

// Generic abstract icons per provider (NOT official brand logos — placeholders)
const PROVIDER_ICONS = {
  Google: Gem,
  Anthropic: Asterisk,
  OpenAI: Atom,
  Kimi: KMonogram,
};

const ProviderIcon = ({ provider, className = "h-3.5 w-3.5" }) => {
  const Icon = PROVIDER_ICONS[provider];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={2.2} />;
};

const DEFAULT_MODELS = [
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro",
    provider: "Google",
    description: "Most capable multimodal reasoning",
    badge: "NEW",
    isVision: true,
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "Google",
    description: "Fast multimodal with vision",
    badge: "NEW",
    isVision: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast, efficient for everyday tasks",
    isVision: true,
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    description: "Balanced intelligence & speed",
    badge: "NEW",
    isVision: true,
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    description: "Deep reasoning for complex work",
    isVision: true,
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    description: "Frontier general-purpose model",
    isVision: true,
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    provider: "OpenAI",
    description: "Cost-efficient & quick",
    isVision: true,
  },
  {
    id: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6",
    provider: "Kimi",
    description: "Long-context Chinese & English",
    isVision: false,
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "Kimi",
    description: "Fast responses, broad knowledge",
    isVision: false,
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Model Switcher ---------------- */
const ModelSwitcher = ({ models, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState("All");
  const ref = useRef(null);
  const listRef = useRef(null);
  const current = value ? models.find((m) => m.id === value) : null;

  const mainBrands = useMemo(() => ['ChatGPT', 'Claude', 'Gemini', 'Deepseek', 'Kimi', 'Grok'], []);

  const filteredModels = models.filter((m) => {
    if (selectedProvider === "Other") {
      if (mainBrands.includes(m.provider)) return false;
    } else {
      if (m.provider !== selectedProvider) return false;
    }
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setFocusedIndex(0);
      const currentModel = value ? models.find((m) => m.id === value) : null;
      if (currentModel && mainBrands.includes(currentModel.provider)) {
        setSelectedProvider(currentModel.provider);
      } else {
        setSelectedProvider("Other");
      }
    }
  }, [open, models, value, mainBrands]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredModels.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredModels[focusedIndex]) {
        onChange(filteredModels[focusedIndex].id);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.children[focusedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, open]);

  return (
    <div className="relative" ref={ref} onKeyDown={handleKeyDown}>
      <button
        data-testid="model-switcher"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 sm:gap-2 sm:px-3"
      >
        {current?.provider && models.some(m => m.provider === current.provider) ? (
          <img
            src={`/icons/${current.provider.toLowerCase()}.png`}
            alt={current.provider}
            className="h-5 w-5 rounded-md object-contain"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black text-white ring-1 ring-black/10">
            <Bot className="h-3 w-3" />
          </span>
        )}
        <span className="hidden max-w-[160px] truncate sm:inline">{current?.name || "Select Model"}</span>
        <ChevronDown
          className={cn(
            "h-[14px] w-[14px] text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          data-testid="model-dropdown"
          className="absolute bottom-full left-0 z-50 mb-2 flex w-[260px] h-[220px] origin-bottom-left rounded-xl border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(17,24,39,0.12)] overflow-hidden sm:w-[380px] sm:h-[330px]"
        >
          {/* Left Sidebar - Providers */}
          <div className="flex w-[40px] shrink-0 flex-col items-center gap-1.5 border-r border-zinc-100 bg-zinc-50/50 py-2 [scrollbar-width:none] overflow-y-auto sm:w-[52px] sm:gap-2 sm:py-2.5">
             {mainBrands.map((brand) => {
               if (!models.some(m => m.provider === brand)) return null;
               return (
                 <button
                   key={brand}
                   title={brand}
                   onClick={(e) => { e.stopPropagation(); setSelectedProvider(brand); setFocusedIndex(0); }}
                   className={cn(
                     "flex h-7 w-7 items-center justify-center rounded-lg transition-all overflow-hidden sm:h-9 sm:w-9 sm:rounded-xl",
                     selectedProvider === brand 
                       ? "bg-white shadow-sm ring-1 ring-zinc-200/50 scale-105 grayscale-0 opacity-100" 
                       : "hover:bg-zinc-100 grayscale opacity-60 hover:opacity-100"
                   )}
                 >
                    <img 
                      src={`/icons/${brand.toLowerCase()}.png`} 
                      alt={brand} 
                      className={cn("object-contain", brand === 'Gemini' ? "h-[20px] w-[20px] sm:h-[26px] sm:w-[26px]" : "h-[16px] w-[16px] sm:h-[22px] sm:w-[22px]")} 
                    />
                 </button>
               );
             })}
             
             <div className="hidden flex-1 sm:block min-h-[12px]" />
             <button
               title="Other Models"
               onClick={(e) => { e.stopPropagation(); setSelectedProvider("Other"); setFocusedIndex(0); }}
               className={cn(
                 "flex h-7 w-7 items-center justify-center rounded-lg transition-all sm:h-9 sm:w-9 sm:rounded-xl",
                 selectedProvider === "Other" ? "bg-white shadow-sm ring-1 ring-zinc-200/50 text-black" : "hover:bg-zinc-100 text-zinc-400"
               )}
             >
                <Layers className="h-[16px] w-[16px] sm:h-[22px] sm:w-[22px]" />
             </button>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-1.5 flex flex-col min-w-0">
            <div className="mb-2 px-1 pt-1 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-[13px] text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
                />
              </div>
            </div>
          
          <div ref={listRef} className="max-h-[140px] overflow-y-auto [scrollbar-width:thin] space-y-0.5 px-1 pb-1 sm:max-h-[300px] sm:space-y-1">
            {filteredModels.length === 0 ? (
              <div className="py-6 text-center text-[12.5px] text-zinc-500">
                No models found matching "{searchQuery}"
              </div>
            ) : (
              filteredModels.map((m, index) => {
                const active = m.id === value;
                const isFocused = index === focusedIndex;
                
                return (
                  <button
                    key={m.id}
                    data-testid={`model-option-${m.id}`}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active
                        ? "bg-black text-white"
                        : isFocused
                        ? "bg-zinc-100 text-zinc-800"
                        : "text-zinc-800"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold">
                          {m.name}
                        </span>
                        {m.icon === 'lightning' && (
                          <Zap className={cn("h-3.5 w-3.5 shrink-0", active ? "text-white" : "text-black")} fill="currentColor" />
                        )}
                        {m.icon === 'brain' && (
                          <Brain className={cn("h-3.5 w-3.5 shrink-0", active ? "text-white" : "text-black")} />
                        )}
                        {m.isVision === false && (
                          <div title="Image not supported" className="flex items-center">
                            <ImageOff className={cn("h-4 w-4 shrink-0", active ? "text-white/60" : "text-zinc-400")} />
                          </div>
                        )}
                        {(m.badge || m.isNew) && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                              active
                                ? "bg-white/20 text-white"
                                : "bg-orange-500 text-white"
                            )}
                          >
                            {m.badge || "NEW"}
                          </span>
                        )}
                      </div>
                    </div>
                    {active && (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Settings Modal ---------------- */
const SETTINGS_TABS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "apikey", label: "API Key", Icon: KeyRound },
  { id: "usage", label: "Usage", Icon: BarChart3 },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
  { id: "data", label: "Data", Icon: Database },
];

const SettingsModal = ({
  open,
  onClose,
  settings,
  onSave,
  onClearChats,
  onClearMCQ,
  onResetAll,
  apiKeys,
  onSaveApiSettings,
  onToggleActiveKey,
  onDeleteKey,
  models,
  authUser,
}) => {
  const [tab, setTab] = useState("profile");
  const [draft, setDraft] = useState(settings);
  const [savedFlash, setSavedFlash] = useState(false);
  
  // API Key Form State
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEndpoint, setNewKeyEndpoint] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Re-sync local draft whenever the modal is opened or settings change
  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTab("profile");
      setSavedFlash(false);
      
      setNewKeyName("");
      setNewKeyEndpoint("");
      setNewKeyValue("");
      setKeyError("");
      setShowApiKey(false);
      setIsSavingKey(false);
    }
  }, [open, settings]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = () => {
    onSave(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1400);
  };

  const handleAddKey = async () => {
    if (!newKeyEndpoint.trim()) {
      setKeyError("Endpoint URL is required");
      return;
    }
    if (!newKeyValue.trim()) {
      setKeyError("API Key is required");
      return;
    }
    setIsSavingKey(true);
    setKeyError("");
    try {
      await onSaveApiSettings({
        name: newKeyName,
        endpoint: newKeyEndpoint,
        key: newKeyValue
      });
      setNewKeyName("");
      setNewKeyEndpoint("");
      setNewKeyValue("");
    } catch (err) {
      setKeyError(err.message || "Failed to validate/save key");
    } finally {
      setIsSavingKey(false);
    }
  };

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_rgba(17,24,39,0.18)] sm:flex-row">
        {/* Tabs — horizontal on mobile, vertical on desktop */}
        <div className="flex shrink-0 gap-1 border-b border-zinc-200 bg-zinc-50/60 p-2 sm:w-[180px] sm:flex-col sm:gap-0 sm:border-b-0 sm:border-r sm:p-3">
          <div className="hidden px-2 pt-1 pb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:block">
            Settings
          </div>
          {SETTINGS_TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                data-testid={`settings-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors sm:flex-none sm:justify-start",
                  active
                    ? "bg-black text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-black"
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex min-h-[420px] min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 sm:px-6 sm:py-4">
            <h2 className="text-[15px] font-semibold text-black">
              {SETTINGS_TABS.find((t) => t.id === tab)?.label}
            </h2>
            <button
              data-testid="settings-close"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-black"
              aria-label="Close"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {tab === "profile" && (
              <div className="space-y-5">
                {/* Google Account Card */}
                {authUser && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Signed in with Google
                    </div>
                    <div className="flex items-center gap-3">
                      {authUser.image ? (
                        <img
                          src={authUser.image}
                          alt=""
                          className="h-12 w-12 rounded-full border-2 border-white shadow"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                          {(authUser.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-black">
                          {authUser.name || "User"}
                        </div>
                        <div className="truncate text-[12.5px] text-zinc-500">
                          {authUser.email || ""}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">
                    Display name
                  </label>
                  <input
                    data-testid="settings-displayName"
                    type="text"
                    value={draft.displayName}
                    maxLength={40}
                    onChange={(e) => update({ displayName: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[14px] text-black outline-none transition focus:border-zinc-500"
                    placeholder={authUser?.name || "Your name"}
                  />
                  <p className="mt-1 text-[11.5px] text-zinc-500">
                    Shown in the sidebar and used when greeting you.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">
                    Email
                  </label>
                  <input
                    data-testid="settings-email"
                    type="email"
                    value={draft.email || authUser?.email || ""}
                    readOnly
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-[14px] text-zinc-600 outline-none cursor-not-allowed"
                  />
                  <p className="mt-1 text-[11.5px] text-zinc-400">
                    Synced from your Google account.
                  </p>
                </div>
              </div>
            )}

            {tab === "apikey" && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-[14px] font-semibold text-black">Your API Keys</h3>
                  <p className="mb-4 text-[12px] text-zinc-600">
                    Manage your API keys below. Only one key can be active at a time.
                  </p>

                  <div className="space-y-3">
                    {apiKeys && apiKeys.length > 0 ? (
                      apiKeys.map((k) => (
                        <div key={k.id} className={cn("flex items-center justify-between rounded-lg border p-3", k.isActive ? "border-black bg-zinc-50" : "border-zinc-200 bg-white")}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-black">{k.name}</span>
                              {k.isActive && <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">ACTIVE</span>}
                            </div>
                            <div className="mt-1 text-[11px] text-zinc-500 truncate">
                              Key: {k.key}
                            </div>
                            {k.endpoint && (
                              <div className="text-[11px] text-zinc-500 truncate">
                                Endpoint: {k.endpoint}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              role="switch"
                              aria-checked={k.isActive}
                              onClick={() => {
                                if (!k.isActive) onToggleActiveKey(k.id);
                              }}
                              className={cn(
                                "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                                k.isActive
                                  ? "border-black bg-black"
                                  : "border-zinc-300 bg-zinc-200 hover:border-zinc-400"
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform",
                                  k.isActive ? "translate-x-4 shadow-sm" : "translate-x-0"
                                )}
                              />
                            </button>
                            <button
                              onClick={() => onDeleteKey(k.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete key"
                            >
                              <Trash2 className="h-[14px] w-[14px]" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-[13px] text-zinc-500">
                        No API keys saved. Using application defaults.
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-6">
                  <h3 className="mb-4 text-[14px] font-semibold text-black">Add New Key</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">Name (optional)</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Groq Llama 3"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black outline-none transition focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">Endpoint</label>
                      <input
                        type="text"
                        value={newKeyEndpoint}
                        onChange={(e) => setNewKeyEndpoint(e.target.value)}
                        placeholder="https://api.groq.com/openai/v1/chat/completions"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-black outline-none transition focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={newKeyValue}
                          autoComplete="new-password"
                          data-1p-ignore="true"
                          spellCheck={false}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          placeholder="sk-..."
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-10 font-mono text-[13px] text-black outline-none transition focus:border-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((v) => !v)}
                          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-black"
                        >
                          {showApiKey ? <EyeOff className="h-[14px] w-[14px]" /> : <Eye className="h-[14px] w-[14px]" />}
                        </button>
                      </div>
                    </div>
                    {keyError && <div className="text-[12.5px] font-medium text-red-600">{keyError}</div>}
                    <button
                      onClick={handleAddKey}
                      disabled={isSavingKey}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {isSavingKey ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Save & Validate Key"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {tab === "usage" && (() => {
              const usage = loadTokenUsage();
              const totalTokens = usage.totalInput + usage.totalOutput;
              const inputPct = totalTokens > 0 ? (usage.totalInput / totalTokens) * 100 : 0;
              const outputPct = totalTokens > 0 ? (usage.totalOutput / totalTokens) * 100 : 0;
              
              return (
                <div className="space-y-5">
                  {/* Total tokens stat */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Total Tokens Used
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Reset all token usage data?")) {
                            resetTokenUsage();
                            setDraft({ ...draft }); // Force re-render
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    </div>
                    <div className="text-[32px] font-bold tracking-tight text-black">
                      {formatTokenCount(totalTokens)}
                    </div>
                    <div className="mt-1 text-[12px] text-zinc-500">
                      across {usage.totalRequests} request{usage.totalRequests !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Input / Output breakdown */}
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-zinc-700">Input Tokens</span>
                        <span className="text-[12px] font-bold text-black">{formatTokenCount(usage.totalInput)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-black transition-all duration-500"
                          style={{ width: `${Math.min(inputPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-zinc-700">Output Tokens</span>
                        <span className="text-[12px] font-bold text-black">{formatTokenCount(usage.totalOutput)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-zinc-500 transition-all duration-500"
                          style={{ width: `${Math.min(outputPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Avg per request */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Avg Input / Req</div>
                      <div className="mt-1 text-[18px] font-bold text-black">
                        {usage.totalRequests > 0 ? formatTokenCount(Math.round(usage.totalInput / usage.totalRequests)) : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Avg Output / Req</div>
                      <div className="mt-1 text-[18px] font-bold text-black">
                        {usage.totalRequests > 0 ? formatTokenCount(Math.round(usage.totalOutput / usage.totalRequests)) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  {usage.history && usage.history.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Recent Activity
                      </div>
                      <div className="max-h-[160px] space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 [scrollbar-width:thin]">
                        {usage.history.slice(0, 15).map((entry, i) => (
                          <div key={i} className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] hover:bg-zinc-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-1.5 w-1.5 rounded-full bg-black shrink-0" />
                              <span className="truncate font-medium text-zinc-700">{entry.model || "Unknown"}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-zinc-500">
                              <span>{entry.input}→{entry.output}</span>
                              <span className="text-[10px] text-zinc-400">
                                {new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === "preferences" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-zinc-700">
                    Default AI model
                  </label>
                  <select
                    data-testid="settings-defaultModel"
                    value={draft.defaultModelId}
                    onChange={(e) =>
                      update({ defaultModelId: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[14px] text-black outline-none transition focus:border-zinc-500"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11.5px] text-zinc-500">
                    The model selected by default whenever you open the app.
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-black">
                        Send with Enter
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-zinc-500">
                        {draft.sendOnEnter
                          ? "Press Enter to send. Shift+Enter for a newline."
                          : "Press Cmd/Ctrl + Enter to send. Enter inserts a newline."}
                      </p>
                    </div>
                    <button
                      data-testid="settings-sendOnEnter"
                      role="switch"
                      aria-checked={draft.sendOnEnter}
                      onClick={() =>
                        update({ sendOnEnter: !draft.sendOnEnter })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors",
                        draft.sendOnEnter
                          ? "border-black bg-black"
                          : "border-zinc-300 bg-zinc-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform",
                          draft.sendOnEnter
                            ? "translate-x-4"
                            : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "data" && (
              <div className="space-y-3">
                <p className="text-[12.5px] text-zinc-500">
                  Manage your stored data. These actions will permanently delete
                  data from the server and cannot be undone.
                </p>

                <button
                  data-testid="settings-clear-chats"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete all chat history? This cannot be undone."
                      )
                    ) {
                      onClearChats();
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold text-black">
                      Clear all chats
                    </div>
                    <div className="text-[11.5px] text-zinc-500">
                      Removes every chat from the sidebar.
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>

                <button
                  data-testid="settings-clear-mcq"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete all MCQ history? This cannot be undone."
                      )
                    ) {
                      onClearMCQ();
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold text-black">
                      Clear all MCQ sessions
                    </div>
                    <div className="text-[11.5px] text-zinc-500">
                      Removes every quiz from the sidebar.
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>

                <button
                  data-testid="settings-reset-all"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset everything (settings + chats + quizzes) to defaults?"
                      )
                    ) {
                      onResetAll();
                      onClose();
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-red-50/60 px-4 py-3 text-left transition hover:border-red-400 hover:bg-red-50"
                >
                  <div>
                    <div className="text-[13.5px] font-semibold text-red-700">
                      Reset everything
                    </div>
                    <div className="text-[11.5px] text-red-500/80">
                      Restore the app to its initial state.
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3 sm:px-6">
            <span
              className={cn(
                "text-[12px] font-medium transition-opacity",
                savedFlash ? "text-emerald-600 opacity-100" : "opacity-0"
              )}
            >
              ✓ Saved
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
              >
                Cancel
              </button>
              <button
                data-testid="settings-save"
                onClick={handleSave}
                disabled={!dirty}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200",
                  dirty
                    ? "bg-black text-white hover:bg-zinc-800 active:scale-[0.97]"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                )}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Sidebar ---------------- */
const SectionTabs = ({ section, onChange }) => {
  const tabs = [
    { id: "chat", label: "Chat", Icon: MessageCircle },
    { id: "mcq", label: "MCQ", Icon: ListChecks },
  ];

  return (
    <div className="relative inline-flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {/* sliding highlight */}
      <div
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-black transition-all duration-300 ease-out",
          section === "chat" ? "left-1" : "left-[calc(50%+0px)]"
        )}
      />
      {tabs.map((t) => {
        const active = section === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-semibold transition-colors duration-200",
              active ? "text-white" : "text-zinc-600 hover:text-black"
            )}
          >
            <Icon className="h-[14px] w-[14px]" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

const Sidebar = ({
  open,
  onToggle,
  section,
  onSectionChange,
  activeId,
  onSelect,
  onNew,
  recentChats,
  recentMCQ,
  onDelete,
  displayName,
  onOpenSettings,
  user,
  onLogout,
}) => {
  const [query, setQuery] = useState("");
  const pool = section === "chat" ? recentChats : recentMCQ;
  const filtered = pool.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  const newLabel = section === "chat" ? "New Chat" : "New Quiz";
  const recentLabel = section === "chat" ? "Recent Chats" : "Recent Quizzes";

  return (
    <>
      {/* Mobile backdrop — visible only on small screens when drawer is open */}
      {open && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] sm:hidden"
        />
      )}

      <aside
        data-testid="sidebar"
        className={cn(
          "h-screen shrink-0 transition-[width,transform] duration-300 ease-out",
          // Mobile: fixed overlay drawer (always 280px wide, slides in/out)
          "fixed inset-y-0 left-0 z-40 w-[280px]",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: in-flow, width animates between 280 and 68
          "sm:relative sm:translate-x-0",
          open ? "sm:w-[280px]" : "sm:w-[68px]"
        )}
      >
      {/* Glass surface on white */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-white/70 backdrop-blur-2xl backdrop-saturate-150",
          "border-r border-zinc-200/80",
          "shadow-[inset_-1px_0_0_rgba(255,255,255,0.8)]"
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent" />

      <div className="relative flex h-full flex-col">
        {/* Header — Brand + Toggle */}
        <div
          className={cn(
            "flex items-center px-3 pb-3 pt-4",
            open ? "justify-between" : "justify-center"
          )}
        >
          {open && (
            <div className="flex items-center gap-2">
              <QuasarLogo className="h-7 w-7 text-black" />
              <span className="text-[15px] font-bold tracking-tight text-black">
                Quasar AI
              </span>
            </div>
          )}
          <button
            data-testid="sidebar-toggle"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-black/5 hover:text-black"
            aria-label="Toggle sidebar"
          >
            {open ? (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        {/* Section tabs moved to top bar — kept here as a spacer */}

        {/* New button */}
        <div className="mt-3 px-3">
          <button
            data-testid="new-button"
            onClick={onNew}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
              "bg-black text-white hover:bg-zinc-800 shadow-sm",
              !open && "justify-center px-0"
            )}
          >
            <Plus className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:rotate-90" />
            {open && <span className="truncate">{newLabel}</span>}
          </button>
        </div>

        {/* Search */}
        {open && (
          <div className="mt-3 px-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                data-testid="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  section === "chat" ? "Search chats..." : "Search quizzes..."
                }
                className="w-full rounded-lg bg-white/80 py-2 pl-9 pr-3 text-sm text-black placeholder:text-zinc-400 outline-none ring-1 ring-zinc-200 transition focus:bg-white focus:ring-black/20"
              />
            </div>
          </div>
        )}

        {/* Recents */}
        <div className="mt-4 flex-1 overflow-hidden">
          {open && (
            <div className="px-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {recentLabel}
            </div>
          )}
          <div className="h-full overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
            <ul className="space-y-0.5">
              {filtered.map((item) => (
                <li key={item.id}>
                  <div
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                      activeId === item.id
                        ? "bg-black/[0.06] text-black"
                        : "text-zinc-600 hover:bg-black/[0.04] hover:text-black",
                      !open && "justify-center px-0"
                    )}
                  >
                    <button
                      data-testid={`recent-item-${item.id}`}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 text-left",
                        !open && "justify-center"
                      )}
                      title={item.title}
                    >
                      <MessageSquare className="h-[15px] w-[15px] shrink-0" />
                      {open && (
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {item.date}
                          </span>
                        </div>
                      )}
                    </button>
                    {open && (
                      <button
                        data-testid={`delete-item-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-[14px] w-[14px]" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {open && filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-zinc-500">
                  No {section === "chat" ? "chats" : "quizzes"} found
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer — User profile */}
        <div className="mt-auto shrink-0 border-t border-zinc-200/80 p-3">
          <div className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2",
            !open && "justify-center px-0"
          )}>
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-7 w-7 shrink-0 aspect-square object-cover rounded-full ring-1 ring-zinc-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 aspect-square items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                {(user?.name || displayName || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            {open && (
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[13px] font-medium text-black">
                  {user?.name || displayName || "Anonymous"}
                </span>
                <span className="truncate text-[11px] text-zinc-500">
                  {user?.email || "Free plan"}
                </span>
              </div>
            )}
            {open && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenSettings}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-black transition"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                {user && onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
                    title="Sign out"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

/* ---------------- MCQ Card (paper style) ---------------- */
const MCQCard = ({ q, index, selected, onSelect }) => {
  const answered = selected !== null && selected !== undefined;

  return (
    <div
      data-testid={`mcq-card-${index}`}
      className="group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-6"
      style={{
        background:
          "linear-gradient(180deg, #fbf4de 0%, #f4ead0 60%, #eeddb6 100%)",
        borderColor: "#c7ad78",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(90,60,20,0.06), 0 10px 28px rgba(120,85,30,0.10)",
      }}
    >
      {/* Faint ruled lines — mimics exam paper */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(139,101,45,0.18) 27px, rgba(139,101,45,0.18) 28px)",
        }}
      />
      {/* Warm inner glow on the left edge — like a paper fold shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{
          background:
            "linear-gradient(90deg, rgba(139,101,45,0.10), transparent)",
        }}
      />

      {/* Question header */}
      <div className="relative mb-5 flex items-start gap-3">
        <div
          className="flex h-8 min-w-[32px] shrink-0 items-center justify-center rounded-md px-2 text-[12px] font-semibold"
          style={{
            background: "#2a2218",
            color: "#fbf4de",
            boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset",
          }}
        >
          Q{index + 1}
        </div>
        <h3
          className="flex-1 text-[15px] leading-relaxed md:text-[17px]"
          style={{
            color: "#2a2218",
            fontFamily: "'Manrope', system-ui, sans-serif",
            fontWeight: 650,
            letterSpacing: "-0.005em",
          }}
        >
          {q.question}
        </h3>
        <span
          data-testid={`mcq-${index}-mark`}
          className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold"
          style={{
            background: "#fff9e8",
            borderColor: "#c7ad78",
            color: "#6b5434",
          }}
          title="This question is worth 1 point"
        >
          <Target className="h-[10px] w-[10px]" />
          1 pt
        </span>
      </div>

      {/* Options */}
      <div className="relative grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrect = opt === q.correctAnswer;
          // Tick-box states:
          //   - unanswered             → empty box
          //   - user picked & correct  → black tick
          //   - user picked & wrong    → red cross
          //   - user picked wrong AND this is the right one → auto black tick
          const showTick = answered && isCorrect; // correct answer always gets a tick once answered
          const showCross = answered && isSelected && !isCorrect;

          return (
            <button
              key={i}
              data-testid={`mcq-${index}-option-${i}`}
              disabled={answered}
              onClick={() => onSelect(opt)}
              className={cn(
                "group/opt relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13.5px] transition-all duration-200",
                !answered &&
                  "hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(120,85,30,0.15)]",
                answered && !isSelected && !isCorrect && "opacity-55"
              )}
              style={{
                borderColor: showCross
                  ? "#b23939"
                  : showTick
                  ? "#2a2218"
                  : "rgba(139,101,45,0.35)",
                background: showCross
                  ? "rgba(223,92,92,0.08)"
                  : showTick
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(255,255,255,0.35)",
                color: "#2a2218",
                fontFamily: "'Edu VIC WA NT Beginner', 'Comic Sans MS', cursive",
                fontWeight: 500,
                fontSize: "15px",
                lineHeight: "1.4",
              }}
            >
              {/* Tick-box */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors"
                )}
                style={{
                  borderColor: showCross
                    ? "#b23939"
                    : showTick
                    ? "#2a2218"
                    : "#8a7348",
                  background: showTick
                    ? "#fbf4de"
                    : showCross
                    ? "#fff"
                    : "rgba(255,255,255,0.6)",
                }}
              >
                {showTick && (
                  <Check
                    className="h-[14px] w-[14px]"
                    strokeWidth={3}
                    style={{ color: "#2a2218" }}
                  />
                )}
                {showCross && (
                  <X
                    className="h-[14px] w-[14px]"
                    strokeWidth={3}
                    style={{ color: "#b23939" }}
                  />
                )}
              </div>

              {/* Option letter + text */}
              <span className="flex-1 leading-snug">
                <span
                  className="mr-1.5 font-semibold"
                  style={{
                    color: "#6b5434",
                    fontFamily: "'Manrope', system-ui, sans-serif",
                    fontWeight: 650,
                  }}
                >
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      <div
        className={cn(
          "relative grid overflow-hidden transition-all duration-500 ease-out",
          answered
            ? "mt-5 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0">
          <div
            data-testid={`mcq-${index}-explanation`}
            className="flex gap-3 rounded-xl border p-4"
            style={{
              background: "rgba(255,249,220,0.75)",
              borderColor: "#c7ad78",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "rgba(234,179,8,0.18)",
                color: "#8a6a10",
                boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.35)",
              }}
            >
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  color: "#8a6a10",
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  fontWeight: 700,
                }}
              >
                Explanation
              </div>
              <p
                className="text-[13.5px] leading-relaxed"
                style={{
                  color: "#3a2f1e",
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  fontWeight: 500,
                }}
              >
                {q.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Result paper (shown after all MCQs answered) ---------------- */
const GRADE_TABLE = [
  { min: 97, grade: "A+", remark: "Outstanding work!" },
  { min: 93, grade: "A",  remark: "Excellent — very well done." },
  { min: 90, grade: "A-", remark: "Great job, nearly perfect." },
  { min: 87, grade: "B+", remark: "Strong performance." },
  { min: 83, grade: "B",  remark: "Solid effort, keep it up." },
  { min: 80, grade: "B-", remark: "Good attempt — a bit more to polish." },
  { min: 77, grade: "C+", remark: "Decent, keep practicing." },
  { min: 73, grade: "C",  remark: "Room to improve — you can do it." },
  { min: 70, grade: "C-", remark: "Needs more review." },
  { min: 67, grade: "D+", remark: "Revise the basics and try again." },
  { min: 63, grade: "D",  remark: "Keep at it — review and retry." },
  { min: 60, grade: "D-", remark: "Don't give up — practice helps." },
  { min: 0,  grade: "F",  remark: "Review the material and try once more." },
];

const gradeFor = (pct) => GRADE_TABLE.find((g) => pct >= g.min) || GRADE_TABLE[GRADE_TABLE.length - 1];

const RED_PEN = "#c42a30";
const HAND_FONT = "'Edu VIC WA NT Beginner', 'Comic Sans MS', cursive";

/* ---------- Best-score memory (per quiz) ----------
 * Stored in localStorage under `sa.bestscores.v1`. Keyed by quiz title + total
 * so different quizzes never collide. Backend can replace this with a real
 * per-user leaderboard later — the public shape is preserved.
 */
const BEST_SCORES_KEY = "sa.bestscores.v1";

const loadBestScores = () => {
  try {
    const raw = window.localStorage.getItem(BEST_SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveBestScores = (obj) => {
  try {
    window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
};

const quizKeyOf = (title, total) => `${(title || "quiz").trim()}::${total}`;

const QuizResult = ({ correct, total, onRetry, onClose, title }) => {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { grade, remark } = gradeFor(pct);
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  /* Compare against prior best & persist. Computed once per popup mount.
   * Guarded with a ref so React 18 StrictMode's double effect-invoke in dev
   * doesn't double-count attempts or clobber the comparison. */
  const [compare, setCompare] = useState(null);
  const persistedRef = useRef(false);
  useEffect(() => {
    if (persistedRef.current) return;
    persistedRef.current = true;

    const all = loadBestScores();
    const key = quizKeyOf(title, total);
    const prior = all[key];
    const attemptsNow = (prior?.attempts || 0) + 1;

    let status;
    if (!prior) status = "first";
    else if (correct > prior.bestCorrect) status = "new-best";
    else if (correct === prior.bestCorrect) status = "matched";
    else status = "below";

    setCompare({
      status,
      attempts: attemptsNow,
      priorBest: prior
        ? {
            bestCorrect: prior.bestCorrect,
            bestGrade: prior.bestGrade,
            bestPct: prior.bestPct,
          }
        : null,
      delta: prior ? correct - prior.bestCorrect : null,
    });

    // Persist: keep the best-ever, but always increment attempts
    const shouldUpdateBest = !prior || correct > prior.bestCorrect;
    all[key] = {
      bestCorrect: shouldUpdateBest ? correct : prior.bestCorrect,
      bestPct: shouldUpdateBest ? pct : prior.bestPct,
      bestGrade: shouldUpdateBest ? grade : prior.bestGrade,
      attempts: attemptsNow,
      lastAt: new Date().toISOString(),
    };
    saveBestScores(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="quiz-result"
      className="relative mb-5 overflow-hidden rounded-2xl border p-5 sm:p-7"
      style={{
        background:
          "linear-gradient(180deg, #fbf4de 0%, #f4ead0 60%, #eeddb6 100%)",
        borderColor: "#c7ad78",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(90,60,20,0.06), 0 10px 28px rgba(120,85,30,0.12)",
      }}
    >
      {/* Ruled lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(139,101,45,0.18) 27px, rgba(139,101,45,0.18) 28px)",
        }}
      />
      {/* Left-edge fold shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{
          background:
            "linear-gradient(90deg, rgba(139,101,45,0.10), transparent)",
        }}
      />

      {/* New-best stamp (corner sticker style) */}
      {compare?.status === "new-best" && (
        <div
          data-testid="new-best-stamp"
          className="sa-stamp-in pointer-events-none absolute right-3 top-3 z-10 sm:right-4 sm:top-4"
        >
          <div
            className="flex flex-col items-center justify-center rounded-full px-3 py-2 text-center"
            style={{
              border: `2.5px solid ${RED_PEN}`,
              color: RED_PEN,
              background: "rgba(255,249,220,0.92)",
              fontFamily: HAND_FONT,
              fontWeight: 700,
              lineHeight: 1,
              boxShadow: "0 4px 12px rgba(196,42,48,0.22)",
            }}
          >
            <span style={{ fontSize: "11px", letterSpacing: "0.1em" }}>★ NEW ★</span>
            <span style={{ fontSize: "18px", marginTop: 2 }}>BEST!</span>
          </div>
        </div>
      )}

      {/* Top row: label + retry */}
      <div className="relative mb-4 flex items-start justify-between">
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: "#8a6a10",
              fontFamily: "'Manrope', system-ui, sans-serif",
              fontWeight: 700,
            }}
          >
            Result sheet
          </div>
          <div
            className="mt-1 text-[11.5px]"
            style={{
              color: "#8a7348",
              fontFamily: "'Manrope', system-ui, sans-serif",
            }}
          >
            Graded on {dateStr}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="quiz-retry"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition hover:-translate-y-0.5"
            style={{
              borderColor: "#c7ad78",
              background: "rgba(255,255,255,0.55)",
              color: "#3a2f1e",
              fontFamily: "'Manrope', system-ui, sans-serif",
              fontWeight: 650,
            }}
          >
            <RefreshCw className="h-[13px] w-[13px]" />
            Retry
          </button>
          {onClose && (
            <button
              data-testid="quiz-result-close"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:-translate-y-0.5"
              style={{
                borderColor: "#c7ad78",
                background: "rgba(255,255,255,0.55)",
                color: "#3a2f1e",
              }}
            >
              <X className="h-[15px] w-[15px]" />
            </button>
          )}
        </div>
      </div>

      {/* Main grade row */}
      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Big grade inside hand-drawn red circle */}
        <div className="relative flex h-[128px] w-[128px] shrink-0 items-center justify-center self-center sm:self-auto">
          {/* Hand-drawn double ellipse */}
          <svg
            viewBox="0 0 128 128"
            className="absolute inset-0"
            aria-hidden="true"
          >
            <ellipse
              cx="64"
              cy="64"
              rx="56"
              ry="52"
              fill="none"
              stroke={RED_PEN}
              strokeWidth="2.4"
              strokeLinecap="round"
              transform="rotate(-6 64 64)"
              style={{ opacity: 0.92 }}
            />
            <ellipse
              cx="64"
              cy="64"
              rx="54"
              ry="50"
              fill="none"
              stroke={RED_PEN}
              strokeWidth="1.6"
              strokeLinecap="round"
              transform="rotate(-2 64 64)"
              style={{ opacity: 0.55 }}
            />
          </svg>
          <span
            data-testid="quiz-grade"
            style={{
              color: RED_PEN,
              fontFamily: HAND_FONT,
              fontWeight: 700,
              fontSize: grade.length > 1 ? "64px" : "78px",
              lineHeight: 1,
              transform: "rotate(-4deg)",
              textShadow: "0 1px 0 rgba(196,42,48,0.15)",
            }}
          >
            {grade}
          </span>
        </div>

        {/* Score + remark */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="text-[13px] uppercase tracking-wider"
              style={{
                color: "#6b5434",
                fontFamily: "'Manrope', system-ui, sans-serif",
                fontWeight: 650,
              }}
            >
              Score
            </span>
            <span
              data-testid="quiz-score"
              style={{
                color: RED_PEN,
                fontFamily: HAND_FONT,
                fontWeight: 700,
                fontSize: "40px",
                lineHeight: 1,
                transform: "rotate(-2deg)",
                display: "inline-block",
              }}
            >
              {correct}/{total}
            </span>
            <span
              style={{
                color: RED_PEN,
                fontFamily: HAND_FONT,
                fontWeight: 600,
                fontSize: "24px",
                lineHeight: 1,
                transform: "rotate(-1deg)",
                display: "inline-block",
                opacity: 0.9,
              }}
            >
              ({pct}%)
            </span>
          </div>

          {/* Hand-drawn red underline under the score */}
          <svg
            viewBox="0 0 240 10"
            preserveAspectRatio="none"
            className="mt-1 h-[8px] w-[180px] max-w-full"
            aria-hidden="true"
          >
            <path
              d="M 2 6 Q 60 2, 120 5 T 238 4"
              fill="none"
              stroke={RED_PEN}
              strokeWidth="2"
              strokeLinecap="round"
              style={{ opacity: 0.85 }}
            />
          </svg>

          {/* Remark */}
          <p
            data-testid="quiz-remark"
            className="mt-4 leading-snug"
            style={{
              color: RED_PEN,
              fontFamily: HAND_FONT,
              fontWeight: 600,
              fontSize: "19px",
              transform: "rotate(-0.8deg)",
              transformOrigin: "left center",
              display: "inline-block",
            }}
          >
            {remark}
          </p>

          {/* Best-score comparison note (red pen) */}
          {compare && (
            <div
              data-testid="quiz-compare"
              className="mt-3 flex items-center gap-2"
              style={{
                color: RED_PEN,
                fontFamily: HAND_FONT,
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              {compare.status === "first" && (
                <span style={{ transform: "rotate(-0.5deg)", display: "inline-block" }}>
                  First attempt — setting your benchmark.
                </span>
              )}
              {compare.status === "new-best" && (
                <span style={{ transform: "rotate(-0.5deg)", display: "inline-block" }}>
                  New best! <span style={{ fontWeight: 700 }}>+{compare.delta}</span> from your last best · Attempt #{compare.attempts}
                </span>
              )}
              {compare.status === "matched" && (
                <span style={{ transform: "rotate(-0.5deg)", display: "inline-block" }}>
                  = Matched your best · Attempt #{compare.attempts}
                </span>
              )}
              {compare.status === "below" && (
                <span style={{ transform: "rotate(-0.5deg)", display: "inline-block" }}>
                  Prev best: {compare.priorBest.bestCorrect}/{total} ({compare.priorBest.bestGrade}) · Attempt #{compare.attempts}
                </span>
              )}
            </div>
          )}

          {/* Signature line */}
          <div
            className="mt-5 flex items-center justify-between gap-3"
            style={{
              color: "#8a7348",
              fontFamily: "'Manrope', system-ui, sans-serif",
            }}
          >
            <span className="text-[11.5px]">
              Review your answers below ↓
            </span>
            <span
              style={{
                color: RED_PEN,
                fontFamily: HAND_FONT,
                fontWeight: 600,
                fontSize: "16px",
                transform: "rotate(-3deg)",
                display: "inline-block",
              }}
            >
              — Study AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Quiz View ---------------- */
const QuizView = ({ questions, answers, onAnswer, onReset, onRetry, title }) => {
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const correct = Object.entries(answers).filter(
    ([idx, ans]) => questions[Number(idx)].correctAnswer === ans
  ).length;
  const completed = total > 0 && answered === total;

  // Result popup state — auto-opens the moment the quiz transitions to complete.
  const [resultOpen, setResultOpen] = useState(false);
  const prevCompletedRef = useRef(false);

  useEffect(() => {
    if (completed && !prevCompletedRef.current) {
      // small delay so the last option's tick animation finishes first
      const t = setTimeout(() => setResultOpen(true), 350);
      prevCompletedRef.current = true;
      return () => clearTimeout(t);
    }
    if (!completed) prevCompletedRef.current = false;
  }, [completed]);

  // ESC closes the popup
  useEffect(() => {
    if (!resultOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setResultOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [resultOpen]);

  const handleRetryFromResult = () => {
    setResultOpen(false);
    onRetry?.();
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-32 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-700">
            <Zap className="h-3 w-3 text-amber-500" />
            Generated quiz
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-black">
            {title || "Quiz session"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {total} questions · Pick an option to reveal the explanation
          </p>
        </div>
        <button
          data-testid="reset-quiz"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
        >
          <Plus className="h-4 w-4 rotate-45" />
          Clear
        </button>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Progress:{" "}
            <span className="font-semibold text-black">
              {answered}/{total}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-[12px] w-[12px] text-zinc-700" />
            Score:{" "}
            <span className="font-semibold text-black tabular-nums">
              {correct}
            </span>
            <span className="text-zinc-400">/ {total} pts</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <MCQCard
            key={i}
            q={q}
            index={i}
            selected={answers[i]}
            onSelect={(opt) => onAnswer(i, opt)}
          />
        ))}
      </div>

      {/* Floating "View Result" pill — visible after completion if the popup was dismissed */}
      {completed && !resultOpen && (
        <button
          data-testid="view-result"
          onClick={() => setResultOpen(true)}
          className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-lg transition hover:-translate-y-0.5 sm:bottom-28 sm:right-6"
          style={{
            background: "linear-gradient(180deg, #fbf4de 0%, #eeddb6 100%)",
            borderColor: "#c7ad78",
            color: RED_PEN,
            fontFamily: HAND_FONT,
            fontWeight: 700,
            boxShadow: "0 10px 28px rgba(120,85,30,0.22)",
          }}
        >
          <Target className="h-[14px] w-[14px]" style={{ color: RED_PEN }} />
          View Result
        </button>
      )}

      {/* Result popup */}
      {resultOpen && (
        <div
          data-testid="result-modal"
          className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-4"
        >
          {/* Backdrop */}
          <div
            className="sa-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setResultOpen(false)}
          />

          {/* Paper */}
          <div
            className="sa-paper-in relative z-10 w-full max-w-[640px]"
          >
            <QuizResult
              correct={correct}
              total={total}
              onRetry={handleRetryFromResult}
              onClose={() => setResultOpen(false)}
              title={title}
            />
          </div>
        </div>
      )}
    </section>
  );
};

/* ---------------- MCQ Composer (upload-focused) ---------------- */
const MCQComposer = ({ onSubmitText, onUpload, sendOnEnter }) => {  const [text, setText] = useState("");
  const [complexity, setComplexity] = useState("apply");
  const [count, setCount] = useState(5);
  const [aiAutoCount, setAiAutoCount] = useState(false);
  const fileRef = useRef(null);
  const taRef = useRef(null);

  const handleInput = (e) => {
    setText(e.target.value);
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }
  };

  const buildPayload = () => ({
    text,
    complexity,
    count,
    aiAutoCount,
  });

  const handleSubmit = () => {
    if (text.trim().length === 0) return;
    onSubmitText(buildPayload());
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const handleFile = (file) => {
    if (!file) return;
    onUpload({
      file,
      complexity,
      count,
      aiAutoCount,
    });
  };

  const handleKey = (e) => {
    const isSendCombo = sendOnEnter
      ? e.key === "Enter" && !e.shiftKey
      : e.key === "Enter" && (e.metaKey || e.ctrlKey);
    if (isSendCombo) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="group relative rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-[0_12px_40px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_16px_50px_rgba(17,24,39,0.10),inset_0_1px_0_rgba(255,255,255,1)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 to-transparent opacity-70" />

        <div className="relative">
          <textarea
            data-testid="mcq-textarea"
            ref={taRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Paste text or upload a file to generate MCQs..."
            className="block max-h-[220px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-black placeholder:text-zinc-400 outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                data-testid="upload-button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black sm:gap-2 sm:px-3"
              >
                <Upload className="h-[15px] w-[15px]" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <ComplexityPicker value={complexity} onChange={setComplexity} />
              <CountStepper
                value={count}
                onChange={setCount}
                aiAuto={aiAutoCount}
                onToggleAiAuto={() => setAiAutoCount((v) => !v)}
              />
            </div>

            <button
              data-testid="generate-mcq"
              onClick={handleSubmit}
              disabled={text.trim().length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-all duration-200 sm:gap-2 sm:px-3.5",
                text.trim().length === 0
                  ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                  : "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] hover:bg-zinc-800 active:scale-[0.97]"
              )}
            >
              <span className="hidden sm:inline">Generate{aiAutoCount ? "" : ` ${count}`} MCQ{aiAutoCount || count !== 1 ? "s" : ""}</span>
              <span className="sm:hidden">{aiAutoCount ? "Gen" : count}</span>
              <ArrowUp className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">
        Study AI can make mistakes. Verify important information.
      </p>
    </div>
  );
};

/* ---------------- Draggable Composer Wrapper ---------------- */
const DraggableComposer = ({ children }) => {
  const [pos, setPos] = useState(null); // null means default centered at bottom
  const [isCollapsed, setIsCollapsed] = useState(false);
  const wrapperRef = useRef(null);
  
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Helper to keep composer within viewport boundaries
  const clampPosition = () => {
    if (wrapperRef.current && pos) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPos(prev => {
        if (!prev) return prev;
        const newX = Math.max(0, Math.min(window.innerWidth - rect.width, prev.x));
        const newY = Math.max(0, Math.min(window.innerHeight - rect.height, prev.y));
        return { x: newX, y: newY };
      });
    }
  };

  // Ensure box stays in tab on window resize
  useEffect(() => {
    const handleResize = () => clampPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pos]);

  const initDrag = (clientX, clientY) => {
    if (!wrapperRef.current) return;
    isDragging.current = true;
    dragStart.current = { x: clientX, y: clientY };
    
    // Switch from absolute center to fixed top-left if not moved yet
    if (!pos) {
      const rect = wrapperRef.current.getBoundingClientRect();
      posStart.current = { x: rect.left, y: rect.top, w: rect.width };
      setPos({ x: rect.left, y: rect.top, w: rect.width });
    } else {
      posStart.current = { ...pos };
    }
    
    setIsTransitioning(false);
  };

  const updateDrag = (clientX, clientY) => {
    if (!isDragging.current || !wrapperRef.current) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    let newX = posStart.current.x + dx;
    let newY = posStart.current.y + dy;
    
    // Use the captured width to properly clamp the right edge
    const boxWidth = posStart.current.w || rect.width;
    newX = Math.max(0, Math.min(window.innerWidth - boxWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));
    
    setPos({ x: newX, y: newY, w: boxWidth });
  };

  // --- Mouse Events ---
  const handleMouseDown = (e) => {
    initDrag(e.clientX, e.clientY);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    e.preventDefault(); // Prevent text selection
    updateDrag(e.clientX, e.clientY);
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // --- Touch Events (Mobile) ---
  const handleTouchStart = (e) => {
    initDrag(e.touches[0].clientX, e.touches[0].clientY);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };
  const handleTouchMove = (e) => {
    if (isDragging.current) e.preventDefault(); // Prevent scrolling while dragging
    updateDrag(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  const handleDoubleClick = () => {
    setIsTransitioning(true);
    setIsCollapsed(prev => !prev);
    // After animation expands the box, clamp it so it doesn't spill off-screen
    setTimeout(() => clampPosition(), 550);
  };

  return (
    <div 
      ref={wrapperRef}
      className={cn(
        "z-50 flex flex-col items-center pointer-events-none",
        pos ? "fixed left-0 top-0" : "absolute bottom-6 left-1/2 -translate-x-1/2 w-full",
        (!isDragging.current || isTransitioning) && "transition-[transform,max-width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      )}
      style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)`, width: `${pos.w}px` } : {}}
    >
      {/* Drag Handle & Unique Minimal Logo */}
      <div 
        className={cn(
          "relative z-20 shrink-0 flex cursor-grab active:cursor-grabbing items-center justify-center transition-all duration-500 pointer-events-auto",
          isCollapsed 
            ? "h-10 w-10 rounded-full bg-black text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] ring-2 ring-white/60 hover:scale-110 hover:bg-zinc-800" 
            : "mb-[-12px] h-6 w-14 rounded-full bg-white/95 text-zinc-400 shadow-sm border border-zinc-200/80 backdrop-blur-xl hover:bg-zinc-50 hover:text-black"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to move, Double-click to pack/unpack"
      >
        {isCollapsed ? <Wand2 className="h-5 w-5" /> : <Minus className="h-5 w-5 stroke-[3]" />}
      </div>

      {/* Content Wrapper */}
      <div className={cn(
        "relative z-30 w-full transition-all duration-500 origin-top ease-[cubic-bezier(0.23,1,0.32,1)] px-4 sm:px-6",
        isCollapsed ? "max-h-0 opacity-0 scale-90 pointer-events-none" : "max-h-[800px] opacity-100 scale-100 pointer-events-auto max-w-3xl"
      )}>
        <div className={cn("mx-auto w-full", isCollapsed ? "w-[100px]" : "w-full")}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Chat Composer (with model switcher + file upload) ---------------- */
const ChatComposer = ({ models, onSend, model, onModelChange, sendOnEnter, disabled }) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const taRef = useRef(null);
  const fileRef = useRef(null);

  const handleInput = (e) => {
    setText(e.target.value);
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }
  };

  const currentModel = models?.find((m) => m.id === model);
  // Default to true if not specified so we don't break fallback functionality
  const supportsVision = currentModel ? currentModel.isVision : true;

  const canSend =
    !disabled && (text.trim().length > 0 || files.length > 0);

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(text, files);
    setText("");
    setFiles([]);
    if (taRef.current) taRef.current.style.height = "auto";
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKey = (e) => {
    const isSendCombo = sendOnEnter
      ? e.key === "Enter" && !e.shiftKey
      : e.key === "Enter" && (e.metaKey || e.ctrlKey);
    if (isSendCombo) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    // Hard cap 4 attachments, total 20MB
    const MAX_FILES = 4;
    const MAX_BYTES = 50 * 1024 * 1024;
    const merged = [...files, ...picked].slice(0, MAX_FILES);
    const totalBytes = merged.reduce((s, f) => s + (f.size || 0), 0);
    if (totalBytes > MAX_BYTES) {
      alert("Attachments exceed 50MB total. Please pick smaller files.");
      return;
    }
    setFiles(merged);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="group relative rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-[0_12px_40px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_16px_50px_rgba(17,24,39,0.10),inset_0_1px_0_rgba(255,255,255,1)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 to-transparent opacity-70" />

        <div className="relative">
          {/* Attached file chips */}
          {files.length > 0 && (
            <div
              data-testid="chat-attachments"
              className="flex flex-wrap gap-1.5 px-2 pb-1 pt-1"
            >
              {files.map((f, i) => {
                const isImage = (f.type || "").startsWith("image/");
                return (
                  <div
                    key={`${f.name}-${i}`}
                    data-testid={`chat-attachment-${i}`}
                    className="group/chip inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-700 shadow-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-600">
                      {isImage ? (
                        <ImageIcon className="h-[12px] w-[12px]" />
                      ) : (
                        <FileText className="h-[12px] w-[12px]" />
                      )}
                    </span>
                    <span className="truncate font-medium" title={f.name}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-zinc-400">
                      {formatBytes(f.size || 0)}
                    </span>
                    <button
                      data-testid={`chat-attachment-remove-${i}`}
                      onClick={() => removeFile(i)}
                      className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <textarea
            data-testid="chat-textarea"
            ref={taRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Ask anything — attach an image or PDF to include context..."
            className="block max-h-[220px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-black placeholder:text-zinc-400 outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                data-testid="chat-attach"
                onClick={() => supportsVision && fileRef.current?.click()}
                disabled={!supportsVision}
                title={supportsVision ? "Attach image or PDF" : "This model does not support image or file attachments"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition",
                  supportsVision 
                    ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed opacity-60"
                )}
              >
                <Paperclip className="h-[14px] w-[14px]" />
                <span className="hidden sm:inline">Attach</span>
              </button>
              <ModelSwitcher models={models} value={model} onChange={onModelChange} />
            </div>

            <button
              data-testid="send-chat"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200",
                !canSend
                  ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                  : "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] hover:bg-zinc-800 active:scale-[0.97]"
              )}
            >
              <span>Send</span>
              <ArrowUp className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">
        Responses may be inaccurate. Verify important information.
      </p>
    </div>
  );
};

/* ---------------- Chat Messages ---------------- */
const DUMMY_ASSISTANT_REPLY = (userText, modelName) =>
  `Great question! Here's a quick take using ${modelName}:\n\nYou asked — "${userText.slice(
    0,
    120
  )}${userText.length > 120 ? "…" : ""}"\n\nLet me break it down into three parts:\n\n1. Core idea — the underlying concept and why it matters.\n2. A concrete example so it clicks intuitively.\n3. Common pitfalls to watch out for as you apply it.\n\nWant me to dive deeper on any of these, or try a worked example?`;

/* Extract a quiz array from whatever shape the backend returned.
 * Accepts: raw array, {questions: [...]}, {quiz: [...]}, {data: {questions: [...]}}, etc.
 * Returns an array of QuizQuestion-ish objects, or null if nothing looks like a quiz.
 */
const extractQuizQuestions = (payload) => {
  if (!payload) return null;
  const candidates = [
    payload,
    payload.questions,
    payload.quiz,
    payload.mcqs,
    payload.data?.questions,
    payload.data?.quiz,
    payload.result?.questions,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const looksLikeQuiz = c.every(
        (q) =>
          q &&
          typeof q === "object" &&
          typeof q.question === "string" &&
          Array.isArray(q.options)
      );
      if (looksLikeQuiz) return c;
    }
  }
  return null;
};

const extractAssistantText = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return (
    payload.text ||
    payload.message ||
    payload.response ||
    payload.answer ||
    payload.output ||
    ""
  );
};

/** Inline mini-quiz renderer used inside chat bubbles. */
const InlineQuizBubble = ({ questions, testId = "inline-quiz" }) => {
  const [answers, setAnswers] = useState({});
  const [open, setOpen] = useState({}); // expanded-explanation per index
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const correct = questions.reduce(
    (s, q, i) => s + (answers[i] === q.correctAnswer ? 1 : 0),
    0
  );

  const pick = (i, opt) => {
    if (answers[i] !== undefined) return;
    setAnswers((p) => ({ ...p, [i]: opt }));
    setOpen((p) => ({ ...p, [i]: true }));
  };

  return (
    <div data-testid={testId} className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-[12px] text-zinc-700">
        <ListChecks className="h-[14px] w-[14px] text-zinc-500" />
        <span className="font-semibold">
          {total} question{total === 1 ? "" : "s"} generated
        </span>
        <span className="text-zinc-400">·</span>
        <span>
          Answered{" "}
          <span className="font-semibold text-black tabular-nums">
            {answered}
          </span>
          /{total}
        </span>
        {answered > 0 && (
          <>
            <span className="text-zinc-400">·</span>
            <span>
              Correct{" "}
              <span className="font-semibold text-emerald-700 tabular-nums">
                {correct}
              </span>
              /{answered}
            </span>
          </>
        )}
      </div>

      {questions.map((q, i) => {
        const userPick = answers[i];
        const isAnswered = userPick !== undefined;
        const showExp = !!open[i];
        return (
          <div
            key={i}
            data-testid={`${testId}-q-${i}`}
            className="rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="mb-2 flex items-start gap-2">
              <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-md bg-black px-1.5 text-[11px] font-semibold text-white">
                Q{i + 1}
              </span>
              <h4 className="flex-1 text-[13.5px] font-semibold leading-snug text-black">
                {q.question}
              </h4>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(q.options || []).map((opt, oi) => {
                const isSelected = userPick === opt;
                const isCorrect = opt === q.correctAnswer;
                const showTick = isAnswered && isCorrect;
                const showCross = isAnswered && isSelected && !isCorrect;
                return (
                  <button
                    key={oi}
                    data-testid={`${testId}-q-${i}-opt-${oi}`}
                    disabled={isAnswered}
                    onClick={() => pick(i, opt)}
                    className={cn(
                      "group/opt flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12.5px] transition",
                      !isAnswered &&
                        "border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm",
                      isAnswered &&
                        !isSelected &&
                        !isCorrect &&
                        "border-zinc-200 bg-white opacity-60",
                      showTick && "border-emerald-500 bg-emerald-50/70",
                      showCross && "border-red-400 bg-red-50/70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px]",
                        showTick
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : showCross
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-zinc-300 bg-white"
                      )}
                    >
                      {showTick && (
                        <Check className="h-[10px] w-[10px]" strokeWidth={3} />
                      )}
                      {showCross && (
                        <X className="h-[10px] w-[10px]" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mr-1 font-semibold text-zinc-500">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
            {isAnswered && q.explanation && (
              <div className="mt-2">
                <button
                  data-testid={`${testId}-q-${i}-toggle`}
                  onClick={() => setOpen((p) => ({ ...p, [i]: !p[i] }))}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-zinc-600 hover:text-black"
                >
                  <Lightbulb className="h-[12px] w-[12px]" />
                  {showExp ? "Hide explanation" : "Show explanation"}
                  <ChevronDown
                    className={cn(
                      "h-[12px] w-[12px] transition-transform",
                      showExp && "rotate-180"
                    )}
                  />
                </button>
                {showExp && (
                  <p className="mt-1 rounded-md bg-amber-50/70 px-2.5 py-1.5 text-[12px] leading-relaxed text-amber-900 ring-1 ring-amber-200/70">
                    {q.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Error banner rendered inline in the chat stream. */
const ChatErrorBubble = ({ kind, message, onOpenSettings }) => (
  <div
    data-testid={`chat-error-${kind || "generic"}`}
    className="flex gap-3"
  >
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
      <AlertTriangle className="h-4 w-4" />
    </div>
    <div className="max-w-[88%] rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13.5px] leading-relaxed text-red-800 sm:max-w-[80%]">
      <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-red-600">
        {kind === "auth" ? "API key required" : "Request failed"}
      </div>
      <div>{message}</div>
      {kind === "auth" && onOpenSettings && (
        <button
          data-testid="chat-error-open-settings"
          onClick={onOpenSettings}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-red-700"
        >
          <KeyRound className="h-[12px] w-[12px]" />
          Open API Key settings
          <ExternalLink className="h-[11px] w-[11px]" />
        </button>
      )}
    </div>
  </div>
);

/* ---------- Image Lightbox (same-page overlay) ---------- */
const ImageLightbox = ({ src, alt, onClose }) => (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <button
      onClick={onClose}
      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      aria-label="Close"
    >
      <X className="h-5 w-5" />
    </button>
    <img
      src={src}
      alt={alt}
      className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

const ImageThumbnail = ({ src, alt }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative block overflow-hidden rounded-lg ring-1 ring-white/20 transition-all hover:ring-2 hover:ring-white/40 cursor-zoom-in"
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[200px] max-w-[200px] rounded-lg object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] text-white/90 truncate block">{alt}</span>
        </div>
      </button>
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
};

const ChatMessage = ({ role, content, modelName, modelProvider, files, quiz, onRegenerate }) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [unliked, setUnliked] = useState(false);
  
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setUnliked(false);
  };

  const handleUnlike = () => {
    setUnliked(!unliked);
    setLiked(false);
  };
  
  let displayContent = content || "";
  if (!isUser) {
    displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/g, "");
    displayContent = displayContent.replace(/<think>[\s\S]*$/, "");
    displayContent = displayContent.trim();
  }
  return (
    <div
      data-testid={`chat-message-${role}`}
      className={cn("flex gap-3", isUser ? "items-center justify-end" : "items-start justify-start")}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/10">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed sm:max-w-[80%]",
          isUser
            ? "bg-black text-white"
            : "border border-zinc-200 bg-white text-zinc-800 shadow-sm"
        )}
      >
        {!isUser && modelName && (
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            {modelProvider && (
              <ProviderIcon
                provider={modelProvider}
                className="h-3 w-3 text-black"
              />
            )}
            {modelName}
          </div>
        )}

        {/* Attached files — image thumbnails + non-image chips */}
        {isUser && Array.isArray(files) && files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => {
              const isImage = (f.mimeType || "").startsWith("image/");
              const previewUrl = f.previewUrl || f.dataUrl;

              if (isImage && previewUrl) {
                return (
                  <ImageThumbnail
                    key={`${f.name}-${i}`}
                    src={previewUrl}
                    alt={f.name}
                  />
                );
              }

              return (
                <div
                  key={`${f.name}-${i}`}
                  className="inline-flex max-w-[200px] items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11.5px] ring-1 ring-white/20"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/20">
                    {isImage ? (
                      <ImageIcon className="h-[11px] w-[11px]" />
                    ) : (
                      <FileText className="h-[11px] w-[11px]" />
                    )}
                  </span>
                  <span className="truncate" title={f.name}>
                    {f.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {displayContent && (
          isUser ? (
            <div className="whitespace-pre-wrap">{displayContent}</div>
          ) : (
            <div className="sa-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            </div>
          )
        )}

        {/* Inline quiz (for assistant messages) */}
        {!isUser && Array.isArray(quiz) && quiz.length > 0 && (
          <div className={cn(content && "mt-3")}>
            <InlineQuizBubble questions={quiz} testId="assistant-inline-quiz" />
          </div>
        )}

        {!isUser && (
          <div className="mt-3 flex items-center gap-1 border-t border-zinc-100 pt-2 text-zinc-400">
            <button onClick={handleCopy} title="Copy" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
              {copied ? <Check className="h-[13px] w-[13px] text-emerald-600" /> : <Copy className="h-[13px] w-[13px]" />}
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} title="Regenerate" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
                <RefreshCw className="h-[13px] w-[13px]" />
              </button>
            )}
            <button onClick={handleLike} title="Good response" className={cn("flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 transition-colors", liked ? "text-emerald-600 bg-emerald-50" : "hover:text-zinc-700")}>
              <ThumbsUp className="h-[13px] w-[13px]" />
            </button>
            <button onClick={handleUnlike} title="Bad response" className={cn("flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 transition-colors", unliked ? "text-red-600 bg-red-50" : "hover:text-zinc-700")}>
              <ThumbsDown className="h-[13px] w-[13px]" />
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};

const TypingIndicator = ({ icon, label = "Thinking", modelProvider }) => (
  <div data-testid="typing-indicator" className="flex gap-3">
    {/* Avatar with sonar pulse rings */}
    <div className="relative h-8 w-8 shrink-0">
      <span className="sa-ping-ring" />
      <span className="sa-ping-ring delay-1" />
      <div className="sa-breathe relative flex h-8 w-8 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/10">
        {icon || <Bot className="h-4 w-4" />}
      </div>
    </div>

    {/* Bubble: EQ bars + shimmering "Thinking" text */}
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex h-[18px] items-end gap-[3px]">
        <span className="sa-eq-bar" />
        <span className="sa-eq-bar" />
        <span className="sa-eq-bar" />
        <span className="sa-eq-bar" />
        <span className="sa-eq-bar" />
      </div>
      <span className="sa-shimmer-text text-[13px]">{label}</span>
    </div>
  </div>
);

/* ---------------- Hero (per section) ---------------- */
const CHAT_HEADLINES = [
  "What shall we explore today?",
  "Where shall we begin?",
  "What's on your mind?",
  "Got a question? I've got time.",
  "Ready when you are.",
  "Let's figure something out.",
  "What are you curious about?",
  "Pick a topic — I'll dig in.",
  "Tell me what you're learning.",
  "Got a problem to crack?",
  "What's puzzling you today?",
  "Let's chase a thought.",
  "Ask me anything.",
  "What's the spark?",
  "Throw an idea my way.",
];

const ChatHero = ({ onPick }) => {
  // Pick a fresh headline on client mount to avoid SSR hydration mismatch
  const [headline, setHeadline] = useState(CHAT_HEADLINES[0]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setHeadline(CHAT_HEADLINES[Math.floor(Math.random() * CHAT_HEADLINES.length)]);
    setMounted(true);
  }, []);
  const prompts = [
    { text: "Explain quantum entanglement simply", icon: Sparkles },
    { text: "Help me draft an email to my professor", icon: FileText },
    { text: "Debug this JavaScript closure issue", icon: Code },
    { text: "Summarize the key causes of WWII", icon: BookOpen },
  ];
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-6 text-center sm:px-6 sm:py-10">
      {/* Animated logo with pulse */}
      <div className={cn("relative mb-5 transition-all duration-700 sm:mb-7", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
        <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-zinc-200/40 via-transparent to-zinc-200/40 blur-2xl" />
        <QuasarLogo className="relative mx-auto h-11 w-11 text-black drop-shadow-lg sm:h-14 sm:w-14" />
      </div>

      {/* Headline with gradient shimmer */}
      <h1
        className={cn(
          "mx-auto max-w-2xl text-[24px] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-[44px]",
          "bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 bg-[length:200%_auto] bg-clip-text text-transparent",
          mounted ? "animate-[sa-hero-gradient_4s_ease-in-out_infinite]" : ""
        )}
        style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
      >
        {headline}
      </h1>

      {/* Subtitle */}
      <p className={cn(
        "mt-2 text-[13px] text-zinc-500 transition-all duration-700 delay-200 sm:mt-3 sm:text-[14px]",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        Pick a prompt below, or type your own
      </p>

      {/* Prompt pills — two-column grid on mobile, flex-wrap on desktop */}
      <div className={cn(
        "mt-6 grid w-full grid-cols-1 gap-2 xs:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap sm:justify-center sm:gap-2.5",
        "transition-all duration-700 delay-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {prompts.map(({ text: p, icon: Icon }) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-[12.5px] text-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:text-black hover:shadow-sm sm:rounded-full sm:px-4 sm:py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-black group-hover:text-white sm:h-5 sm:w-5 sm:rounded-md">
              <Icon className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1 sm:flex-initial">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const MCQ_HEADLINES = [
  "What shall we quiz on today?",
  "Pick a topic — I'll bring the questions.",
  "Got something to study? Drop it in.",
  "Turn study material into mastery.",
  "Test what you know.",
  "What are you preparing for?",
  "Let's build your next quiz.",
  "Ready for a knowledge check?",
  "Throw a topic my way.",
  "Where shall we sharpen up?",
];

const MCQHero = () => {
  // Pick a fresh headline on client mount to avoid SSR hydration mismatch
  const [headline, setHeadline] = useState(MCQ_HEADLINES[0]);
  useEffect(() => {
    setHeadline(MCQ_HEADLINES[Math.floor(Math.random() * MCQ_HEADLINES.length)]);
  }, []);
  const suggestions = [
    "Quiz me on photosynthesis",
    "Python OOP fundamentals",
    "World War II timeline",
    "Linear algebra basics",
  ];
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 text-center sm:px-6">
      <h1 className="mx-auto max-w-2xl text-[28px] font-semibold leading-[1.15] tracking-tight text-black sm:text-4xl md:text-5xl">
        {headline}
      </h1>
      <div className="mt-8 flex flex-wrap justify-center gap-2 md:mt-10">
        {suggestions.map((s) => (
          <button
            key={s}
            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[12.5px] text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Persistence helpers (localStorage) ---------------- */
const STORAGE_KEY = "sa.recents.v1";

const loadRecents = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveRecents = (chats, mcq) => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chats, mcq })
    );
  } catch {
    /* ignore quota / privacy errors */
  }
};

const truncateTitle = (text, max = 50) => {
  const t = String(text || "").trim();
  if (!t) return "New conversation";
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
};

/* ---------------- Root ---------------- */
export default function StudyAssistant() {
  const router = useRouter();
  // Auth state
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch(buildUrl("/api/auth/session"))
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setAuthUser(data.user);
        } else {
          // Not logged in — handle guest mode or keep authUser null
          setAuthUser(null);
        }
      })
      .catch(() => {
        setAuthUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/auth/signout";
  };

  // Default sidebar: always start true for SSR consistency, then adjust on mount.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setSidebarOpen(false);
    }
  }, []);
  const [section, setSection] = useState("chat"); // 'chat' | 'mcq'
  const [activeId, setActiveId] = useState(null);

  // Settings (persisted) — start with defaults for SSR, hydrate on mount
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const saved = loadSettings();
    if (saved) setSettings(saved);
  }, []);
  // Auto-fill profile from Google Auth on first login
  useEffect(() => {
    if (authUser) {
      setSettings((prev) => {
        const updated = { ...prev };
        // Only auto-fill if user hasn't set a custom name
        if (!updated.displayName || updated.displayName === DEFAULT_SETTINGS.displayName) {
          updated.displayName = authUser.name || "";
        }
        if (!updated.email) {
          updated.email = authUser.email || "";
        }
        if (!updated.image) {
          updated.image = authUser.image || "";
        }
        return updated;
      });
    }
  }, [authUser]);
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // API Keys (from database)
  const [apiKeys, setApiKeys] = useState([]);
  
  const refreshApiKeys = async () => {
    try {
      const r = await fetch(buildUrl("/api/user/api-settings"));
      const data = await r.json();
      if (!data.error) {
        setApiKeys(data.apiKeys || []);
      }
    } catch {}
  };

  const refreshModels = async () => {
    try {
      const r = await fetch(buildUrl("/api/models"));
      const data = await r.json();
      if (data.models && data.models.length > 0) {
        setModels(data.models);
      } else {
        setModels(DEFAULT_MODELS);
      }
    } catch {
      setModels(DEFAULT_MODELS);
    }
  };

  useEffect(() => {
    refreshApiKeys();
    refreshModels();
  }, []);

  const handleSaveApiSettings = async (next) => {
    const res = await fetch(buildUrl("/api/user/api-settings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await refreshApiKeys();
    await refreshModels();
  };

  const handleToggleActiveKey = async (id) => {
    try {
      await fetch(buildUrl("/api/user/api-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await refreshApiKeys();
      await refreshModels();
    } catch {}
  };

  const handleDeleteKey = async (id) => {
    try {
      await fetch(buildUrl(`/api/user/api-settings?id=${id}`), {
        method: "DELETE",
      });
      await refreshApiKeys();
      await refreshModels();
    } catch {}
  };

  // Recent lists — start empty for SSR consistency, load from server on mount.
  const [recentChats, setRecentChats] = useState([]);
  const [recentMCQ, setRecentMCQ] = useState([]);

  // Date formatting helper
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const isYesterday = d.toDateString() === yest.toDateString();
    if (sameDay) return "Today";
    if (isYesterday) return "Yesterday";
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Load conversation list from server
  const refreshHistory = async () => {
    const [chatItems, mcqItems] = await Promise.all([
      apiListConversations("chat"),
      apiListConversations("mcq"),
    ]);
    const mapItems = (items) =>
      items.map((c) => ({
        id: c.id,
        title: c.title || "Untitled",
        date: formatDate(c.updatedAt || c.createdAt),
        _createdAt: c.createdAt,
      }));
    setRecentChats(mapItems(chatItems));
    setRecentMCQ(mapItems(mcqItems));
  };

  // Load from server on mount
  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MCQ state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeQuizTitle, setActiveQuizTitle] = useState("");
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState(null); // { kind, message }

  // Chat state
  const [messages, setMessages] = useState([]); // {role, content, model, provider}
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState("");
  
  // Dynamic models state
  const [models, setModels] = useState(DEFAULT_MODELS);
  const chatScrollRef = useRef(null);

  const currentModel = model ? models.find((m) => m.id === model) : null;

  // Hydrate model from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = loadSettings();
    if (saved.defaultModelId) {
      setModel(saved.defaultModelId);
    }
  }, []);

  // Keep selected model in sync with settings.defaultModelId when settings change
  // (only if the user hasn't started chatting in this session)
  useEffect(() => {
    if (messages.length === 0 && !isTyping && settings.defaultModelId) {
      setModel(settings.defaultModelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.defaultModelId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* --- MCQ handlers ---
   * startQuiz(payload) wires the MCQ composer to the backend's
   * `POST /api/generate-quiz` endpoint. Payload shapes:
   *   { text, complexity, count, aiAutoCount }
   *   { file, complexity, count, aiAutoCount }
   * We pass the generation hints (complexity/count/aiAutoCount) through as
   * structured text appended to the prompt so existing `/api/generate-quiz`
   * contracts don't need to change.
   */
  const startQuiz = async (payload) => {
    const p = payload && typeof payload === "object" ? payload : {};
    const modelId = currentModel.id;

    // Derive prompt text + file list
    const userText = typeof p.text === "string" ? p.text.trim() : "";
    const theFile = p.file || null;

    // Friendly sidebar title
    let title = "New MCQ session";
    if (userText) title = truncateTitle(userText);
    else if (theFile && theFile.name) title = `Quiz from ${theFile.name}`;
    setActiveQuizTitle(title);

    // Auto-create a sidebar entry for this new MCQ session
    if (!activeId) {
      const newId = `m_${Date.now()}`;
      setRecentMCQ((prev) => [
        { id: newId, title, date: "Just now" },
        ...prev,
      ]);
      setActiveId(newId);
    }

    // Compose prompt with generation hints
    const hints = [];
    if (p.complexity) {
      const complexityPrompts = {
        recall: "Focus on testing basic factual recall and definitions.",
        apply: "Focus on testing the practical application of concepts using scenarios or worked examples.",
        analyze: "Focus on analytical thinking, requiring the user to break down information and compare ideas.",
        mastery: "Focus on expert-level mastery, requiring multi-step reasoning, critical synthesis, and complex problem solving."
      };
      hints.push(`Complexity rules: ${complexityPrompts[p.complexity] || p.complexity}`);
    }
    if (p.aiAutoCount) hints.push("Pick the optimal number of questions yourself.");
    else if (p.count) hints.push(`Generate exactly ${p.count} MCQs.`);
    const hintLine = hints.length > 0 ? `\n\n[${hints.join(" ")}]` : "";
    const promptText = (userText || (theFile ? `Generate an MCQ quiz from the attached file "${theFile.name}".` : "")) + hintLine;

    setQuestions([]);
    setAnswers({});
    setMcqError(null);
    setMcqLoading(true);

    requestAnimationFrame(() => {
      document
        .getElementById("quiz-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const fileParts = theFile ? await filesToInlineParts([theFile]) : [];
      const { status, ok, data } = await postGenerateQuiz({
        text: promptText,
        files: fileParts,
        modelId,
      });

      if (status === 401) {
        setMcqError({
          kind: "auth",
          message:
            "Your NanoGPT API key is missing or invalid. Please add a valid key in Settings → API Key.",
        });
        setMcqLoading(false);
        return;
      }

      if (!ok) {
        const backendMsg =
          (data && (data.error || data.message || data.detail)) ||
          `Request failed with status ${status}.`;
        setMcqError({ kind: "generic", message: String(backendMsg) });
        setMcqLoading(false);
        return;
      }

      const quiz = extractQuizQuestions(data);
      if (!quiz || quiz.length === 0) {
        setMcqError({
          kind: "generic",
          message:
            "The backend did not return any questions. Try rephrasing or use a richer source.",
        });
        setMcqLoading(false);
        return;
      }

      if (quiz && quiz.length > 0 && data.id) {
        setMcqLoading(false);
        router.push(`/mcq/${data.id}`);
        return;
      }

      setMcqError({
        kind: "generic",
        message: "The backend generated a quiz but did not return a valid ID to navigate to."
      });
      setMcqLoading(false);
    } catch (err) {
      setMcqError({
        kind: "generic",
        message:
          "Couldn't reach the quiz server. Check that your backend is running at /api/generate-quiz.",
      });
      setMcqLoading(false);
    }
  };
  const handleAnswer = (i, opt) => {
    if (answers[i] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [i]: opt }));
  };
  const handleResetQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setActiveQuizTitle("");
    setActiveId(null);
    setMcqError(null);
    setMcqLoading(false);
  };

  // Retake the same quiz — keep questions, just clear answers.
  const handleRetryQuiz = () => {
    setAnswers({});
    setMcqError(null);
    requestAnimationFrame(() => {
      document
        .getElementById("quiz-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  /* --- Chat handlers ---
   * Signature: handleSend(text, filesArray)
   * Wires to `POST /api/chat` with SSE streaming for real-time responses.
   * Creates a server-side Conversation on first message, saves all messages to DB.
   */
  const handleSend = async (text, filesArray) => {
    const textStr = (text || "").toString();
    const incomingFiles = Array.isArray(filesArray) ? filesArray : [];
    if (textStr.trim().length === 0 && incomingFiles.length === 0) return;

    // Create or reuse server-side conversation
    let convId = activeId;
    if (!convId) {
      const title =
        truncateTitle(textStr) ||
        (incomingFiles[0] ? `Chat about ${incomingFiles[0].name}` : "New chat");
      const conv = await apiCreateConversation(title, "chat");
      if (conv && conv.id) {
        convId = conv.id;
        setActiveId(convId);
        setRecentChats((prev) => [
          { id: convId, title, date: "Just now" },
          ...prev,
        ]);
      } else {
        // Fallback to local-only if server fails
        convId = `c_${Date.now()}`;
        setActiveId(convId);
        setRecentChats((prev) => [
          { id: convId, title: truncateTitle(textStr) || "New chat", date: "Just now" },
          ...prev,
        ]);
      }
    }

    // Build file metadata for the rendered user bubble (with preview URLs for images)
    const fileMeta = await Promise.all(
      incomingFiles.map(async (f) => {
        const meta = {
          name: f.name,
          size: f.size,
          mimeType: f.type || "application/octet-stream",
        };
        // Generate data URL for image preview
        if (f.type && f.type.startsWith("image/")) {
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(f);
            });
            meta.previewUrl = dataUrl;
          } catch {}
        }
        return meta;
      })
    );

    const userMsg = {
      role: "user",
      content: textStr,
      files: fileMeta,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    const modelName = currentModel.name;
    const modelProvider = currentModel.provider;
    const modelId = currentModel.id;

    // Save user message to server (fire-and-forget)
    apiSaveMessage(convId, {
      role: "user",
      content: textStr,
      files: fileMeta.length > 0 ? fileMeta : undefined,
    });

    try {
      // Convert File objects → Gemini inlineData parts
      const fileParts = await filesToInlineParts(incomingFiles);

      // Send chat history for context-aware conversation
      const chatHistoryForApi = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content || "" }));

      const res = await fetch(buildUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textStr,
          files: fileParts,
          modelId,
          messages: chatHistoryForApi,
        }),
      });

      if (res.status === 401) {
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            kind: "auth",
            content:
              "Your NanoGPT API key is missing or invalid. Please add a valid key in Settings → API Key.",
          },
        ]);
        setIsTyping(false);
        return;
      }

      if (!res.ok) {
        let errMsg = `Request failed with status ${res.status}.`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        setMessages((prev) => [
          ...prev,
          { role: "error", kind: "generic", content: String(errMsg) },
        ]);
        setIsTyping(false);
        return;
      }

      // --- Streaming SSE response ---
      const assistantIdx = { current: -1 };
      let fullAssistantContent = "";
      let streamUsage = null; // Track usage from SSE chunks
      setMessages((prev) => {
        assistantIdx.current = prev.length;
        return [
          ...prev,
          {
            role: "assistant",
            content: "",
            model: modelName,
            provider: modelProvider,
          },
        ];
      });
      setIsTyping(false);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullAssistantContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = assistantIdx.current;
                  if (idx >= 0 && updated[idx]) {
                    updated[idx] = {
                      ...updated[idx],
                      content: updated[idx].content + delta,
                    };
                  }
                  return updated;
                });
              }
              // Capture usage data from chunks (API sends it in final chunk)
              if (chunk.usage) {
                streamUsage = chunk.usage;
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Record token usage
      if (streamUsage) {
        addTokenEntry(
          streamUsage.prompt_tokens || 0,
          streamUsage.completion_tokens || 0,
          modelName
        );
      } else if (fullAssistantContent) {
        // Estimate: ~4 chars per token (rough approximation)
        const estInput = Math.round(textStr.length / 4);
        const estOutput = Math.round(fullAssistantContent.length / 4);
        addTokenEntry(estInput, estOutput, modelName);
      }

      // Save the complete assistant response to server
      if (fullAssistantContent) {
        apiSaveMessage(convId, {
          role: "assistant",
          content: fullAssistantContent,
          model: modelName,
          provider: modelProvider,
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          kind: "generic",
          content:
            "Couldn't reach the chat server. Check that your backend is running and reachable.",
        },
      ]);
      setIsTyping(false);
    }
  };
  const handleRegenerate = async () => {
    if (isTyping || messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant" && lastMsg.role !== "error") return;
    
    const updatedMessages = messages.slice(0, -1);
    const lastUserMsg = [...updatedMessages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;

    setMessages(updatedMessages);
    setIsTyping(true);

    const chatHistory = updatedMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    
    const textStr = lastUserMsg.content;
    const payloadFiles = lastUserMsg.files || [];
    const currentModel = models.find((m) => m.id === model) || models[0];
    const modelName = currentModel.name;
    const modelProvider = currentModel.provider;

    try {
      const res = await fetch(buildUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textStr,
          files: payloadFiles,
          modelId: currentModel.id,
          messages: chatHistory,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", model: modelName, provider: modelProvider },
      ]);
      assistantIdx.current = updatedMessages.length;

      let fullAssistantContent = "";
      let streamUsage = null;
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.replace("data: ", "").trim();
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullAssistantContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const idx = assistantIdx.current;
                  if (idx >= 0 && updated[idx]) {
                    updated[idx] = { ...updated[idx], content: updated[idx].content + delta };
                  }
                  return updated;
                });
              }
              if (chunk.usage) streamUsage = chunk.usage;
            } catch {}
          }
        }
      }

      if (streamUsage) {
        addTokenEntry(streamUsage.prompt_tokens || 0, streamUsage.completion_tokens || 0, modelName);
      } else if (fullAssistantContent) {
        addTokenEntry(Math.round(textStr.length / 4), Math.round(fullAssistantContent.length / 4), modelName);
      }

      if (fullAssistantContent && activeId) {
        apiSaveMessage(activeId, {
          role: "assistant",
          content: fullAssistantContent,
          model: modelName,
          provider: modelProvider,
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", kind: "generic", content: "Couldn't reach the chat server." },
      ]);
    }
    setIsTyping(false);
  };

  const handleResetChat = () => {
    setMessages([]);
    setIsTyping(false);
    setActiveId(null);
  };

  /* --- Sidebar events --- */
  // On small screens, auto-close the drawer after the user picks an item or
  // hits the section / new buttons so the content area is immediately visible.
  const isMobile = () =>
    typeof window !== "undefined" && window.innerWidth < 640;

  const handleSectionChange = (s) => {
    setSection(s);
    setActiveId(null);
  };
  const handleNew = () => {
    if (section === "chat") handleResetChat();
    else handleResetQuiz();
    if (isMobile()) setSidebarOpen(false);
  };
  const handleSelect = async (id) => {
    setActiveId(id);
    if (section === "chat") {
      // Load conversation messages from server
      setMessages([]);
      setIsTyping(false);
      const conv = await apiLoadConversation(id);
      if (conv && Array.isArray(conv.messages)) {
        const loaded = conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
          model: m.model || undefined,
          provider: m.provider || undefined,
          files: m.files ? JSON.parse(m.files) : undefined,
        }));
        setMessages(loaded);
      }
    } else {
      router.push(`/mcq/${id}`);
    }
    if (isMobile()) setSidebarOpen(false);
  };

  // Delete a recent item (chat or MCQ depending on section).
  // If we're deleting the currently-open one, also clear its main-pane state.
  const handleDelete = async (id) => {
    if (section === "chat") {
      await apiDeleteConversation(id);
      setRecentChats((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) handleResetChat();
    } else {
      // Quizzes should have their own delete API, for now we will just hide them from UI if we can't delete
      // To properly delete quizzes: fetch(`/api/quiz/${id}`, { method: "DELETE" })
      setRecentMCQ((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) handleResetQuiz();
    }
  };

  /* --- Settings handlers --- */
  const handleSaveSettings = (next) => {
    setSettings(next);
  };
  const handleClearAllChats = async () => {
    try {
      await fetch(buildUrl("/api/conversations?kind=chat"), { method: "DELETE" });
    } catch {}
    setRecentChats([]);
    handleResetChat();
  };
  const handleClearAllMCQ = async () => {
    try {
      await fetch(buildUrl("/api/conversations?kind=mcq"), { method: "DELETE" });
    } catch {}
    setRecentMCQ([]);
    handleResetQuiz();
  };
  const handleResetAll = async () => {
    try {
      await fetch(buildUrl("/api/conversations"), { method: "DELETE" });
    } catch {}
    resetTokenUsage();
    setSettings(DEFAULT_SETTINGS);
    setRecentChats([]);
    setRecentMCQ([]);
    handleResetChat();
    handleResetQuiz();
    setModel(DEFAULT_SETTINGS.defaultModelId);
  };

  const hasChat = messages.length > 0 || isTyping;
  const hasQuiz = questions.length > 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-black antialiased">
      {/* Subtle dotted texture */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(17,24,39,1) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="relative flex h-screen w-full">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          section={section}
          onSectionChange={handleSectionChange}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          recentChats={recentChats}
          recentMCQ={recentMCQ}
          onDelete={handleDelete}
          displayName={settings.displayName}
          onOpenSettings={() => setSettingsOpen(true)}
          user={authUser}
          onLogout={handleLogout}
        />

        <main className="relative flex h-screen min-w-0 flex-1 flex-col">
          {/* Floating Chat / MCQ switcher — no full-width header so it won't clash with browser chrome */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center sm:top-4">
            <div className="pointer-events-auto">
              <SectionTabs section={section} onChange={handleSectionChange} />
            </div>
          </div>

          {/* Mobile-only sidebar trigger — shown when drawer is closed on small screens */}
          {!sidebarOpen && (
            <button
              data-testid="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-black sm:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          )}

          {/* Scroll area */}
          <div
            ref={chatScrollRef}
            className="relative flex flex-1 flex-col overflow-y-auto"
          >
            {section === "chat" ? (
              <>
                {!hasChat && (
                  <div className="flex flex-1 items-center justify-center px-4 py-8">
                    <ChatHero onPick={handleSend} />
                  </div>
                )}
                {hasChat && (
                  <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-48 pt-20 sm:px-6">
                    {messages.map((m, i) =>
                      m.role === "error" ? (
                        <ChatErrorBubble
                          key={i}
                          kind={m.kind}
                          message={m.content}
                          onOpenSettings={() => setSettingsOpen(true)}
                        />
                      ) : (
                        <ChatMessage
                          key={i}
                          role={m.role}
                          content={m.content}
                          modelName={m.model}
                          modelProvider={m.provider}
                          files={m.files}
                          quiz={m.quiz}
                          onRegenerate={i === messages.length - 1 ? handleRegenerate : undefined}
                        />
                      )
                    )}
                    {isTyping && (
                      <TypingIndicator modelProvider={currentModel.provider} />
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {!hasQuiz && !mcqLoading && !mcqError && (
                  <div className="flex flex-1 items-center justify-center px-4 py-8">
                    <MCQHero />
                  </div>
                )}
                <div id="quiz-anchor" />
                {mcqLoading && (
                  <div
                    data-testid="mcq-loading"
                    className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-8 sm:px-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <div className="text-center">
                      <div className="text-[14px] font-semibold text-black">
                        Generating your quiz...
                      </div>
                      <div className="mt-0.5 text-[12px] text-zinc-500">
                        Sending to {currentModel.name} — this usually takes a
                        few seconds.
                      </div>
                    </div>
                  </div>
                )}
                {!mcqLoading && mcqError && (
                  <div
                    data-testid="mcq-error"
                    className="mx-auto w-full max-w-3xl px-4 pt-24 sm:px-6"
                  >
                    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                          {mcqError.kind === "auth"
                            ? "API key required"
                            : "Couldn't generate quiz"}
                        </div>
                        <p className="mt-0.5 text-[13.5px] leading-relaxed text-red-800">
                          {mcqError.message}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {mcqError.kind === "auth" && (
                            <button
                              data-testid="mcq-error-open-settings"
                              onClick={() => setSettingsOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-red-700"
                            >
                              <KeyRound className="h-[12px] w-[12px]" />
                              Open API Key settings
                            </button>
                          )}
                          <button
                            data-testid="mcq-error-dismiss"
                            onClick={() => setMcqError(null)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Draggable Composer */}
          <DraggableComposer>
            {section === "chat" ? (
              <ChatComposer
                models={models}
                onSend={handleSend}
                model={model}
                onModelChange={setModel}
                sendOnEnter={settings.sendOnEnter}
                disabled={isTyping}
              />
            ) : (
              <MCQComposer
                onSubmitText={startQuiz}
                onUpload={startQuiz}
                sendOnEnter={settings.sendOnEnter}
              />
            )}
          </DraggableComposer>
        </main>
      </div>

      {/* Settings modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onClearChats={handleClearAllChats}
        onClearMCQ={handleClearAllMCQ}
        onResetAll={handleResetAll}
        apiKeys={apiKeys}
        onSaveApiSettings={handleSaveApiSettings}
        onToggleActiveKey={handleToggleActiveKey}
        onDeleteKey={handleDeleteKey}
        models={models}
        authUser={authUser}
      />
    </div>
  );
}
