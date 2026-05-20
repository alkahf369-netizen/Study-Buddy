# Study Buddy — Implementation Roadmap v2

> Last updated: 14 May 2026  
> এই plan step-by-step execution-ready — প্রতিটা step-এ কী file touch হবে, কী approach, আর estimated effort আছে।

---

## 🟢 Current State (Already Working)

- ✅ Google OAuth + NextAuth v5 session
- ✅ Streaming chat (SSE) + multimodal image input
- ✅ MCQ generation API (text + image → JSON)
- ✅ Conversation persistence + ownership check
- ✅ Per-user encrypted API key (AES-256-GCM)
- ✅ Dynamic model list (release-date scoring + NEW badge + vision detect)
- ✅ Paper-style MCQ player + best-score (localStorage)
- ✅ Marketing landing page + animated demos
- ✅ Settings modal (5-tab) + sidebar
- ✅ Mobile responsive optimization (dvh, sticky composer, compact hero)

---

## 📋 Execution Plan — 6 Sprints

---

### Sprint 1: Quick Wins & Bug Fixes (1-2 days)

**Goal:** Fix the "fake UI" problem — make existing UI controls actually work.

#### Step 1.1 — Wire Complexity & Count to Backend
- **Problem:** UI collects complexity + count but never sends to API
- **Files:**
  - `src/components/StudyAssistant.jsx` → `postGenerateQuiz` function — add `complexity`, `count`, `aiAutoCount` to payload
  - `src/app/api/generate-quiz/route.ts` → destructure new params, inject into `promptText`
- **Prompt template change:**
  ```
  Generate exactly ${count} questions at "${complexity}" difficulty level.
  - recall = definitions, basic facts
  - apply = practical scenarios, worked examples  
  - analyze = compare/contrast, break down concepts
  - mastery = multi-step reasoning, exam-grade
  ```
- **Effort:** ~30 min

#### Step 1.2 — Save Complexity & Count in DB
- **Files:**
  - `prisma/schema.prisma` → Quiz model-এ add: `complexity String?`, `requestedCount Int?`
  - `src/app/api/generate-quiz/route.ts` → `prisma.quiz.create` data-তে include
- **Migration:** `npx prisma migrate dev --name add-quiz-complexity`
- **Effort:** ~20 min

#### Step 1.3 — README Documentation
- **File:** `README.md` (replace boilerplate)
- **Content:**
  - Project description
  - Tech stack (Next.js 16, Prisma, SQLite, NextAuth v5, Tailwind v4)
  - Environment variables list with descriptions
  - Setup steps (clone → install → env → prisma migrate → dev)
  - Screenshots (optional, add later)
- **Effort:** ~30 min

#### Step 1.4 — Cleanup Dead Files
- **Delete:** `nano_gpt_models.txt`, `models_output.json`, `backend_for_emergent.md`
- **Effort:** ~5 min

---

### Sprint 2: PDF Upload + Quiz Streaming (2-3 days)

**Goal:** Make PDF a first-class input; improve quiz generation UX.

#### Step 2.1 — PDF Upload (Full Support)
- **Current state:** UI accepts PDF, sends as base64 — works if AI model supports it natively
- **Enhancement needed:**
  - `src/app/api/generate-quiz/route.ts` → detect PDF mimeType, send as document part (not image_url)
  - For models that don't support native PDF: extract text server-side using `pdf-parse` package
  - Add file size validation (max 10MB)
- **New dependency:** `npm install pdf-parse` (fallback only)
- **Files:**
  - `src/app/api/generate-quiz/route.ts` — PDF handling branch
  - `src/components/StudyAssistant.jsx` — file size validation in `MCQComposer`
- **Effort:** ~3-4 hours

#### Step 2.2 — Quiz Generation Streaming (Progressive Reveal)
- **Problem:** User waits 20-30s staring at a spinner
- **Approach:** 
  - Change `/api/generate-quiz` to SSE (like chat already does)
  - Stream partial JSON — as each question completes, push to client
  - Client renders questions one-by-one with animation
- **Files:**
  - `src/app/api/generate-quiz/route.ts` → SSE response with `ReadableStream`
  - `src/components/StudyAssistant.jsx` → `startQuiz` function — consume SSE, progressive state update
- **Effort:** ~4-5 hours

---

### Sprint 3: YouTube Summarize + Token Tracking (2-3 days)

**Goal:** Add the second major promised feature; instrument usage.

