import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { MathMarkdown } from "@/components/ui/MathMarkdown";
import { useQuizStream } from "@/hooks/useQuizStream";
import PageRangeSelector from "@/components/PageRangeSelector";
import SetupForm from "@/components/test/SetupForm";
import { MCQCardUI } from "@/components/quiz/MCQCardUI";
import ExamModeView from "@/components/quiz/ExamModeView";
import AnnouncementsBell from "@/components/AnnouncementsBell";
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
  Key,
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
  Clock,
  Share2,
  LogIn,
  Download,
  TrendingUp,
  Activity,
  Flame,
  Zap as ZapIcon,
  PieChart,
} from "lucide-react";

/* Study Buddy Logo — uses the new brand image */
const QuasarLogo = ({ className = "h-8 w-8" }) => (
  <img src="/study-buddy-logo.svg" alt="Study Buddy" className={className} style={{ objectFit: "contain" }} />
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

The MCQ composer collects generation parameters and forwards them to the
backend on submit:

  {
    text:          string,        // the user's pasted material (or filename)
    complexity:    "recall" | "apply" | "analyze" | "mastery",
  }

The AI always decides the optimal number of questions based on the source
material depth. Frontend's job is purely to collect & forward the complexity
param — the backend is the source of truth for what gets generated.
======================================================================= */

const ComplexityPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const current = COMPLEXITY_LEVELS.find((l) => l.id === value) || COMPLEXITY_LEVELS[0];
  const CurrentIcon = current.icon;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 640);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (ref.current) setTriggerRect(ref.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="complexity-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Complexity: ${current.label}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1.5 py-1.5 text-[13px] font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 sm:gap-2 sm:px-3"
      >
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-black text-white ring-1 ring-black/10 sm:h-5 sm:w-5">
          <CurrentIcon className="h-3 w-3" />
        </span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          className={cn(
            "h-[12px] w-[12px] text-zinc-500 transition-transform sm:h-[14px] sm:w-[14px]",
            open && "rotate-180"
          )}
        />
      </button>

      {open && mounted && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            ref={dropdownRef}
            data-testid="complexity-dropdown"
            className="fixed z-[101] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl sm:shadow-[0_12px_40px_rgba(17,24,39,0.12)]"
            style={
              isMobile || !triggerRect
                ? {
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(92vw, 300px)",
                  }
                : {
                    left: triggerRect.left,
                    top: triggerRect.top - 8,
                    width: 300,
                    transform: "translateY(-100%)",
                  }
            }
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
        </>,
        document.body
      )}
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

/** Normalize a question's options field — handles cases where options is a JSON string from DB. */
const normalizeQuestion = (q) => {
  if (!q || typeof q !== "object") return q;
  if (Array.isArray(q.options)) return q;
  if (typeof q.options === "string") {
    try {
      const parsed = JSON.parse(q.options);
      return { ...q, options: Array.isArray(parsed) ? parsed : [] };
    } catch {
      return { ...q, options: [] };
    }
  }
  return { ...q, options: [] };
};
const normalizeQuestions = (arr) => (Array.isArray(arr) ? arr.map(normalizeQuestion) : []);

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

