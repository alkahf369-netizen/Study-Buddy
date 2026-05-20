# Study Buddy

An AI-powered study assistant that generates multiple-choice quizzes and provides chat-based tutoring. Paste text or upload images, choose a difficulty level and question count, and Study Buddy produces tailored MCQ quizzes using any OpenAI-compatible AI provider. It also offers a streaming chat interface for follow-up explanations and deeper learning.

Key features:

- MCQ quiz generation from text or images
- Configurable complexity levels (recall, apply, analyze, mastery) and question count
- Streaming chat with conversation history
- Multi-provider AI support (NanoGPT, OpenRouter, or any OpenAI-compatible endpoint)
- Per-user API key management for bring-your-own-key workflows
- Google OAuth authentication

## Tech Stack

- **Next.js 16** (App Router)
- **Prisma ORM** with SQLite (better-sqlite3 adapter)
- **NextAuth v5** (Google OAuth)
- **Tailwind CSS v4**
- **AI**: Multi-provider via OpenAI-compatible API (NanoGPT, OpenRouter, etc.)
- **UI**: Radix UI primitives, Lucide icons, shadcn/ui components

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Yes |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Yes |
| `AUTH_SECRET` | NextAuth session encryption key (generate with `openssl rand -hex 32`) | Yes |
| `NANO_GPT_API_KEY` | Default AI API key used as fallback when user has no personal key | Yes |
| `AI_API_ENDPOINT` | AI API base URL | No (defaults to `https://nano-gpt.com/api/v1/chat/completions`) |
| `DATABASE_URL` | SQLite database file path | No (defaults to `file:./dev.db`) |
| `ENCRYPTION_KEY` | Key for encrypting stored user API keys | No (uses dev fallback if unset) |

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Study-Buddy
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the project root and add the required values:

   ```env
   AUTH_GOOGLE_ID=your-google-client-id
   AUTH_GOOGLE_SECRET=your-google-client-secret
   AUTH_SECRET=your-random-secret-key
   NANO_GPT_API_KEY=your-nanogpt-api-key
   ```

   Optional variables can be added as needed (see table above).

4. **Run database migrations**

   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (SQLite)
│   └── migrations/          # Prisma migration history
├── src/
│   ├── app/
│   │   ├── api/             # API routes (chat, generate-quiz, auth, etc.)
│   │   ├── login/           # Login page
│   │   ├── mcq/[id]/        # Quiz viewer page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── auth.ts              # NextAuth v5 configuration
│   ├── components/
│   │   ├── StudyAssistant.jsx   # Main app component (quiz + chat)
│   │   ├── LandingPage.tsx      # Unauthenticated landing page
│   │   └── ui/                  # Reusable UI components (shadcn/ui)
│   └── lib/                 # Shared utilities (Prisma client, encryption)
├── public/                  # Static assets and icons
├── package.json
├── prisma.config.ts         # Prisma datasource configuration
└── next.config.ts           # Next.js configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