#### Step 3.1 — YouTube Video Summarize
- **New dependency:** `npm install youtube-transcript`
- **New files:**
  - `src/app/api/summarize-youtube/route.ts`
    - Accept `{ url, mode: "summarize" | "quiz", modelId }`
    - Fetch transcript via `youtube-transcript`
    - If mode=summarize → send to AI with summarize prompt → return markdown
    - If mode=quiz → pipe to existing quiz generation logic
  - `src/components/StudyAssistant.jsx` → Add YouTube URL input mode in MCQComposer
    - Detect YouTube URL pattern in textarea
    - Show "Generate from YouTube" button
- **UI flow:** User pastes YouTube link → detects automatically → "Summarize" or "Quiz from video" buttons appear
- **Effort:** ~4-5 hours

#### Step 3.2 — Token Usage Tracking (Server-side)
- **New Prisma model:**
  ```prisma
  model TokenUsage {
    id           String   @id @default(cuid())
    userId       String?
    model        String
    inputTokens  Int
    outputTokens Int
    endpoint     String   @default("chat")
    createdAt    DateTime @default(now())
  }
  ```
- **Files:**
  - `prisma/schema.prisma` — add model
  - `src/app/api/chat/route.ts` — after AI response, extract `usage` from response, save to DB
  - `src/app/api/generate-quiz/route.ts` — same
  - `src/app/api/user/usage/route.ts` (new) — GET endpoint for user's usage stats
- **Migration:** `npx prisma migrate dev --name add-token-usage`
- **Effort:** ~3 hours

#### Step 3.3 — Connect Usage Tab in Settings
- **File:** `src/components/StudyAssistant.jsx` → Settings modal Usage tab
- **Change:** Replace localStorage-based display with API call to `/api/user/usage`
- **Effort:** ~1 hour

---

### Sprint 4: Quiz Attempts + Mastery Dashboard (3-4 days)

**Goal:** Server-side score tracking; visual progress.

#### Step 4.1 — Quiz Attempt History (Server-side)
- **New Prisma model:**
  ```prisma
  model QuizAttempt {
    id           String   @id @default(cuid())
    userId       String
    quizId       String
    correctCount Int
    totalCount   Int
    percentage   Float
    grade        String
    answers      String   // JSON array of user's answers
    quiz         Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
    createdAt    DateTime @default(now())
  }
  ```
- **New API routes:**
  - `src/app/api/quiz/[id]/attempt/route.ts` — POST (save attempt), GET (list attempts)
- **Frontend change:**
  - `src/app/mcq/[id]/McqClientView.tsx` → on quiz complete, POST attempt to server
  - Show attempt history below quiz result
- **Migration:** `npx prisma migrate dev --name add-quiz-attempts`
- **Effort:** ~4-5 hours

#### Step 4.2 — Mastery Dashboard
- **New files:**
  - `src/app/dashboard/page.tsx` — server component, fetch user stats
  - `src/app/dashboard/DashboardClient.tsx` — client component with charts
- **Dashboard sections:**
  - Total quizzes taken (number card)
  - Average score (gauge/progress)
  - Score trend over time (line chart — recharts already installed)
  - Weak topics (lowest scoring quizzes)
  - Recent activity feed
- **API:** `src/app/api/user/stats/route.ts` — aggregate quiz attempts
- **Sidebar:** Add "Dashboard" link in sidebar navigation
- **Effort:** ~6-8 hours

---

### Sprint 5: Code Quality & Dark Mode (3-4 days)

**Goal:** Make codebase maintainable; add dark mode.

#### Step 5.1 — Dark Mode
- **Approach:** `next-themes` already installed
- **Files:**
  - `src/app/layout.tsx` → wrap with `<ThemeProvider attribute="class">`
  - `src/app/globals.css` → `.dark` variables already defined, verify completeness
  - `src/components/StudyAssistant.jsx` → add theme toggle button in header/settings
  - Component-by-component: replace hardcoded `bg-white`, `text-black` with `bg-background`, `text-foreground` or `dark:` variants
- **Effort:** ~6-8 hours (many classes to update)

#### Step 5.2 — Refactor StudyAssistant.jsx (4800 lines → modular)
- **Target structure:**
  ```
  src/components/study/
  ├── Sidebar.tsx
  ├── ModelSwitcher.tsx
  ├── DraggableComposer.tsx
  ├── settings/
  │   ├── SettingsModal.tsx
  │   ├── ProfileTab.tsx
  │   ├── ApiKeysTab.tsx
  │   └── UsageTab.tsx
  ├── chat/
  │   ├── ChatComposer.tsx
  │   ├── ChatMessage.tsx
  │   ├── ChatHero.tsx
  │   └── TypingIndicator.tsx
  ├── mcq/
  │   ├── MCQComposer.tsx
  │   ├── MCQHero.tsx
  │   └── QuizView.tsx
  └── shared/
      ├── ComplexityPicker.tsx
      ├── CountStepper.tsx
      └── types.ts
  ```