/**
 * Compress an image file to JPEG using canvas.
 * - Resizes to max 1920px on longest side
 * - Converts to JPEG, iteratively reducing quality until ≤ 2MB
 * Returns { base64, mimeType } where base64 has NO data: prefix.
 */
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    // Skip non-image files
    if (!file.type || !file.type.startsWith("image/")) {
      fileToBase64(file).then(data => resolve({ base64: data, mimeType: file.type })).catch(reject);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_DIM = 1920;
      const MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap on output
      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively reduce quality until output ≤ 2 MB
      let quality = 0.80;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      while (dataUrl.length > (MAX_BYTES * 4) / 3 + 100 && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      // If still too large, scale down resolution further
      if (dataUrl.length > (MAX_BYTES * 4) / 3 + 100) {
        const scale = 0.6;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      }

      // Extract raw base64
      const commaIdx = dataUrl.indexOf(",");
      const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

      resolve({ base64, mimeType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: return original file as base64
      fileToBase64(file).then(data => resolve({ base64: data, mimeType: file.type })).catch(reject);
    };

    img.src = url;
  });

/** Convert an array of File objects → Gemini-style `inlineData` parts (with image compression). */
const filesToInlineParts = async (files) => {
  if (!files || files.length === 0) return [];
  const parts = await Promise.all(
    files.map(async (f) => {
      if (f.type && f.type.startsWith("image/")) {
        // Compress images to JPEG
        const { base64, mimeType } = await compressImage(f);
        return { inlineData: { data: base64, mimeType } };
      }
      // Non-image files (PDF etc) — keep as-is
      return {
        inlineData: {
          data: await fileToBase64(f),
          mimeType: f.type || "application/octet-stream",
        },
      };
    })
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

// Image generation models available on NanoGPT (text-to-image only)
const IMAGE_MODELS = [
  { id: "gpt-image-2", name: "GPT Image 2", provider: "OpenAI", description: "High-fidelity text-to-image", resolutions: ["1024x1024", "2048x2048"], icon: "/icons/chatgpt.png" },
  { id: "nano-banana-pro-ultra", name: "Nano Banana Pro Ultra", provider: "Google", description: "Ultra quality, up to 8K", resolutions: ["4096x4096", "8192x8192"], icon: "/icons/gemini.png" },
  { id: "nano-banana-pro", name: "Nano Banana Pro", provider: "Google", description: "Pro quality, up to 4K", resolutions: ["1024x1024", "2048x2048", "4096x4096"], icon: "/icons/gemini.png" },
  { id: "nano-banana-2", name: "Nano Banana 2", provider: "Google", description: "Fast generation, up to 4K", resolutions: ["1024x1024", "2048x2048", "4096x4096"], icon: "/icons/gemini.png" },
];

// Resolution labels mapped to base pixel size
const RESOLUTION_OPTIONS = [
  { label: "1K", base: 1024 },
  { label: "2K", base: 2048 },
  { label: "4K", base: 4096 },
  { label: "8K", base: 8192 },
];

// Aspect ratio options with multipliers
const ASPECT_RATIOS = [
  { label: "1:1", w: 1, h: 1 },
  { label: "16:9", w: 16, h: 9 },
  { label: "4:3", w: 4, h: 3 },
];

/**
 * Compute the pixel size string from resolution base + aspect ratio.
 * e.g. base=1024, ratio={w:16,h:9} → "1024x576"
 */
function computeImageSize(base, ratio) {
  if (ratio.w === ratio.h) return `${base}x${base}`;
  // Keep the longest side at `base`, scale the other
  const aspect = ratio.w / ratio.h;
  if (aspect > 1) {
    // Landscape
    return `${base}x${Math.round(base / aspect)}`;
  }
  // Portrait (shouldn't happen with our ratios but just in case)
  return `${Math.round(base * aspect)}x${base}`;
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Model Switcher ---------------- */
/* ---------------- Mode Switcher (inline @chat / @quiz pill) ---------------- */
const ModeSwitcher = ({ value, onChange, hideImage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { id: "chat", label: "@chat", Icon: MessageCircle },
    { id: "mcq", label: "@quiz", Icon: ListChecks },
    ...(!hideImage ? [{ id: "image", label: "@image", Icon: ImageIcon }] : []),
  ];
  const current = options.find((o) => o.id === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="mode-switcher"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12.5px] font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <current.Icon className="h-3.5 w-3.5" />
        <span>{current.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-zinc-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[110px] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                data-testid={`mode-option-${opt.id}`}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium transition",
                  active
                    ? "bg-zinc-100 text-black"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-black"
                )}
              >
                <opt.Icon className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
                {active && <Check className="ml-auto h-3 w-3 text-black" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---------------- Image Dropdown (resolution / aspect ratio / model picker) ---------------- */
const ImageDropdown = ({ label, options, value, onChange, testId, icon, models }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        {icon && (
          <img src={icon} alt="" className="h-4 w-4 rounded-sm object-contain" />
        )}
        <span className="max-w-[120px] truncate">{value}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-zinc-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] origin-top overflow-hidden rounded-xl border border-zinc-200 bg-white/95 p-1 shadow-xl backdrop-blur-sm"
          style={{
            animation: "dropdownIn 180ms cubic-bezier(0.22, 0.85, 0.3, 1) both",
            transformOrigin: "top left",
          }}
        >
          {options.map((opt) => {
            const active = value === opt;
            // Try to find model info for richer display
            const modelInfo = models ? models.find((m) => m.name === opt) : null;
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100"
                )}
              >
                {modelInfo?.icon && (
                  <img
                    src={modelInfo.icon}
                    alt=""
                    className={cn("h-5 w-5 rounded object-contain", active && "brightness-0 invert")}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn("text-[12.5px] font-semibold truncate", active ? "text-white" : "text-zinc-800")}>
                    {opt}
                  </div>
                  {modelInfo?.description && (
                    <div className={cn("text-[10.5px] truncate", active ? "text-zinc-300" : "text-zinc-400")}>
                      {modelInfo.description}
                    </div>
                  )}
                </div>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ModelSwitcher = ({ models, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const current = value ? models.find((m) => m.id === value) : null;

  useEffect(() => { setMounted(true); }, []);

  // Track viewport size for mobile vs desktop positioning
  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 640);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  // Capture the trigger's position whenever the dropdown is opened or viewport changes
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (ref.current) setTriggerRect(ref.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

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
      const inTrigger = ref.current && ref.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) setOpen(false);
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

      {open && mounted && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            ref={dropdownRef}
            data-testid="model-dropdown"
            className="fixed z-[101] flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl sm:shadow-[0_12px_40px_rgba(17,24,39,0.12)]"
            style={
              isMobile || !triggerRect
                ? {
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(92vw, 320px)",
                    height: "min(70vh, 380px)",
                    animation: "dropdownInCenter 220ms cubic-bezier(0.22, 0.85, 0.3, 1) both",
                  }
                : {
                    left: triggerRect.left,
                    top: triggerRect.bottom + 8,
                    width: 380,
                    height: 280,
                    animation: "dropdownIn 200ms cubic-bezier(0.22, 0.85, 0.3, 1) both",
                    transformOrigin: "top left",
                  }
            }
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
          
          <div ref={listRef} className="flex-1 overflow-y-auto [scrollbar-width:thin] space-y-0.5 px-1 pb-1 sm:max-h-[220px] sm:space-y-1">
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
        </>,
        document.body
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
  const [baseSnapshot, setBaseSnapshot] = useState(settings);
  const [savedFlash, setSavedFlash] = useState(false);
  
  // API Key Form State
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEndpoint, setNewKeyEndpoint] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Active API source state (inbuilt vs personal)
  const [activeSource, setActiveSource] = useState("inbuilt");
  const [hasPublicKey, setHasPublicKey] = useState(false);
  const [switchingSource, setSwitchingSource] = useState(false);

  // Re-sync local draft whenever the modal is opened
  useEffect(() => {
    if (open) {
      const initialDraft = { ...settings };
      // If defaultModelId doesn't match any available model, use the first one
      if (models.length > 0 && !models.some(m => m.id === initialDraft.defaultModelId)) {
        initialDraft.defaultModelId = models[0].id;
      }
      setDraft(initialDraft);
      setBaseSnapshot(settings); // keep original for dirty comparison
      setTab("profile");
      setSavedFlash(false);
      
      setNewKeyName("");
      setNewKeyEndpoint("");
      setNewKeyValue("");
      setKeyError("");
      setShowApiKey(false);
      setIsSavingKey(false);

      // Fetch active API source
      fetch("/api/user/active-source")
        .then(r => r.json())
        .then(data => {
          setHasPublicKey(data.hasPublicKey);
          setActiveSource(data.activeSource || "inbuilt");
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseSnapshot);

  const handleSave = () => {
    // Ensure defaultModelId is valid (exists in models list)
    const finalDraft = { ...draft };
    if (models.length > 0 && !models.some(m => m.id === finalDraft.defaultModelId)) {
      finalDraft.defaultModelId = models[0].id;
    }
    onSave(finalDraft);
    setBaseSnapshot(finalDraft);
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
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex h-[640px] max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] sm:flex-row">
        {/* Tabs — horizontal scroll on mobile, vertical stack on desktop */}
        <div className="relative shrink-0 sm:w-[200px]">
          {/* Right fade gradient on mobile (indicates scrollable tabs) */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
          <div className="flex overflow-x-auto border-b border-zinc-100 bg-white px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-col sm:gap-px sm:overflow-visible sm:border-b-0 sm:border-r sm:bg-zinc-50/50 sm:p-3">
            <div
              className="hidden px-2.5 pt-1 pb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:block"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
            >
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
                  title={t.label}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "text-zinc-950 sm:bg-zinc-100"
                      : "text-zinc-500 hover:text-zinc-900 sm:hover:bg-zinc-100",
                    "sm:flex-none sm:justify-start sm:gap-2.5 sm:rounded-md sm:px-2.5 sm:text-[13px]"
                  )}
                >
                  <Icon className={cn("h-[14px] w-[14px] shrink-0 sm:h-[15px] sm:w-[15px]", active ? "sm:text-zinc-700" : "text-zinc-400")} />
                  {t.label}
                  {/* Mobile-only active indicator (underline) */}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-zinc-900 sm:hidden" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 sm:px-7">
            <h2
              className="text-[18px] font-semibold tracking-tight text-zinc-950"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.02em" }}
            >
              {SETTINGS_TABS.find((t) => t.id === tab)?.label}
            </h2>
            <button
              data-testid="settings-close"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Close"
            >
              <X className="h-[16px] w-[16px]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {tab === "profile" && (
              <div className="space-y-6">
                {/* Google Account Card */}
                {authUser && (
                  <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4">
                    {authUser.image ? (
                      <img
                        src={authUser.image}
                        alt=""
                        className="h-14 w-14 rounded-full ring-1 ring-zinc-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-[18px] font-semibold text-white">
                        {(authUser.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-zinc-950">
                        {authUser.name || "User"}
                      </div>
                      <div className="truncate text-[12.5px] text-zinc-500">
                        {authUser.email || ""}
                      </div>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600 sm:inline-flex">
                      Google
                    </span>
                  </div>
                )}

                {/* Display name */}
                <div className="border-t border-zinc-100 pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <label className="block text-[13px] font-semibold text-zinc-900">
                        Display name
                      </label>
                      <p className="mt-0.5 text-[12px] text-zinc-500">
                        Shown in the sidebar and used when greeting you.
                      </p>
                    </div>
                  </div>
                  <input
                    data-testid="settings-displayName"
                    type="text"
                    value={draft.displayName}
                    maxLength={40}
                    onChange={(e) => update({ displayName: e.target.value })}
                    className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                    placeholder={authUser?.name || "Your name"}
                  />
                </div>

                {/* Email */}
                <div className="border-t border-zinc-100 pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <label className="block text-[13px] font-semibold text-zinc-900">
                        Email
                      </label>
                      <p className="mt-0.5 text-[12px] text-zinc-500">
                        Synced from your Google account. Cannot be changed.
                      </p>
                    </div>
                  </div>
                  <input
                    data-testid="settings-email"
                    type="email"
                    value={draft.email || authUser?.email || ""}
                    readOnly
                    className="mt-3 w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[14px] text-zinc-500 outline-none"
                  />
                </div>
              </div>
            )}

            {tab === "apikey" && (
              <div className="space-y-6">
                {/* Active API Source Switcher */}
                <div>
                  <h3 className="mb-2 text-[14px] font-semibold text-black">Active API Source</h3>
                  <p className="mb-4 text-[12px] text-zinc-600">
                    Choose which API key to use for AI requests.
                  </p>

                  <div className="space-y-2">
                    {/* Inbuilt API option */}
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition cursor-pointer",
                        activeSource === "inbuilt"
                          ? "border-black bg-zinc-50"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      )}
                      onClick={async () => {
                        if (activeSource === "inbuilt" || switchingSource) return;
                        setSwitchingSource(true);
                        try {
                          await fetch("/api/user/active-source", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ source: "inbuilt" }),
                          });
                          setActiveSource("inbuilt");
                        } catch {}
                        setSwitchingSource(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          activeSource === "inbuilt" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
                        )}>
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-black">Inbuilt API</div>
                          <div className="text-[11px] text-zinc-500">Free shared API provided by Study Buddy</div>
                        </div>
                      </div>
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                        activeSource === "inbuilt" ? "border-black bg-black" : "border-zinc-300"
                      )}>
                        {activeSource === "inbuilt" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    {/* Personal API option */}
                    {apiKeys && apiKeys.length > 0 && (
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 transition cursor-pointer",
                          activeSource === "personal"
                            ? "border-black bg-zinc-50"
                            : "border-zinc-200 bg-white hover:border-zinc-300"
                        )}
                        onClick={async () => {
                          if (activeSource === "personal" || switchingSource) return;
                          setSwitchingSource(true);
                          try {
                            await fetch("/api/user/active-source", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ source: "personal" }),
                            });
                            setActiveSource("personal");
                          } catch {}
                          setSwitchingSource(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            activeSource === "personal" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
                          )}>
                            <Key className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-black">Personal API Key</div>
                            <div className="text-[11px] text-zinc-500">
                              {apiKeys.find(k => k.isActive)?.name || apiKeys[0]?.name || "Your own key"}
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                          activeSource === "personal" ? "border-black bg-black" : "border-zinc-300"
                        )}>
                          {activeSource === "personal" && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {switchingSource && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Switching...
                    </div>
                  )}
                </div>

                {/* Personal Keys Management */}
                <div className="border-t border-zinc-200 pt-6">
                  <h3 className="mb-2 text-[14px] font-semibold text-black">Your API Keys</h3>
                  <p className="mb-4 text-[12px] text-zinc-600">
                    Manage your personal API keys below. Only one key can be active at a time.
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
                                if (!k.isActive) {
                                  onToggleActiveKey(k.id);
                                  setActiveSource("personal");
                                }
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
                        No personal API keys added. Using Inbuilt API.
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
              const history = usage.history || [];

              // Model breakdown from history
              const modelBreakdown = {};
              history.forEach((entry) => {
                const model = entry.model || "Unknown";
                if (!modelBreakdown[model]) modelBreakdown[model] = { input: 0, output: 0, count: 0 };
                modelBreakdown[model].input += entry.input || 0;
                modelBreakdown[model].output += entry.output || 0;
                modelBreakdown[model].count += 1;
              });
              const modelEntries = Object.entries(modelBreakdown).sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output));

              // Daily usage from history (last 14 days)
              const dailyUsage = {};
              const dailyDates = [];
              const now = Date.now();
              for (let i = 13; i >= 0; i--) {
                const d = new Date(now - i * 86400000);
                const key = d.toLocaleDateString([], { month: "numeric", day: "numeric" });
                dailyUsage[key] = 0;
                dailyDates.push({ key, date: d, weekday: d.toLocaleDateString([], { weekday: "narrow" }) });
              }
              history.forEach((entry) => {
                const d = new Date(entry.time);
                const key = d.toLocaleDateString([], { month: "numeric", day: "numeric" });
                if (dailyUsage[key] !== undefined) {
                  dailyUsage[key] += (entry.input || 0) + (entry.output || 0);
                }
              });
              const dailyValues = Object.values(dailyUsage);
              const maxDaily = Math.max(...dailyValues, 1);

              // Today vs yesterday
              const todayKey = new Date().toLocaleDateString([], { month: "numeric", day: "numeric" });
              const todayTokens = dailyUsage[todayKey] || 0;
              const yesterdayKey = new Date(now - 86400000).toLocaleDateString([], { month: "numeric", day: "numeric" });
              const yesterdayTokens = dailyUsage[yesterdayKey] || 0;
              const dayDelta = yesterdayTokens > 0 ? ((todayTokens - yesterdayTokens) / yesterdayTokens) * 100 : null;

              // Streak
              let streak = 0;
              for (let i = dailyDates.length - 1; i >= 0; i--) {
                if (dailyUsage[dailyDates[i].key] > 0) streak++;
                else if (i < dailyDates.length - 1) break;
              }

              // Hour-of-day distribution
              const hourBuckets = new Array(24).fill(0);
              history.forEach((entry) => {
                const h = new Date(entry.time).getHours();
                hourBuckets[h] += (entry.input || 0) + (entry.output || 0);
              });
              const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
              const peakHourLabel = peakHour < 12 ? `${peakHour || 12}am` : peakHour === 12 ? "12pm" : `${peakHour - 12}pm`;

              // Insights
              const avgTokensPerReq = usage.totalRequests > 0 ? Math.round(totalTokens / usage.totalRequests) : 0;
              const lastUsed = history.length > 0
                ? new Date(history[0].time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Never";

              return (
                <div className="space-y-6">
                  {/* Hero — Total tokens, prominent */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
                          Total tokens
                        </div>
                        <div className="mt-2 flex items-baseline gap-3">
                          <span className="text-[40px] font-bold tracking-tight leading-none text-black tabular-nums">
                            {formatTokenCount(totalTokens)}
                          </span>
                          {dayDelta !== null && (
                            <span
                              className={cn(
                                "inline-flex items-baseline gap-0.5 text-[13px] font-semibold tabular-nums",
                                dayDelta >= 0 ? "text-black" : "text-zinc-500"
                              )}
                              title="Change vs. yesterday"
                            >
                              {dayDelta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(dayDelta))}%
                              <span className="ml-1 text-[11px] font-normal text-zinc-400">vs yesterday</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-3 text-[13px] text-zinc-500">
                          <span className="font-medium text-black tabular-nums">{usage.totalRequests}</span> requests
                          <span className="mx-2 text-zinc-300">·</span>
                          Last activity {lastUsed}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Reset all token usage data?")) {
                            resetTokenUsage();
                            setDraft({ ...draft });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
                        title="Reset usage data"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Key metrics row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Today</div>
                      <div className="mt-2 text-[24px] font-bold tracking-tight text-black tabular-nums">
                        {formatTokenCount(todayTokens)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-zinc-500">tokens used</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Streak</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-[24px] font-bold tracking-tight text-black tabular-nums">{streak}</span>
                        <span className="text-[13px] font-medium text-zinc-500">day{streak !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-zinc-500">consecutive</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Peak hour</div>
                      <div className="mt-2 text-[24px] font-bold tracking-tight text-black tabular-nums">
                        {history.length > 0 ? peakHourLabel : "—"}
                      </div>
                      <div className="mt-0.5 text-[12px] text-zinc-500">most active</div>
                    </div>
                  </div>

                  {/* Section: Breakdown */}
                  <div>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Token breakdown
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="grid grid-cols-[140px_1fr] gap-6 items-center">
                        {/* Donut chart */}
                        <div className="relative flex items-center justify-center">
                          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                            <circle cx="70" cy="70" r="56" fill="none" stroke="#e4e4e7" strokeWidth="20" />
                            <circle
                              cx="70" cy="70" r="56"
                              fill="none"
                              stroke="#000"
                              strokeWidth="20"
                              strokeDasharray={`${(inputPct / 100) * (2 * Math.PI * 56)} ${2 * Math.PI * 56}`}
                              strokeLinecap="butt"
                              className="transition-all duration-700 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[26px] font-bold text-black tabular-nums leading-none">
                              {Math.round(inputPct)}%
                            </span>
                            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Input</span>
                          </div>
                        </div>

                        {/* Legend rows */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-sm bg-black" />
                                <span className="text-[13px] font-semibold text-black">Input tokens</span>
                              </div>
                              <span className="text-[15px] font-bold text-black tabular-nums">
                                {formatTokenCount(usage.totalInput)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11.5px] text-zinc-500">
                              <span className="tabular-nums">{Math.round(inputPct)}% of total</span>
                              <span className="text-zinc-300">·</span>
                              <span>
                                avg <strong className="font-semibold text-zinc-700 tabular-nums">
                                  {usage.totalRequests > 0 ? formatTokenCount(Math.round(usage.totalInput / usage.totalRequests)) : "0"}
                                </strong> / req
                              </span>
                            </div>
                          </div>

                          <div className="h-px bg-zinc-100" />

                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-sm bg-zinc-300 ring-1 ring-zinc-400" />
                                <span className="text-[13px] font-semibold text-black">Output tokens</span>
                              </div>
                              <span className="text-[15px] font-bold text-black tabular-nums">
                                {formatTokenCount(usage.totalOutput)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11.5px] text-zinc-500">
                              <span className="tabular-nums">{Math.round(outputPct)}% of total</span>
                              <span className="text-zinc-300">·</span>
                              <span>
                                avg <strong className="font-semibold text-zinc-700 tabular-nums">
                                  {usage.totalRequests > 0 ? formatTokenCount(Math.round(usage.totalOutput / usage.totalRequests)) : "0"}
                                </strong> / req
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Activity */}
                  <div>
                    <div className="mb-3 flex items-baseline justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Activity over time
                      </span>
                      <span className="text-[11px] tabular-nums text-zinc-400">
                        14 days · peak {formatTokenCount(maxDaily)}
                      </span>
                    </div>

                    {/* 14-day bar chart */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="flex items-end gap-1.5 h-[88px]">
                        {dailyDates.map((d, i) => {
                          const val = dailyValues[i];
                          const height = maxDaily > 0 ? Math.max((val / maxDaily) * 100, 4) : 4;
                          const isToday = i === dailyDates.length - 1;
                          return (
                            <div key={d.key} className="flex flex-1 flex-col items-center gap-2 group">
                              <div className="relative w-full flex justify-center flex-1 items-end">
                                <div className="absolute -top-9 hidden group-hover:flex flex-col items-center rounded-md bg-black px-2 py-1 whitespace-nowrap z-10">
                                  <span className="text-[11px] font-bold text-white tabular-nums">{formatTokenCount(val)}</span>
                                  <span className="text-[9px] text-zinc-400">{d.date.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                                </div>
                                <div
                                  className={cn(
                                    "w-full rounded-sm transition-all duration-300 cursor-pointer",
                                    isToday
                                      ? "bg-black"
                                      : val > 0
                                      ? "bg-zinc-300 group-hover:bg-black"
                                      : "bg-zinc-100"
                                  )}
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-medium tabular-nums",
                                isToday ? "text-black" : "text-zinc-400"
                              )}>
                                {i % 2 === 0 ? d.weekday : ""}
                                {i % 2 !== 0 && <span className="text-transparent">·</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hour distribution */}
                    {history.length > 0 && (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-5">
                        <div className="mb-3 flex items-baseline justify-between">
                          <span className="text-[12px] font-semibold text-black">Hour of day</span>
                          <span className="text-[11px] text-zinc-500">
                            Peak: <span className="font-semibold text-black">{peakHourLabel}</span>
                          </span>
                        </div>
                        <div className="flex items-end gap-[3px] h-[44px]">
                          {hourBuckets.map((v, h) => {
                            const max = Math.max(...hourBuckets, 1);
                            const heightPct = (v / max) * 100;
                            const isPeak = h === peakHour && v > 0;
                            return (
                              <div
                                key={h}
                                className="flex flex-1 items-end group relative"
                                title={`${h.toString().padStart(2, "0")}:00 — ${formatTokenCount(v)} tokens`}
                              >
                                <div
                                  className={cn(
                                    "w-full rounded-sm transition-colors",
                                    v === 0 ? "bg-zinc-100" : isPeak ? "bg-black" : "bg-zinc-400 group-hover:bg-black"
                                  )}
                                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-400">
                          <span>12 AM</span>
                          <span>6 AM</span>
                          <span>12 PM</span>
                          <span>6 PM</span>
                          <span>11 PM</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: By model */}
                  {modelEntries.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          By model
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {modelEntries.length} model{modelEntries.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        {modelEntries.slice(0, 6).map(([model, data], i) => {
                          const modelTotal = data.input + data.output;
                          const modelPct = totalTokens > 0 ? (modelTotal / totalTokens) * 100 : 0;
                          const opacity = 1 - i * 0.12;
                          const avgPerReq = data.count > 0 ? Math.round(modelTotal / data.count) : 0;
                          return (
                            <div
                              key={model}
                              className={cn(
                                "group px-4 py-3 transition-colors hover:bg-zinc-50",
                                i > 0 && "border-t border-zinc-100"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-sm bg-black"
                                    style={{ opacity: Math.max(opacity, 0.3) }}
                                  />
                                  <span className="truncate text-[13px] font-semibold text-black">{model}</span>
                                  <span className="shrink-0 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 tabular-nums">
                                    {data.count} calls
                                  </span>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="text-[13px] font-bold text-black tabular-nums">{formatTokenCount(modelTotal)}</div>
                                  <div className="text-[10.5px] text-zinc-500 tabular-nums">~{formatTokenCount(avgPerReq)} / req</div>
                                </div>
                              </div>
                              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className="h-full rounded-full bg-black transition-all duration-500 ease-out"
                                  style={{ width: `${Math.min(modelPct, 100)}%`, opacity: Math.max(opacity, 0.4) }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section: Recent activity */}
                  {history.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          Recent activity
                        </span>
                        <span className="text-[11px] tabular-nums text-zinc-400">
                          {history.length} entries
                        </span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <div className="max-h-[280px] overflow-y-auto [scrollbar-width:thin]">
                          {history.slice(0, 25).map((entry, i) => {
                            const entryTotal = (entry.input || 0) + (entry.output || 0);
                            const isAboveAvg = entryTotal > avgTokensPerReq;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "group relative flex items-center gap-3 px-4 py-2.5 text-[12.5px] transition-colors hover:bg-zinc-50",
                                  i > 0 && "border-t border-zinc-100"
                                )}
                              >
                                <div
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    isAboveAvg ? "bg-black" : "bg-zinc-400"
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate font-medium text-black">
                                  {entry.model || "Unknown"}
                                </span>
                                <div className="hidden shrink-0 items-center gap-2 text-[11px] tabular-nums text-zinc-500 group-hover:flex">
                                  <span>↓ <span className="font-semibold text-black">{formatTokenCount(entry.input)}</span></span>
                                  <span>↑ <span className="font-semibold text-zinc-700">{formatTokenCount(entry.output)}</span></span>
                                </div>
                                <span className="shrink-0 text-[12.5px] font-bold text-black tabular-nums group-hover:hidden">
                                  {formatTokenCount(entryTotal)}
                                </span>
                                <span className="shrink-0 w-[52px] text-right text-[11px] tabular-nums text-zinc-400">
                                  {new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {history.length === 0 && totalTokens === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                        <Activity className="h-5 w-5 text-zinc-500" />
                      </div>
                      <p className="text-[14px] font-semibold text-black">No usage data yet</p>
                      <p className="mt-1 text-[12px] text-zinc-500">Start chatting to see your token usage here</p>
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
                    value={models.some(m => m.id === draft.defaultModelId) ? draft.defaultModelId : (models[0]?.id || "")}
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

          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3 sm:px-7">
            <span
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-medium transition-opacity",
                savedFlash ? "text-emerald-600 opacity-100" : "opacity-0"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
              >
                Cancel
              </button>
              <button
                data-testid="settings-save"
                onClick={handleSave}
                disabled={!dirty}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                  dirty
                    ? "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
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
  const isChatLike = section === "chat" || section === "image";
  const pool = isChatLike ? recentChats : recentMCQ;
  const filtered = pool.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  const newLabel = isChatLike ? "New Chat" : "New Quiz";
  const recentLabel = isChatLike ? "Recent Chats" : "Recent Quizzes";

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
          "shrink-0 transition-[width,transform] duration-300 ease-out",
          // Mobile: fixed overlay drawer (always 280px wide, slides in/out)
          "fixed inset-y-0 left-0 z-40 w-[280px]",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: in-flow, width animates between 280 and 64
          "sm:relative sm:translate-x-0",
          open ? "sm:w-[280px]" : "sm:w-[64px]"
        )}
        style={{ height: 'var(--app-height, 100vh)' }}
      >
      {/* Clean white surface with single hairline border */}
      <div className="absolute inset-0 bg-white border-r border-zinc-100" />

      <div className="relative flex h-full flex-col">
        {/* Header — Brand + Toggle */}
        <div
          className={cn(
            "flex items-center pt-5 pb-4",
            open ? "justify-between px-4" : "justify-center px-2"
          )}
        >
          {open && (
            <span
              className="text-[15px] font-bold tracking-tight text-zinc-950"
              style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.025em" }}
            >
              Study Buddy
            </span>
          )}
          <button
            data-testid="sidebar-toggle"
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Toggle sidebar"
          >
            {open ? (
              <PanelLeftClose className="h-[16px] w-[16px]" />
            ) : (
              <PanelLeftOpen className="h-[16px] w-[16px]" />
            )}
          </button>
        </div>

        {/* New button */}
        <div className={cn("px-3", !open && "px-0 flex justify-center")}>
          <button
            data-testid="new-button"
            onClick={onNew}
            className={cn(
              "group items-center gap-2.5 rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.99]",
              open ? "flex w-full px-3 py-2" : "flex h-9 w-9 justify-center"
            )}
            title={!open ? newLabel : undefined}
          >
            <Plus className="h-[15px] w-[15px] shrink-0 text-zinc-500 transition-transform group-hover:rotate-90 group-hover:text-zinc-900" />
            {open && <span className="truncate">{newLabel}</span>}
          </button>
        </div>

        {/* Search */}
        {open && (
          <div className="mt-2 px-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                data-testid="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  (section === "chat" || section === "image") ? "Search chats" : "Search quizzes"
                }
                className="w-full rounded-lg border border-transparent bg-zinc-100/60 py-1.5 pl-8 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-200 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Recents */}
        <div className="mt-5 flex-1 overflow-hidden">
          {open && (
            <div className="px-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {recentLabel}
            </div>
          )}
          <div className="h-full overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
            <ul className="space-y-px">
              {filtered.map((item) => (
                <li key={item.id}>
                  <div
                    className={cn(
                      "group relative flex items-center gap-2 rounded-md text-left transition-colors",
                      activeId === item.id
                        ? "bg-zinc-100 text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                      open ? "w-full px-2 py-1.5" : "mx-auto h-8 w-8 justify-center"
                    )}
                  >
                    <button
                      data-testid={`recent-item-${item.id}`}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "flex items-center gap-2 text-left",
                        open ? "min-w-0 flex-1" : "h-full w-full justify-center"
                      )}
                      title={item.title}
                    >
                      {open ? (
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {item.title}
                        </span>
                      ) : (
                        <MessageSquare className="h-[14px] w-[14px] shrink-0" />
                      )}
                    </button>
                    {open && (
                      <button
                        data-testid={`delete-item-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-[12px] w-[12px]" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {open && filtered.length === 0 && (
                <li className="px-3 py-8 text-center text-[12px] text-zinc-400">
                  No {(section === "chat" || section === "image") ? "chats" : "quizzes"} yet
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer — User profile */}
        <div className="mt-auto shrink-0 border-t border-zinc-100 p-3">
          <div className={cn(
            "flex w-full items-center gap-2.5 rounded-md",
            !open && "justify-center"
          )}>
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-7 w-7 shrink-0 aspect-square object-cover rounded-full ring-1 ring-zinc-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 aspect-square items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                {(user?.name || displayName || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            {open && (
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[13px] font-medium text-zinc-900">
                  {user?.name || displayName || "Anonymous"}
                </span>
                <span className="truncate text-[11px] text-zinc-500">
                  {user?.email || "Free plan"}
                </span>
              </div>
            )}
            {open && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={onOpenSettings}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                  title="Settings"
                >
                  <Settings className="h-[14px] w-[14px]" />
                </button>
                {user && onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Sign out"
                  >
                    <X className="h-[14px] w-[14px]" />
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

/* ---------------- MCQ Composer (upload-focused) ---------------- */
const MCQComposer = ({ onSubmitText, onUpload, sendOnEnter, section, onSectionChange }) => {  const [text, setText] = useState("");
  const [fileSizeError, setFileSizeError] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null); // { file, base64Data, mimeType }
  const [pageRanges, setPageRanges] = useState({}); // keyed by file index
  const fileRef = useRef(null);
  const taRef = useRef(null);

  const isPdf = uploadedFile && uploadedFile.mimeType === "application/pdf";
  // Determine if the page range is valid (non-null) for the uploaded PDF
  const hasValidPageRange = isPdf && pageRanges[0] != null;
  // Can submit: either has text, or has a non-PDF file, or has a PDF with valid page range
  const canSubmit = text.trim().length > 0 || (uploadedFile && !isPdf) || (isPdf && hasValidPageRange);

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
  });

  const handleSubmit = () => {
    // If there's an uploaded file, submit with file + page ranges
    if (uploadedFile) {
      const payload = {
        file: uploadedFile.file,
        text: text.trim() || undefined, // include user text alongside file
      };
      // Include page ranges for PDF files with valid ranges
      if (isPdf && hasValidPageRange) {
        payload.pageRanges = { 0: pageRanges[0] };
      }
      onUpload(payload);
      setUploadedFile(null);
      setPageRanges({});
      setText("");
      if (taRef.current) taRef.current.style.height = "auto";
      return;
    }
    // Otherwise submit text
    if (text.trim().length === 0) return;
    onSubmitText(buildPayload());
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const handleFile = async (file) => {
    if (!file) return;
    const mimeType = file.type || "application/octet-stream";
    const isPdfFile = mimeType === "application/pdf";

    // Apply size limit: 50 MB for PDFs (page range will be used), 10 MB for others
    const sizeLimit = isPdfFile ? 52_428_800 : 10_485_760;
    const sizeLimitLabel = isPdfFile ? "50 MB" : "10 MB";
    if (file.size > sizeLimit) {
      setFileSizeError(`File exceeds maximum size of ${sizeLimitLabel}`);
      return;
    }
    setFileSizeError("");

    if (isPdfFile) {
      // For PDFs: store the file and show PageRangeSelector before submitting
      try {
        const base64Data = await fileToBase64(file);
        setUploadedFile({ file, base64Data, mimeType });
        setPageRanges({});
      } catch {
        setFileSizeError("Failed to read file");
      }
    } else {
      // For non-PDFs: keep existing immediate upload behavior
      onUpload({
        file,
      });
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPageRanges({});
    setFileSizeError("");
  };

  const handlePageRangeChange = (fileIndex, range) => {
    if (range === null) {
      setPageRanges((prev) => {
        const next = { ...prev };
        delete next[fileIndex];
        return next;
      });
    } else {
      setPageRanges((prev) => ({ ...prev, [fileIndex]: range }));
    }
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
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
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

          {/* Uploaded file indicator + PageRangeSelector for PDFs */}
          {uploadedFile && (
            <div className="mx-4 mb-2">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">
                  {uploadedFile.file.name}
                </span>
                <button
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                  className="shrink-0 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {isPdf && (
                <PageRangeSelector
                  fileIndex={0}
                  base64Data={uploadedFile.base64Data}
                  onRangeChange={handlePageRangeChange}
                />
              )}
            </div>
          )}

          <div className="flex flex-nowrap items-center gap-1 px-1.5 pb-1 pt-1 sm:gap-2 sm:px-2">
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-hidden sm:gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                data-testid="upload-button"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-1.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black sm:gap-2 sm:px-3"
              >
                <Upload className="h-[14px] w-[14px] sm:h-[15px] sm:w-[15px]" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>

            <button
              data-testid="generate-mcq"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label="Send"
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-all duration-200 sm:gap-2 sm:px-3.5",
                !canSubmit
                  ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                  : "bg-black text-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] hover:bg-zinc-800 active:scale-[0.97]"
              )}
            >
              <span className="hidden sm:inline">Send</span>
              <ArrowUp className="h-[15px] w-[15px]" />
            </button>
          </div>
          {fileSizeError && (
            <p data-testid="file-size-error" className="px-4 pt-1 pb-1 text-[12px] text-red-600" role="alert">
              {fileSizeError}
            </p>
          )}
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
  const [isMobile, setIsMobile] = useState(false);
  const wrapperRef = useRef(null);
  
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  // On mobile, render a simple sticky-bottom composer (no drag)
  if (isMobile) {
    return (
      <div className="composer-safe-bottom sticky bottom-0 z-20 w-full bg-gradient-to-t from-white via-white/95 to-white/0 pb-2 pt-3">
        <div className="w-full px-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={wrapperRef}
      className={cn(
        "z-20 flex flex-col items-center pointer-events-none",
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
        isCollapsed ? "max-h-0 opacity-0 scale-90 pointer-events-none" : "max-h-[800px] opacity-100 scale-100 pointer-events-auto max-w-4xl"
      )}>
        <div className={cn("mx-auto w-full", isCollapsed ? "w-[100px]" : "w-full")}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Slash Commands ---------------- */
const SLASH_COMMANDS = [
  {
    id: "explain",
    label: "Explain",
    description: "Break down a concept simply",
    icon: Lightbulb,
    prompt: "Explain this in simple terms: ",
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Condense the key points",
    icon: FileText,
    prompt: "Summarize the following: ",
  },
  {
    id: "code",
    label: "Code",
    description: "Write or debug code",
    icon: Code,
    prompt: "Write code that ",
  },
  {
    id: "fix",
    label: "Fix",
    description: "Find and fix issues in text or code",
    icon: Wand2,
    prompt: "Find and fix issues in: ",
  },
  {
    id: "rewrite",
    label: "Rewrite",
    description: "Rephrase in a clearer tone",
    icon: RefreshCw,
    prompt: "Rewrite this clearly: ",
  },
  {
    id: "compare",
    label: "Compare",
    description: "Contrast two things side-by-side",
    icon: Layers,
    prompt: "Compare and contrast: ",
  },
  {
    id: "quiz",
    label: "Quiz me",
    description: "Generate practice questions",
    icon: ListChecks,
    prompt: "Quiz me on: ",
  },
  {
    id: "outline",
    label: "Outline",
    description: "Make a structured outline",
    icon: BookOpen,
    prompt: "Create a structured outline for: ",
  },
];

/* ---------------- Chat Composer (with model switcher + file upload) ---------------- */
const ChatComposer = ({ models, onSend, onQuizSubmit, onImageGenerate, model, onModelChange, imageModel, onImageModelChange, imageResolution, onImageResolutionChange, imageAspectRatio, onImageAspectRatioChange, sendOnEnter, disabled, section, onSectionChange }) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const [pageRanges, setPageRanges] = useState({}); // keyed by file index
  const [pdfBase64, setPdfBase64] = useState(null); // base64 for PDF page range selector
  const taRef = useRef(null);
  const fileRef = useRef(null);

  // Slash command popup state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  const isMcqMode = section === "mcq";
  const isImageMode = section === "image";

  const filteredCommands = useMemo(() => {
    const q = slashQuery.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [slashQuery]);

  // Detect "/" at the start (or after whitespace) and open the menu
  const updateSlashState = (value, caret) => {
    // Find the token starting at or before the caret that begins with "/"
    const upToCaret = value.slice(0, caret);
    const match = upToCaret.match(/(?:^|\s)(\/[\w-]*)$/);
    if (match) {
      setSlashOpen(true);
      setSlashQuery(match[1].slice(1)); // drop leading "/"
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
      setSlashQuery("");
    }
  };

  const applyCommand = (cmd) => {
    const el = taRef.current;
    if (!el) return;
    const value = text;
    const caret = el.selectionStart ?? value.length;
    // Replace the slash token immediately preceding caret
    const upToCaret = value.slice(0, caret);
    const after = value.slice(caret);
    const replaced = upToCaret.replace(/(^|\s)\/[\w-]*$/, (m, lead) => `${lead}${cmd.prompt}`);
    const newValue = replaced + after;
    setText(newValue);
    setSlashOpen(false);
    setSlashQuery("");
    // Restore focus + caret to end of inserted prompt
    requestAnimationFrame(() => {
      if (taRef.current) {
        const newCaret = replaced.length;
        taRef.current.focus();
        taRef.current.setSelectionRange(newCaret, newCaret);
        taRef.current.style.height = "auto";
        taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 220)}px`;
      }
    });
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    const el = taRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    }
    updateSlashState(val, e.target.selectionStart ?? val.length);
  };

  const currentModel = models?.find((m) => m.id === model);
  // Default to true if not specified so we don't break fallback functionality
  const supportsVision = currentModel ? currentModel.isVision : true;

  const canSend =
    !disabled && (text.trim().length > 0 || files.length > 0);

  const handleSubmit = () => {
    if (!canSend) return;

    if (isMcqMode && onQuizSubmit) {
      // Route to quiz generation
      const theFile = files.length > 0 ? files[0] : null;
      const payload = {
        text: text.trim(),
      };
      if (theFile) {
        payload.file = theFile;
        // Include page ranges for PDF files with valid ranges
        const isPdf = theFile.type === "application/pdf";
        if (isPdf && pageRanges[0] != null) {
          payload.pageRanges = { 0: pageRanges[0] };
        }
      }
      onQuizSubmit(payload);
    } else if (isImageMode && onImageGenerate) {
      // Route to image generation — compute size from resolution + aspect ratio
      const resOption = RESOLUTION_OPTIONS.find(r => r.label === imageResolution) || RESOLUTION_OPTIONS[0];
      const arOption = ASPECT_RATIOS.find(a => a.label === imageAspectRatio) || ASPECT_RATIOS[0];
      const size = computeImageSize(resOption.base, arOption);
      onImageGenerate(text.trim(), size);
    } else {
      // Route to chat
      onSend(text, files);
    }

    setText("");
    setFiles([]);
    setPageRanges({});
    setPdfBase64(null);
    if (taRef.current) taRef.current.style.height = "auto";
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKey = (e) => {
    // Slash menu navigation
    if (slashOpen && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyCommand(filteredCommands[slashIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }

    const isSendCombo = sendOnEnter
      ? e.key === "Enter" && !e.shiftKey
      : e.key === "Enter" && (e.metaKey || e.ctrlKey);
    if (isSendCombo) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectionChange = () => {
    const el = taRef.current;
    if (!el) return;
    updateSlashState(text, el.selectionStart ?? text.length);
  };

  const handleFilePick = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    // Hard cap 15 attachments, total 25MB
    const MAX_FILES = 15;
    const MAX_BYTES = 25 * 1024 * 1024;
    const merged = [...files, ...picked].slice(0, MAX_FILES);
    const totalBytes = merged.reduce((s, f) => s + (f.size || 0), 0);
    if (totalBytes > MAX_BYTES) {
      alert("Attachments exceed 25MB total. Please pick smaller files.");
      return;
    }
    setFiles(merged);
    setPageRanges({});
    setPdfBase64(null);
    if (fileRef.current) fileRef.current.value = "";

    // If in MCQ mode and first file is a PDF, convert to base64 for PageRangeSelector
    if (isMcqMode && merged.length > 0 && merged[0].type === "application/pdf") {
      try {
        const b64 = await fileToBase64(merged[0]);
        setPdfBase64(b64);
      } catch {
        setPdfBase64(null);
      }
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPageRanges((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    if (idx === 0) setPdfBase64(null);
  };

  const handlePageRangeChange = (fileIndex, range) => {
    if (range === null) {
      setPageRanges((prev) => {
        const next = { ...prev };
        delete next[fileIndex];
        return next;
      });
    } else {
      setPageRanges((prev) => ({ ...prev, [fileIndex]: range }));
    }
  };

  const formatBytes = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  // For MCQ mode with PDF, check if page range is valid
  const hasPdfWithoutRange = isMcqMode && files.length > 0 && files[0].type === "application/pdf" && pageRanges[0] == null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
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

          {/* PDF Page Range Selector (shown in MCQ mode when a PDF is attached) */}
          {isMcqMode && files.length > 0 && files[0].type === "application/pdf" && pdfBase64 && (
            <div className="mx-4 mb-2">
              <PageRangeSelector
                fileIndex={0}
                base64Data={pdfBase64}
                onRangeChange={handlePageRangeChange}
              />
            </div>
          )}

          {/* Textarea row with mode badge */}
          <div className="relative flex items-start gap-2 px-4 pt-3 pb-2">
            {/* Mode badge pill — non-removable */}
            <span
              data-testid="mode-badge"
              className="mt-0.5 inline-flex shrink-0 select-none items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
            >
              {isMcqMode ? "@MCQ" : isImageMode ? "@Image" : "@Chat"}
            </span>

            {/* Textarea + bold-mirror overlay */}
            <div className="relative flex-1 min-w-0">
              {/* Mirror overlay: shows the same text but with /command bolded */}
              {!isMcqMode && !isImageMode && (() => {
                // Find /command token at start or after whitespace
                const m = text.match(/(^|.*?\s)(\/[\w-]*)([\s\S]*)$/);
                if (!m) return null;
                const [, before, slash, after] = m;
                return (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 select-none whitespace-pre-wrap break-words text-[15px] leading-relaxed text-black"
                    style={{ fontFamily: "inherit" }}
                  >
                    <span style={{ color: "transparent" }}>{before}</span>
                    <span className="font-bold text-zinc-900">{slash}</span>
                    <span style={{ color: "transparent" }}>{after}</span>
                  </div>
                );
              })()}

              <textarea
                data-testid="chat-textarea"
                ref={taRef}
                rows={1}
                value={text}
                onChange={handleInput}
                onKeyDown={handleKey}
                onSelect={handleSelectionChange}
                onBlur={() => setTimeout(() => setSlashOpen(false), 150)}
                placeholder={isMcqMode ? "Paste text or describe what to quiz on..." : isImageMode ? "Describe the image you want to generate..." : "Ask anything — type / for commands, or attach an image / PDF..."}
                className={cn(
                  "relative block max-h-[220px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-zinc-400",
                  // Hide the slash token visually (rendered by overlay) but only when overlay is active
                  !isMcqMode && !isImageMode && /(^|\s)\/[\w-]*/.test(text)
                    ? "text-transparent caret-zinc-900 selection:bg-zinc-200/80 selection:text-transparent"
                    : "text-black"
                )}
              />
            </div>

            {/* Slash command popup — compact, refined */}
            {slashOpen && !isMcqMode && !isImageMode && filteredCommands.length > 0 && (
              <div
                data-testid="slash-menu"
                className="absolute bottom-full left-2 right-2 z-40 mb-2.5 overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0_0_#000] sm:right-auto sm:w-[360px]"
                onMouseDown={(e) => e.preventDefault()}
              >
                {/* Compact header */}
                <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/50 px-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-700">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-black font-mono text-[9px] font-extrabold text-white">/</span>
                    Commands
                    <span className="text-zinc-300">·</span>
                    <span className="font-mono normal-case tracking-normal text-zinc-400">{filteredCommands.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] text-zinc-400">
                    <kbd className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded border border-zinc-300 bg-white px-0.5 font-mono text-[9px] font-semibold text-zinc-600">↑↓</kbd>
                    <kbd className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded border border-zinc-300 bg-white px-0.5 font-mono text-[9px] font-semibold text-zinc-600">↵</kbd>
                    <kbd className="inline-flex h-[15px] items-center rounded border border-zinc-300 bg-white px-1 font-mono text-[9px] font-semibold text-zinc-600">esc</kbd>
                  </div>
                </div>

                {/* Command list — tight rows */}
                <div className="max-h-[260px] overflow-y-auto py-1 [scrollbar-width:thin]">
                  {filteredCommands.map((cmd, i) => {
                    const Icon = cmd.icon;
                    const active = i === slashIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onMouseEnter={() => setSlashIndex(i)}
                        onClick={() => applyCommand(cmd)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                          active ? "bg-zinc-100" : "hover:bg-zinc-50"
                        )}
                      >
                        {/* Compact icon */}
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                            active ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>

                        {/* Single-line: label + description, with slash code on the right */}
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="text-[13px] font-semibold text-black">{cmd.label}</span>
                          <span className="min-w-0 truncate text-[11.5px] font-normal text-zinc-500">
                            {cmd.description}
                          </span>
                        </div>

                        {/* Slash code on the right — only visible on active */}
                        <code
                          className={cn(
                            "shrink-0 rounded border px-1 py-px font-mono text-[10px] font-semibold transition-all",
                            active
                              ? "border-black bg-black text-white"
                              : "border-zinc-200 bg-white text-zinc-400 opacity-60"
                          )}
                        >
                          /{cmd.id}
                        </code>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No-match state — same compact frame */}
            {slashOpen && !isMcqMode && !isImageMode && filteredCommands.length === 0 && (
              <div
                className="absolute bottom-full left-2 right-2 z-40 mb-2.5 rounded-xl border-2 border-black bg-white px-3 py-2.5 shadow-[4px_4px_0_0_#000] sm:right-auto sm:w-[360px]"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
                    <Search className="h-3 w-3" />
                  </span>
                  <span className="text-zinc-500">
                    No match for{" "}
                    <code className="rounded border border-zinc-300 bg-zinc-50 px-1 py-px font-mono text-[10.5px] font-semibold text-black">
                      /{slashQuery}
                    </code>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={!isMcqMode}
                className="hidden"
                onChange={handleFilePick}
              />
              {/* Attach button — hidden in image mode */}
              {!isImageMode && (
                <button
                  data-testid="chat-attach"
                  onClick={() => supportsVision && fileRef.current?.click()}
                  disabled={!supportsVision}
                  title={supportsVision ? "Attach image" : "This model does not support image or file attachments"}
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
              )}
              {/* Image mode: Resolution dropdown & Aspect Ratio dropdown */}
              {isImageMode && (() => {
                const selectedModel = IMAGE_MODELS.find(m => m.id === imageModel) || IMAGE_MODELS[0];
                const availableRes = RESOLUTION_OPTIONS.filter(r =>
                  selectedModel.resolutions.some(sr => sr.startsWith(String(r.base)))
                );
                return (
                  <>
                    <ImageDropdown
                      label={imageResolution}
                      options={availableRes.map(r => r.label)}
                      value={imageResolution}
                      onChange={onImageResolutionChange}
                      testId="image-resolution"
                    />
                    <ImageDropdown
                      label={imageAspectRatio}
                      options={ASPECT_RATIOS.map(a => a.label)}
                      value={imageAspectRatio}
                      onChange={onImageAspectRatioChange}
                      testId="image-aspect"
                    />
                  </>
                );
              })()}
            </div>

            <button
              data-testid={isMcqMode ? "generate-mcq" : "send-chat"}
              onClick={handleSubmit}
              disabled={!canSend || (isMcqMode && hasPdfWithoutRange)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200",
                (!canSend || (isMcqMode && hasPdfWithoutRange))
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
        {isMcqMode ? "Study AI can make mistakes. Verify important information." : isImageMode ? "Image generation may take a few seconds." : "Responses may be inaccurate. Verify important information."}
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

const ChatMessage = ({ role, content, modelName, modelProvider, files, quiz, generatedImage, isStreaming, feedback, onFeedback, onRegenerate }) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const liked = feedback === "like";
  const unliked = feedback === "dislike";

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLike = () => {
    if (onFeedback) onFeedback(liked ? null : "like");
  };

  const handleUnlike = () => {
    if (onFeedback) onFeedback(unliked ? null : "dislike");
  };
  
  let displayContent = content || "";
  if (!isUser) {
    displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/g, "");
    displayContent = displayContent.replace(/<think>[\s\S]*$/, "");
    displayContent = displayContent.trim();
  }

  // For image generation messages, hide the prompt text — show only the image
  // Two cases:
  //   1. New session: generatedImage prop is set → hide displayContent text
  //   2. Loaded from history: content contains ![Generated Image](url) markdown → strip the text after image
  const isImageMessage = !isUser && (generatedImage || /!\[Generated Image\]\([^)]+\)/.test(displayContent));
  if (isImageMessage) {
    if (generatedImage) {
      // New session — image rendered separately, hide all text
      displayContent = "";
    } else {
      // Loaded from history — keep only the image markdown, drop the trailing prompt text
      const imageMatch = displayContent.match(/!\[Generated Image\]\([^)]+\)/);
      displayContent = imageMatch ? imageMatch[0] : "";
    }
  }
  return (
    <div
      data-testid={`chat-message-${role}`}
      className={cn("flex gap-3", isUser ? "items-center justify-end" : "items-start justify-start")}
    >
      {/* Bot avatar — hidden on mobile, shown on desktop beside the bubble */}
      {!isUser && (
        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/10 sm:flex">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-full rounded-2xl px-3 py-2.5 text-[14px] leading-relaxed sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-[14.5px]",
          isUser
            ? "bg-black text-white"
            : "border border-zinc-200 bg-white text-zinc-800 shadow-sm"
        )}
      >
        {!isUser && (
          <div className="mb-1.5 flex items-center gap-1.5">
            {modelName && (
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500" style={{ fontStyle: "italic" }}>
                {modelProvider && (
                  <ProviderIcon
                    provider={modelProvider}
                    className="h-3 w-3 text-black"
                  />
                )}
                {modelName}
              </span>
            )}
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
            <div className={cn("sa-markdown overflow-hidden", isStreaming && "sa-streaming")}>
              <MathMarkdown content={displayContent} />
            </div>
          )
        )}

        {/* Generated image */}
        {!isUser && generatedImage && (
          <div className="mt-2">
            <img
              src={generatedImage}
              alt="AI Generated"
              className="max-w-full rounded-xl border border-zinc-200 shadow-sm"
              style={{ maxHeight: "400px", objectFit: "contain" }}
            />
          </div>
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
            {/* Download & Delete buttons for image messages */}
            {generatedImage && (
              <>
                <div className="mx-1 h-4 w-px bg-zinc-200" />
                <a
                  href={generatedImage}
                  download={`study-buddy-image-${Date.now()}.png`}
                  title="Download image"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                >
                  <Download className="h-[13px] w-[13px]" />
                </a>
                <button
                  onClick={() => {
                    if (confirm("Delete this image permanently?")) {
                      // Delete from server
                      fetch(`/api/delete-image`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path: generatedImage }),
                      }).catch(() => {});
                    }
                  }}
                  title="Delete image"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-[13px] w-[13px]" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {/* User avatar — hidden on mobile (shown inline inside bubble), shown on desktop beside the bubble */}
      {isUser && (
        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 sm:flex">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};

const TypingIndicator = ({ icon, label = "Thinking", modelProvider }) => {
  const isImageMode = label === "Creating image";

  // Special blur-based animation for image generation
  if (isImageMode) {
    return <ImageGenerationLoader />;
  }

  return (
    <div data-testid="typing-indicator" className="flex gap-3">
      {/* Avatar with sonar pulse rings — hidden on mobile, shown on desktop */}
      <div className="relative hidden h-8 w-8 shrink-0 sm:block">
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
};

/* ---------------- Image Generation Loader (morphing blob — modern minimal) ---------------- */
const ImageGenerationLoader = () => {
  const [scrambledStatus, setScrambledStatus] = useState("Imagining…");
  const [stage, setStage] = useState(0);

  const stages = [
    "Imagining…",
    "Sketching shapes…",
    "Adding details…",
    "Refining colors…",
    "Almost there…",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, stages.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Text scramble effect
  useEffect(() => {
    const target = stages[stage];
    const chars = "!<>-_\\/[]{}—=+*^?#$%&@";
    let frame = 0;
    let interval;

    const update = () => {
      let output = "";
      let complete = 0;
      for (let i = 0; i < target.length; i++) {
        const start = i * 2;
        const end = start + 8;
        if (frame >= end) {
          output += target[i];
          complete++;
        } else if (frame >= start) {
          output += chars[Math.floor(Math.random() * chars.length)];
        } else {
          output += target[i] === " " ? " " : "";
        }
      }
      setScrambledStatus(output);
      if (complete === target.length) clearInterval(interval);
      frame++;
    };

    interval = setInterval(update, 35);
    return () => clearInterval(interval);
  }, [stage]);

  return (
    <div data-testid="image-generation-loader" className="flex gap-3">
      {/* Avatar — hidden on mobile, shown on desktop */}
      <div className="relative hidden h-8 w-8 shrink-0 sm:block">
        <span className="sa-ping-ring" />
        <span className="sa-ping-ring delay-1" />
        <div className="sa-breathe relative flex h-8 w-8 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/10">
          <ImageIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Bubble with morphing blob */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="relative flex aspect-square w-[280px] items-center justify-center overflow-hidden rounded-xl bg-zinc-50 sm:w-[320px]">
          {/* Subtle dotted grid background */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Soft glow halo — pulses gently in the center */}
          <div className="absolute h-40 w-40 rounded-full bg-zinc-900/5 blur-2xl sa-blob-halo" />
        </div>

        {/* Status — monospace with scramble effect */}
        <div className="flex items-center gap-2 px-1">
          <div className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-zinc-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-900" />
          </div>
          <span
            className="text-[12px] font-medium text-zinc-700"
            style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }}
          >
            {scrambledStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

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
  const [headline, setHeadline] = useState(CHAT_HEADLINES[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHeadline(CHAT_HEADLINES[Math.floor(Math.random() * CHAT_HEADLINES.length)]);
    setMounted(true);
  }, []);

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-10 text-center sm:px-6 sm:py-14">
      {/* Soft background grid — barely-there texture for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(228 228 231 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(228 228 231 / 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black 40%, transparent 80%)",
        }}
      />

      {/* Headline */}
      <h1
        className={cn(
          "text-balance text-[28px] font-bold leading-[1.1] tracking-tight text-zinc-950 transition-all duration-500 sm:text-[40px] md:text-[52px]",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
        style={{ fontFamily: "'Manrope', system-ui, sans-serif", letterSpacing: "-0.025em" }}
      >
        {headline}
      </h1>

      {/* Subtitle */}
      <p
        className={cn(
          "mt-3 max-w-[280px] text-balance text-[13.5px] leading-relaxed text-zinc-500 transition-all duration-500 delay-100 sm:mt-4 sm:max-w-md sm:text-[16px]",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        Pick a starting point or just start typing your own.
      </p>

      {/* Footer keyboard hint — hidden on mobile (no keyboards there) */}
      <div
        className={cn(
          "mt-6 hidden items-center gap-2 text-[11px] text-zinc-400 transition-all duration-500 delay-500 sm:mt-7 sm:flex",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        <span>Type</span>
        <kbd className="inline-flex h-5 items-center rounded-md border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-semibold text-zinc-600 shadow-sm">
          /
        </kbd>
        <span>in the prompt for quick commands</span>
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
    <div className="mx-auto w-full max-w-4xl px-4 py-5 text-center sm:px-6 sm:py-8">
      <h1 className="mx-auto max-w-2xl text-[22px] font-semibold leading-[1.15] tracking-tight text-black sm:text-4xl md:text-5xl">
        {headline}
      </h1>
      <div className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-8 md:mt-10">
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
  const [section, setSection] = useState("chat"); // 'chat' | 'mcq' | 'image'
  const [activeId, setActiveId] = useState(null);

  // Persist current session (section + activeId) to localStorage
  // so refresh restores the user to where they were
  const ACTIVE_SESSION_KEY = "sa.activeSession.v1";
  useEffect(() => {
    try {
      const data = JSON.stringify({ section, activeId });
      localStorage.setItem(ACTIVE_SESSION_KEY, data);
    } catch {}
  }, [section, activeId]);

  // Settings (persisted) — start with defaults for SSR, hydrate on mount
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const saved = loadSettings();
    if (saved) setSettings(saved);
    setSettingsHydrated(true);
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
    // Only save AFTER initial hydration to avoid clobbering localStorage
    // with DEFAULT_SETTINGS during the first render
    if (!settingsHydrated) return;
    saveSettings(settings);
  }, [settings, settingsHydrated]);

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

  // Load from server on mount + restore active session
  useEffect(() => {
    refreshHistory();
    // Restore last active session from localStorage
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (saved) {
        const { section: savedSection, activeId: savedId } = JSON.parse(saved);
        if (savedSection && (savedSection === "chat" || savedSection === "mcq" || savedSection === "image")) {
          setSection(savedSection);
        }
        if (savedId) {
          // Defer the load so refreshHistory can populate sidebar first
          setTimeout(() => {
            handleSelect(savedId);
          }, 100);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MCQ state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeQuizTitle, setActiveQuizTitle] = useState("");
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState(null); // { kind, message }
  const [quizWarning, setQuizWarning] = useState(null); // non-blocking warning string (e.g., DB save failed)
  const [quizIncomplete, setQuizIncomplete] = useState(null); // { received: N, requested: M } when quiz is partial
  const [testSetupOpen, setTestSetupOpen] = useState(false); // Share with Friends modal
  const [testLink, setTestLink] = useState(null); // Created test link
  const [showSignInPrompt, setShowSignInPrompt] = useState(false); // Sign-in prompt for unauthenticated share
  const [examMode, setExamMode] = useState(false); // Exam mode toggle

  // Quiz streaming hook
  const {
    questions: streamedQuestions,
    isStreaming: isQuizStreaming,
    error: streamError,
    totalCount: streamTotalCount,
    quizId: streamQuizId,
    startStream: startQuizStream,
    abort: abortQuizStream,
  } = useQuizStream({
    onDone: (doneEvent) => {
      // When streaming completes, show quiz inline (no navigation)
      if (doneEvent.id) {
        // Check if incomplete even with a saved ID
        if (doneEvent.incomplete) {
          setQuizIncomplete({
            received: doneEvent.totalCount,
            requested: null, // we don't always know the requested count here
          });
        }
        // Load the saved quiz from the API for reliable interactive display
        fetch(buildUrl(`/api/quiz/${doneEvent.id}`))
          .then((r) => r.json())
          .then((data) => {
            if (data.quiz && data.quiz.questions) {
              setQuestions(normalizeQuestions(data.quiz.questions));
              setActiveQuizTitle(data.quiz.title || "");
            }
          })
          .catch(() => {
            // Fallback: use streamed questions if API load fails
            if (streamedQuestions.length > 0) {
              setQuestions(normalizeQuestions(streamedQuestions.map((q) => ({ ...q }))));
            }
          });
        setActiveId(doneEvent.id);
        setMcqLoading(false);
      } else if (doneEvent.fallbackData && doneEvent.fallbackData.length > 0) {
        // DB save failed — show questions inline from fallback data
        setQuestions(normalizeQuestions(doneEvent.fallbackData));
        setQuizWarning("Quiz generated but could not be saved to history.");
        if (doneEvent.incomplete) {
          setQuizIncomplete({
            received: doneEvent.fallbackData.length,
            requested: doneEvent.totalCount || null,
          });
        }
        setMcqLoading(false);
      } else if (doneEvent.incomplete && doneEvent.totalCount > 0) {
        // Partial stream — no ID, no fallback, but we have streamed questions
        // The streamedQuestions will be used for display
        setQuizIncomplete({
          received: doneEvent.totalCount,
          requested: null,
        });
        setMcqLoading(false);
      } else if (doneEvent.totalCount === 0) {
        setMcqError({
          kind: "generic",
          message: "No questions could be generated. Try rephrasing or use a richer source.",
        });
        setMcqLoading(false);
      } else {
        // Done with questions but no ID and no fallback — questions remain in streamedQuestions
        // They'll be shown via the error/partial rendering path
        setMcqLoading(false);
      }
    },
    onError: (message) => {
      // Check if it's an auth error (401-related message)
      if (message.includes("401") || message.toLowerCase().includes("api key") || message.toLowerCase().includes("unauthorized")) {
        setMcqError({
          kind: "auth",
          message: "Your NanoGPT API key is missing or invalid. Please add a valid key in Settings → API Key.",
        });
      } else {
        setMcqError({ kind: "generic", message });
      }
      setMcqLoading(false);
    },
  });

  // Chat state
  const [messages, setMessages] = useState([]); // {role, content, model, provider}
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [model, setModel] = useState("");
  const [imageModel, setImageModel] = useState("gpt-image-2");
  const [imageResolution, setImageResolution] = useState("1K");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");

  // When image model changes, ensure selected resolution is supported
  const handleImageModelChange = (newModelId) => {
    setImageModel(newModelId);
    const newModel = IMAGE_MODELS.find(m => m.id === newModelId);
    if (newModel) {
      const currentBase = (RESOLUTION_OPTIONS.find(r => r.label === imageResolution) || RESOLUTION_OPTIONS[0]).base;
      const isSupported = newModel.resolutions.some(r => r.startsWith(String(currentBase)));
      if (!isSupported) {
        // Pick the first supported resolution
        const firstRes = newModel.resolutions[0];
        const matchedOption = RESOLUTION_OPTIONS.find(r => firstRes.startsWith(String(r.base)));
        if (matchedOption) setImageResolution(matchedOption.label);
      }
    }
  };
  
  // Dynamic models state
  const [models, setModels] = useState(DEFAULT_MODELS);
  const chatScrollRef = useRef(null);
  // Mobile hamburger visibility — show on initial load, hide on scroll down, show on scroll up
  const [hamburgerVisible, setHamburgerVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  const currentModel = model ? models.find((m) => m.id === model) : null;

  // Hydrate model from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = loadSettings();
    if (saved.defaultModelId) {
      setModel(saved.defaultModelId);
    }
  }, []);

  // Fetch preferences from backend and apply (overrides localStorage)
  // This runs after auth is ready and takes priority
  useEffect(() => {
    if (!authUser) return;
    (async () => {
      try {
        const res = await fetch(buildUrl("/api/user/preferences"));
        if (res.ok) {
          const prefs = await res.json();
          if (prefs.defaultModelId) {
            setModel(prefs.defaultModelId);
            setSettings((prev) => ({
              ...prev,
              defaultModelId: prefs.defaultModelId,
              ...(prefs.sendOnEnter !== undefined && { sendOnEnter: prefs.sendOnEnter }),
            }));
          } else if (prefs.sendOnEnter !== undefined) {
            setSettings((prev) => ({ ...prev, sendOnEnter: prefs.sendOnEnter }));
          }
        }
      } catch {
        /* fallback to localStorage */
      }
    })();
  }, [authUser]);

  // Simple smooth auto-scroll — respects user manual scrolling
  const userScrolledUp = useRef(false);

  // Track user scroll intent
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const checkIfAtBottom = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUp.current = distFromBottom > 100;
    };

    // User scrolling up = pause auto-scroll
    el.addEventListener("scroll", checkIfAtBottom, { passive: true });
    return () => el.removeEventListener("scroll", checkIfAtBottom);
  }, []);

  // Auto-scroll to bottom when new content arrives (only if user hasn't scrolled up)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || userScrolledUp.current) return;

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Hide hamburger on scroll down, show on scroll up (mobile UX)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const current = el.scrollTop;
      const last = lastScrollTopRef.current;
      const delta = current - last;
      // Threshold to ignore tiny jitters
      if (Math.abs(delta) < 6) return;
      if (current <= 4) {
        // At the very top, always show
        setHamburgerVisible(true);
      } else if (delta > 0) {
        // Scrolling down → hide
        setHamburgerVisible(false);
      } else {
        // Scrolling up → show
        setHamburgerVisible(true);
      }
      lastScrollTopRef.current = current;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* --- MCQ handlers ---
   * startQuiz(payload) wires the MCQ composer to the backend's
   * `POST /api/generate-quiz` endpoint via SSE streaming.
   * Payload shapes:
   *   { text, complexity }
   *   { file, complexity }
   * Complexity is sent as a structured JSON field to the backend.
   * The AI always decides the optimal number of questions.
   */
  const startQuiz = async (payload) => {
    const p = payload && typeof payload === "object" ? payload : {};
    const modelId = currentModel?.id || "gemini-2.5-flash";

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

    // Compose clean prompt text (no appended metadata — complexity/count sent as structured fields)
    const promptText = userText || (theFile ? `Generate an MCQ quiz from the attached file "${theFile.name}".` : "");

    setQuestions([]);
    setAnswers({});
    setMcqError(null);
    setQuizWarning(null);
    setQuizIncomplete(null);
    setMcqLoading(true);

    requestAnimationFrame(() => {
      document
        .getElementById("quiz-anchor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const fileParts = theFile ? await filesToInlineParts([theFile]) : [];
      const streamPayload = {
        text: promptText,
        files: fileParts,
        modelId,
      };
      // Include page ranges if provided (only for PDFs with valid ranges)
      if (p.pageRanges && Object.keys(p.pageRanges).length > 0) {
        streamPayload.pageRanges = p.pageRanges;
      }
      startQuizStream(streamPayload);
    } catch (err) {
      setMcqError({
        kind: "generic",
        message:
          "Couldn't reach the quiz server. Check that your backend is running at /api/generate-quiz.",
      });
      setMcqLoading(false);
    }
  };

  /* --- Image Generation handler ---
   * Sends prompt to /api/generate-image, displays result in chat messages.
   * No history context is sent — only the prompt.
   */
  const handleImageGenerate = async (prompt, size) => {
    if (!prompt || !prompt.trim()) return;

    // Add user message to chat
    const userMsg = { role: "user", content: prompt, isImagePrompt: true };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Create conversation if needed
    let convId = activeId;
    if (!convId) {
      const title = `Image: ${prompt.slice(0, 30)}${prompt.length > 30 ? "..." : ""}`;
      const conv = await apiCreateConversation(title, "chat");
      if (conv?.id) {
        convId = conv.id;
        setActiveId(convId);
        setRecentChats((prev) => [{ id: convId, title, date: "Just now" }, ...prev]);
      } else {
        convId = `c_${Date.now()}`;
        setActiveId(convId);
      }
    }

    // Save user message
    if (convId) {
      apiSaveMessage(convId, { role: "user", content: prompt });
    }

    try {
      const res = await fetch(buildUrl("/api/generate-image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId: imageModel || "gpt-image-2",
          size: size || "1024x1024",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "error", kind: "generic", content: data.error || "Image generation failed." },
        ]);
      } else {
        const assistantMsg = {
          role: "assistant",
          content: data.revisedPrompt || `Generated image for: "${prompt}"`,
          generatedImage: data.imageUrl,
          model: data.model,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Save assistant message with image URL embedded (local path = permanent)
        if (convId) {
          apiSaveMessage(convId, {
            role: "assistant",
            content: `![Generated Image](${data.imageUrl})\n\n${data.revisedPrompt || `Generated image for: "${prompt}"`}`,
            model: data.model,
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", kind: "generic", content: "Couldn't reach the image generation server." },
      ]);
    } finally {
      setIsTyping(false);
      // Switch back to chat mode after generating
      setSection("chat");
    }
  };

  const handleAnswer = (i, opt) => {
    if (answers[i] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [i]: opt }));
  };
  const handleResetQuiz = () => {
    abortQuizStream();
    setQuestions([]);
    setAnswers({});
    setActiveQuizTitle("");
    setActiveId(null);
    setMcqError(null);
    setQuizWarning(null);
    setQuizIncomplete(null);
    setMcqLoading(false);
    setExamMode(false);
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
    userScrolledUp.current = false; // Resume auto-scroll on new message
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    if (!currentModel) {
      setIsTyping(false);
      return;
    }
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
      // Convert File objects → Gemini inlineData parts (compresses images)
      setIsProcessingFiles(incomingFiles.length > 0);
      const fileParts = await filesToInlineParts(incomingFiles);
      setIsProcessingFiles(false);

      // Send chat history for context-aware conversation (exclude image gen messages)
      // If the last assistant message has feedback, prepend a system note to the new user message
      const lastAssistantWithFeedback = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.feedback);
      const feedbackNote = lastAssistantWithFeedback
        ? lastAssistantWithFeedback.feedback === "like"
          ? "[User liked your previous response.] "
          : "[User disliked your previous response.] "
        : "";
      const chatHistoryForApi = messages
        .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isImagePrompt && !m.generatedImage)
        .map((m) => ({ role: m.role, content: m.content || "" }));
      // Inject feedback note into the user message text sent to API
      const apiUserText = feedbackNote + textStr;

      const res = await fetch(buildUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: apiUserText,
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

      // Typewriter buffer — chunks queue here, drain at steady reading pace
      let textQueue = "";
      let streamDone = false;
      let typewriterRaf = null;
      let lastTickTime = performance.now();

      // Reveal speed — characters per second.
      // ~80 chars/sec ≈ comfortable reading + still feels responsive.
      // Auto-speeds-up if queue grows too large to avoid lag at end of stream.
      const BASE_CHARS_PER_SEC = 60;
      const MAX_BUFFER_BEFORE_SPEEDUP = 100;

      const tickTypewriter = (now) => {
        const dt = (now - lastTickTime) / 1000; // seconds since last tick
        lastTickTime = now;

        if (textQueue.length > 0) {
          // Adaptive speed — if queue is large, reveal faster
          const speedMultiplier = 1 + textQueue.length / MAX_BUFFER_BEFORE_SPEEDUP;
          const charsToReveal = Math.max(1, Math.floor(dt * BASE_CHARS_PER_SEC * speedMultiplier));
          const revealed = textQueue.slice(0, charsToReveal);
          textQueue = textQueue.slice(charsToReveal);

          setMessages((prev) => {
            const updated = [...prev];
            const idx = assistantIdx.current;
            if (idx >= 0 && updated[idx]) {
              updated[idx] = {
                ...updated[idx],
                content: updated[idx].content + revealed,
              };
            }
            return updated;
          });
        }

        // Continue ticking if there's still text to reveal OR stream is still going
        if (textQueue.length > 0 || !streamDone) {
          typewriterRaf = requestAnimationFrame(tickTypewriter);
        } else {
          typewriterRaf = null;
        }
      };

      const startTypewriter = () => {
        if (typewriterRaf) return;
        lastTickTime = performance.now();
        typewriterRaf = requestAnimationFrame(tickTypewriter);
      };

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
                textQueue += delta;
                startTypewriter();
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
        // Stream finished — typewriter will drain the rest naturally
        streamDone = true;
        // Wait for typewriter to finish revealing
        while (textQueue.length > 0) {
          await new Promise((r) => setTimeout(r, 50));
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
      setIsProcessingFiles(false);
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
    if (!currentModel) {
      setIsTyping(false);
      return;
    }
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

      // Typewriter buffer — reveal at steady reading pace
      let textQueue = "";
      let streamDone = false;
      let typewriterRaf = null;
      let lastTickTime = performance.now();
      const BASE_CHARS_PER_SEC = 60;
      const MAX_BUFFER_BEFORE_SPEEDUP = 100;

      const tickTypewriter = (now) => {
        const dt = (now - lastTickTime) / 1000;
        lastTickTime = now;
        if (textQueue.length > 0) {
          const speedMultiplier = 1 + textQueue.length / MAX_BUFFER_BEFORE_SPEEDUP;
          const charsToReveal = Math.max(1, Math.floor(dt * BASE_CHARS_PER_SEC * speedMultiplier));
          const revealed = textQueue.slice(0, charsToReveal);
          textQueue = textQueue.slice(charsToReveal);
          setMessages((prev) => {
            const updated = [...prev];
            const idx = assistantIdx.current;
            if (idx >= 0 && updated[idx]) {
              updated[idx] = { ...updated[idx], content: updated[idx].content + revealed };
            }
            return updated;
          });
        }
        if (textQueue.length > 0 || !streamDone) {
          typewriterRaf = requestAnimationFrame(tickTypewriter);
        } else {
          typewriterRaf = null;
        }
      };
      const startTypewriter = () => {
        if (typewriterRaf) return;
        lastTickTime = performance.now();
        typewriterRaf = requestAnimationFrame(tickTypewriter);
      };

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
                textQueue += delta;
                startTypewriter();
              }
              if (chunk.usage) streamUsage = chunk.usage;
            } catch {}
          }
        }
      }
      streamDone = true;
      while (textQueue.length > 0) {
        await new Promise((r) => setTimeout(r, 50));
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

  /* --- Like/Dislike feedback --- */
  const handleSetFeedback = async (messageIdx, value) => {
    // Update local state
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[messageIdx]) {
        updated[messageIdx] = { ...updated[messageIdx], feedback: value };
      }
      return updated;
    });
    // Persist to backend (fire-and-forget)
    if (activeId) {
      try {
        await fetch(buildUrl(`/api/conversations/${activeId}/messages`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIndex: messageIdx, feedback: value }),
        });
      } catch {
        // Non-blocking — UI already reflects the change
      }
    }
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
    if (section === "chat" || section === "image") handleResetChat();
    else handleResetQuiz();
    if (isMobile()) setSidebarOpen(false);
  };
  const handleSelect = async (id) => {
    setActiveId(id);
    if (section === "chat" || section === "image") {
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
          feedback: m.reaction || undefined,
        }));
        setMessages(loaded);
      }
    } else {
      // Load quiz inline instead of navigating to /mcq/{id}
      setQuestions([]);
      setAnswers({});
      setMcqError(null);
      setQuizWarning(null);
      setQuizIncomplete(null);
      setMcqLoading(true);
      try {
        const res = await fetch(buildUrl(`/api/quiz/${id}`));
        const data = await res.json();
        if (data.quiz && data.quiz.questions) {
          setQuestions(normalizeQuestions(data.quiz.questions));
          setActiveQuizTitle(data.quiz.title || "");
        } else {
          setMcqError({ kind: "generic", message: "Could not load quiz." });
        }
      } catch {
        setMcqError({ kind: "generic", message: "Failed to load quiz from server." });
      }
      setMcqLoading(false);
    }
    if (isMobile()) setSidebarOpen(false);
  };

  // Delete a recent item (chat or MCQ depending on section).
  // If we're deleting the currently-open one, also clear its main-pane state.
  const handleDelete = async (id) => {
    if (section === "chat" || section === "image") {
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
  const handleSaveSettings = async (next) => {
    setSettings(next);
    // Persist preferences to backend (tied to user account)
    try {
      await fetch(buildUrl("/api/user/preferences"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultModelId: next.defaultModelId,
          sendOnEnter: next.sendOnEnter,
        }),
      });
    } catch {
      /* localStorage fallback already handled by the useEffect */
    }
  };

  // Wrapper: when user picks a model from the switcher, persist it as their default
  const handleModelChange = (newModelId) => {
    setModel(newModelId);
    setSettings((prev) => ({ ...prev, defaultModelId: newModelId }));
    // Fire-and-forget backend persistence (only if authenticated)
    if (authUser) {
      fetch(buildUrl("/api/user/preferences"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModelId: newModelId }),
      }).catch(() => { /* localStorage fallback handled by useEffect */ });
    }
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
    <div className="relative w-full overflow-hidden bg-white text-black antialiased" style={{ minHeight: 'var(--app-height, 100vh)' }}>
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

      <div className="relative flex w-full" style={{ height: 'var(--app-height, 100vh)' }}>
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

        <main className="relative flex min-w-0 flex-1 flex-col" style={{ height: 'var(--app-height, 100vh)' }}>


          {/* Top bar — floating pill on both mobile + desktop. Slides on mobile scroll. */}
          <div
            aria-hidden={!hamburgerVisible && !sidebarOpen ? false : undefined}
            className={cn(
              "absolute left-3 right-3 top-3 z-20 flex h-11 items-center gap-2 rounded-2xl border border-zinc-200/60 bg-white/80 px-2 shadow-sm backdrop-blur-md transition-all duration-300 ease-out",
              // On desktop: shrink to ~1/3 width and center horizontally
              "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:max-w-[480px] sm:px-2.5",
              // Mobile-only: hide when drawer is open or scrolling down. Desktop is always visible.
              sidebarOpen
                ? "max-sm:-translate-y-[120%] max-sm:opacity-0 max-sm:pointer-events-none"
                : hamburgerVisible
                ? "translate-y-0 opacity-100 pointer-events-auto sm:-translate-x-1/2"
                : "max-sm:-translate-y-[120%] max-sm:opacity-0 max-sm:pointer-events-none sm:translate-y-0 sm:opacity-100 sm:pointer-events-auto sm:-translate-x-1/2"
            )}
          >
            {/* Menu trigger — mobile only (desktop has the collapsible sidebar) */}
            <button
              data-testid="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-black active:bg-zinc-200 sm:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>

            {/* Announcements bell — both mobile and desktop */}
            <AnnouncementsBell />

            {/* Model switcher — context-aware (chat or image model) */}
            <div className="min-w-0 flex-1">
              {section === "image" ? (
                <ImageDropdown
                  label={IMAGE_MODELS.find(m => m.id === imageModel)?.name || "Select Model"}
                  options={IMAGE_MODELS.map(m => m.name)}
                  value={IMAGE_MODELS.find(m => m.id === imageModel)?.name || ""}
                  onChange={(name) => {
                    const found = IMAGE_MODELS.find(m => m.name === name);
                    if (found) setImageModel(found.id);
                  }}
                  testId="image-model"
                  icon={IMAGE_MODELS.find(m => m.id === imageModel)?.icon}
                  models={IMAGE_MODELS}
                />
              ) : (
                <ModelSwitcher models={models} value={model} onChange={setModel} />
              )}
            </div>

            {/* Section segmented control — Chat / Image / Quiz */}
            <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-zinc-100/80 p-0.5">
              {[
                { id: "chat", label: "Chat", Icon: MessageCircle },
                { id: "image", label: "Image", Icon: ImageIcon },
                { id: "mcq", label: "Quiz", Icon: ListChecks },
              ].map(({ id, label, Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    data-testid={`top-section-${id}`}
                    onClick={() => handleSectionChange(id)}
                    aria-label={label}
                    title={label}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors sm:px-2.5",
                      active
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden text-[12px] font-medium sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scroll area */}
          <div
            ref={chatScrollRef}
            className="relative flex flex-1 flex-col overflow-y-auto"
          >
            {(section === "chat" || section === "image") ? (
              <>
                {!hasChat && (
                  <div className="flex flex-1 items-end justify-center px-2 pb-2 pt-14 sm:items-center sm:px-4 sm:py-8">
                    <ChatHero onPick={handleSend} />
                  </div>
                )}
                {hasChat && (
                  <div className="mx-auto w-full max-w-4xl space-y-5 px-3 pb-36 pt-16 sm:px-6 sm:pb-48 sm:pt-20">
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
                          generatedImage={m.generatedImage}
                          isStreaming={isTyping && m.role === "assistant" && i === messages.length - 1}
                          feedback={m.feedback}
                          onFeedback={(value) => handleSetFeedback(i, value)}
                          onRegenerate={i === messages.length - 1 ? handleRegenerate : undefined}
                        />
                      )
                    )}
                    {isProcessingFiles && (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2">
                          <Upload className="h-3.5 w-3.5 animate-bounce text-zinc-500" />
                          <span className="text-[12px] font-medium text-zinc-600">Compressing image...</span>
                          <span className="flex gap-0.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                          </span>
                        </div>
                      </div>
                    )}
                    {isTyping && currentModel && (
                      <TypingIndicator
                        modelProvider={currentModel.provider}
                        label={messages.length > 0 && messages[messages.length - 1]?.isImagePrompt ? "Creating image" : "Thinking"}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {!hasQuiz && !mcqLoading && !isQuizStreaming && !mcqError && !(quizIncomplete && streamedQuestions.length > 0) && (
                  <div className="flex flex-1 items-end justify-center px-2 pb-2 pt-14 sm:items-center sm:px-4 sm:py-8">
                    <MCQHero />
                  </div>
                )}
                <div id="quiz-anchor" />
                {/* Fallback quiz display — when questions are loaded inline (DB save failed or incomplete) */}
                {hasQuiz && !isQuizStreaming && (
                  <div className="mx-auto w-full max-w-4xl px-4 pb-36 pt-16 sm:px-6 sm:pb-48 sm:pt-20">
                    {examMode ? (
                      <ExamModeView
                        questions={questions}
                        durationSeconds={questions.length * 60}
                        onExit={() => setExamMode(false)}
                      />
                    ) : (
                    <>
                    {/* Warning banner: quiz not saved to history */}
                    {quizWarning && (
                      <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span className="flex-1 text-[13px] font-medium text-amber-800">
                          {quizWarning}
                        </span>
                        <button
                          onClick={() => setQuizWarning(null)}
                          className="shrink-0 rounded p-0.5 text-amber-600 transition hover:bg-amber-100 hover:text-amber-800"
                          aria-label="Dismiss warning"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Incomplete quiz indicator */}
                    {quizIncomplete && (
                      <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="text-[13px] font-medium text-blue-800">
                          Partial quiz: {quizIncomplete.received} question{quizIncomplete.received === 1 ? "" : "s"} generated (generation was interrupted)
                        </span>
                      </div>
                    )}
                    {/* Interactive quiz cards */}
                    <MCQCardUI
                      questions={questions}
                      answers={answers}
                      onAnswer={handleAnswer}
                      mode="practice"
                    />
                    {/* Reset button + Exam Mode + Share with Friends */}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={handleResetQuiz}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-black"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        New Quiz
                      </button>
                      <button
                        data-testid="exam-mode-btn"
                        onClick={() => setExamMode(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Exam Mode
                      </button>
                      {activeId && questions.length > 0 && (
                        <button
                          data-testid="share-with-friends-btn"
                          onClick={() => {
                            if (!authUser) {
                              setShowSignInPrompt(true);
                            } else {
                              setTestSetupOpen(true);
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-zinc-800"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share with Friends
                        </button>
                      )}
                    </div>
                    {/* Sign-in prompt for unauthenticated users */}
                    {showSignInPrompt && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl">
                          <div className="mb-4 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                              <LogIn className="h-5 w-5 text-zinc-600" />
                            </span>
                            <div>
                              <h3 className="text-[15px] font-semibold text-zinc-900">Sign in required</h3>
                              <p className="text-[13px] text-zinc-500">Please sign in to share quizzes</p>
                            </div>
                          </div>
                          <p className="mb-5 text-[13px] text-zinc-600">
                            You need to be signed in to generate shareable quiz links for your friends.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowSignInPrompt(false)}
                              className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => { window.location.href = "/login"; }}
                              className="flex-1 rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"
                            >
                              Sign in
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Share with Friends Setup Form Modal */}
                    {testSetupOpen && activeId && (
                      <SetupForm
                        quizId={activeId}
                        mcqCount={questions.length}
                        onCreated={(link) => setTestLink(link)}
                        onClose={() => { setTestSetupOpen(false); setTestLink(null); }}
                      />
                    )}
                    </>
                    )}
                  </div>
                )}
                {/* Streaming progress indicator + progressive questions */}
                {isQuizStreaming && (
                  <div className="mx-auto w-full max-w-4xl px-4 pb-36 pt-16 sm:px-6 sm:pb-48 sm:pt-20">
                    {/* Progress indicator */}
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                      <span className="text-[13px] font-medium text-zinc-700">
                        {streamedQuestions.length === 0
                          ? `Generating your quiz${currentModel ? ` with ${currentModel.name}` : ""}...`
                          : `${streamedQuestions.length} question${streamedQuestions.length === 1 ? "" : "s"} generated...`}
                      </span>
                    </div>
                    {/* Progressive question cards — uses MCQCardUI in practice mode */}
                    <MCQCardUI
                      questions={streamedQuestions}
                      answers={answers}
                      onAnswer={handleAnswer}
                      mode="practice"
                    />
                  </div>
                )}
                {mcqLoading && !isQuizStreaming && (
                  <div
                    data-testid="mcq-loading"
                    className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 px-4 py-8 sm:px-6"
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
                {!mcqLoading && !isQuizStreaming && mcqError && (
                  <div
                    data-testid="mcq-error"
                    className="mx-auto w-full max-w-4xl px-4 pt-24 sm:px-6"
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
                        {/* Show any partial questions received before error */}
                        {streamedQuestions.length > 0 && (
                          <p className="mt-1 text-[12px] text-red-600">
                            Showing {streamedQuestions.length} question{streamedQuestions.length === 1 ? "" : "s"} received before the error.
                          </p>
                        )}
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
                    {/* Render partial questions in interactive state on error */}
                    {streamedQuestions.length > 0 && !hasQuiz && (
                      <div className="mt-6">
                        <MCQCardUI
                          questions={streamedQuestions}
                          answers={answers}
                          onAnswer={handleAnswer}
                          mode="practice"
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Incomplete stream display — when stream ended incomplete, no error, partial questions available */}
                {!mcqLoading && !isQuizStreaming && !mcqError && !hasQuiz && quizIncomplete && streamedQuestions.length > 0 && (
                  <div className="mx-auto w-full max-w-4xl px-4 pb-36 pt-16 sm:px-6 sm:pb-48 sm:pt-20">
                    {/* Incomplete indicator */}
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-[13px] font-medium text-blue-800">
                        Partial quiz: {quizIncomplete.received} question{quizIncomplete.received === 1 ? "" : "s"} generated (generation was interrupted)
                      </span>
                    </div>
                    {/* Interactive partial questions */}
                    <MCQCardUI
                      questions={streamedQuestions}
                      answers={answers}
                      onAnswer={handleAnswer}
                      mode="practice"
                    />
                    {/* Reset button */}
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleResetQuiz}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-black"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        New Quiz
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Draggable Composer */}
          <DraggableComposer>
              <ChatComposer
                models={models}
                onSend={handleSend}
                onQuizSubmit={startQuiz}
                onImageGenerate={handleImageGenerate}
                model={model}
                onModelChange={handleModelChange}
                imageModel={imageModel}
                onImageModelChange={handleImageModelChange}
                imageResolution={imageResolution}
                onImageResolutionChange={setImageResolution}
                imageAspectRatio={imageAspectRatio}
                onImageAspectRatioChange={setImageAspectRatio}
                sendOnEnter={settings.sendOnEnter}
                disabled={isTyping}
                section={section}
                onSectionChange={setSection}
              />
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