- **Approach:** Extract one component at a time, test after each extraction
- **Effort:** ~8-10 hours (can be done incrementally)

#### Step 5.3 — Error Boundaries
- **File:** `src/app/error.tsx` (Next.js app router error boundary)
- **Also:** Wrap main StudyAssistant in React Error Boundary with fallback UI
- **Effort:** ~1 hour

---

### Sprint 6: Production Readiness (4-5 days)

**Goal:** Deploy-ready with PostgreSQL, Docker, CI/CD.

#### Step 6.1 — SQLite → PostgreSQL Migration
- **Files:**
  - `prisma/schema.prisma` → `provider = "postgresql"`
  - Remove `@prisma/adapter-better-sqlite3` and `better-sqlite3` from package.json
  - Add `@prisma/client` PostgreSQL support
  - `src/lib/prisma.ts` → remove SQLite adapter, use standard PrismaClient
  - `.env.local` → `DATABASE_URL="postgresql://..."`
- **Effort:** ~2-3 hours

#### Step 6.2 — Docker Setup
- **New files:**
  - `Dockerfile` (multi-stage: deps → build → runtime)
  - `docker-compose.yml` (app + postgres + optional nginx)
  - `.dockerignore`
- **Effort:** ~2-3 hours

#### Step 6.3 — Rate Limiting
- **New dependency:** `npm install @upstash/ratelimit @upstash/redis` (or in-memory alternative)
- **New file:** `src/lib/ratelimit.ts`
- **Apply to:** `/api/chat`, `/api/generate-quiz`, `/api/summarize-youtube`
- **Limit:** 30 requests/minute per user
- **Effort:** ~2 hours

#### Step 6.4 — Security Headers
- **File:** `next.config.ts` → add security headers (X-Frame-Options, CSP, etc.)
- **Effort:** ~30 min

#### Step 6.5 — CI/CD (GitHub Actions)
- **New file:** `.github/workflows/ci.yml`
  - On PR: lint + typecheck + build
  - On main merge: deploy to VPS (SSH + docker compose pull)
- **Effort:** ~2 hours

---

## 🔮 Future (Phase 5 — After Production Launch)

| Feature | Priority | Effort |
|---------|----------|--------|
| AI Image Generator | Medium | 4-5h |
| i18n (English ↔ Bangla) | Medium | 8-10h |
| Spaced Repetition (Anki-style) | Low | 10-12h |
| Flashcard Mode | Low | 6-8h |
| Voice Mode (STT/TTS) | Low | 6-8h |
| Quiz Sharing (public links) | Low | 4-5h |
| PDF Export | Low | 3-4h |
| Collaborative Study (websocket) | Low | 15-20h |
| Mobile PWA | Low | 4-5h |

---

## 📊 Priority Decision Matrix

| যদি তোমার priority হয়... | তাহলে শুরু করো... |
|---|---|
| Fake UI fix করা (সবচেয়ে urgent) | Sprint 1 (Step 1.1) |
| Plan-এর pending features finish | Sprint 2 + 3 |
| User retention বাড়ানো | Sprint 4 (Attempts + Dashboard) |
| Visual quick win | Sprint 5.1 (Dark mode) |
| Codebase manageable রাখা | Sprint 5.2 (Refactor) |
| Live deploy করা | Sprint 6 |

---

## ⏱️ Total Estimated Effort

| Sprint | Days | Focus |
|--------|------|-------|
| Sprint 1 | 1-2 | Bug fixes + docs |
| Sprint 2 | 2-3 | PDF + streaming |
| Sprint 3 | 2-3 | YouTube + token tracking |
| Sprint 4 | 3-4 | Attempts + dashboard |
| Sprint 5 | 3-4 | Dark mode + refactor |
| Sprint 6 | 4-5 | Production deploy |
| **Total** | **~15-21 days** | Full roadmap completion |

---

## 🚀 Recommended Start

**Sprint 1, Step 1.1** — এটা 30 মিনিটের কাজ কিন্তু সবচেয়ে impactful fix। User এখন complexity select করলে কিছুই হয় না — এটা fix করলে immediately quiz quality improve হবে।

---

## 📝 Open Questions

1. PDF upload-এ size limit কত? → Suggested: 10MB
2. YouTube transcript language? → Auto-detect (Bangla + English priority)
3. Mastery dashboard-এ topic tagging কি দরকার? → হ্যাঁ, Quiz model-এ `topic String?` add করতে হবে
4. PostgreSQL migration কখন? → Sprint 6-এ, production-এর আগে
5. i18n Bangla copy কে লিখবে? → LLM-assisted + manual review
