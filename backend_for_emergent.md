# Backend API Documentation & Source Code for Emergent

Here is the complete backend architecture for our Next.js project using **Prisma (SQLite)** and the **NanoGPT REST API**. 

Since we are using the NanoGPT API, we securely connect to all frontier models (Google Gemini 1.5/2.5, Claude 3.5, GPT-4, etc.) via a single `fetch()` endpoint without installing any third-party SDKs. It takes fully advantage of standard OpenAI Vision-compatible JSON format.

## 1. Database Schema (`prisma/schema.prisma`)
This is how quizzes are saved in the DB:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Quiz {
  id           String         @id @default(cuid())
  title        String
  originalText String
  questions    QuizQuestion[]
  createdAt    DateTime       @default(now())
}

model QuizQuestion {
  id            String   @id @default(cuid())
  question      String
  options       String // stringified array
  correctAnswer String
  explanation   String
  quiz          Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  quizId        String
}
```

## 2. Generate Quiz API (`src/app/api/generate-quiz/route.ts`)
This API endpoint accepts text, Base64 files, a selected `modelId`, and an `apiKey` from the frontend, queries NanoGPT using the standard \`fetch()\`, parses the JSON, and saves using Prisma.

```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ url: process.env.DATABASE_URL || 'file:./dev.db' });

export async function POST(req: Request) {
  try {
    const { text, files, modelId, apiKey: clientApiKey } = await req.json();

    if (!text && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Text or file is required" }, { status: 400 });
    }

    const apiKey = clientApiKey || process.env.NANO_GPT_API_KEY;
    if (!apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      return NextResponse.json({ error: "NanoGPT API key is missing. Please provide it in the UI." }, { status: 401 });
    }

    const promptText = `Based on the following context, create a multiple-choice quiz.
You MUST return ONLY a valid JSON array of exactly 3 objects. Do not include markdown wrappers like \`\`\`json.
Structure:
[
  {
    "question": "Question text here",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "Exact text of correct option",
    "explanation": "Short explanation in the language of the provided context."
  }
]

Context: "${text || 'Generate from the provided files'}"`;

    // format payload using OpenAI Vision style which NanoGPT accepts
    const contentArray: any[] = [
      { type: "text", text: promptText }
    ];

    if (files && files.length > 0) {
      for (const file of files) {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:${file.inlineData.mimeType};base64,${file.inlineData.data}`
          }
        });
      }
    }

    const targetModel = modelId || "gemini-2.5-flash"; // Default to a solid model from NanoGPT

    const response = await fetch("https://nano-gpt.com/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "user", content: contentArray }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NanoGPT API Error:", errorText);
      throw new Error(`NanoGPT API returned status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "[]";
    
    // Clean response and parse
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let quizData;
    try {
      quizData = JSON.parse(cleanedText);
    } catch(e) {
      const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
         quizData = JSON.parse(arrayMatch[0]);
      } else {
         throw new Error("Could not parse JSON. AI Response: " + cleanedText);
      }
    }

    // Save to Database
    const dynamicTitle = text ? text.slice(0, 30) + (text.length > 30 ? "..." : " Quiz") : "File/Image generated Quiz";

    const savedQuiz = await prisma.quiz.create({
      data: {
        title: dynamicTitle,
        originalText: text || "Generated from file",
        questions: {
          create: quizData.map((q: any) => ({
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }))
        }
      }
    });

    return NextResponse.json({ quiz: quizData, id: savedQuiz.id });

  } catch (error: any) {
    console.error("Quiz API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
```

## 3. History Fetch API (`src/app/api/history/route.ts`)
To show "Recent Quizzes" in the Sidebar.

```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ url: process.env.DATABASE_URL || 'file:./dev.db' });

export async function GET() {
  try {
    const history = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
```

## 4. Frontend Instructions for Emergent (API & UI Setup):
When building the UI:
1. **API Key Input (New Requirement):** Create a Settings UI (e.g., a modal or sidebar field) where the user can input their NanoGPT **API Key**. Save this locally via `localStorage` (e.g., `localStorage.setItem('nanoGptApiKey', key)`).
2. **Model Switcher:** The frontend should include the "Model Switcher" selector that is linked to your UI. The model's ID from \`MODELS\` array (like "claude-sonnet-4.6" or "gemini-2.5-flash") will be passed down to the backend.
3. **Fetch History:** Route: `fetch('/api/history')` (Expects an array of `{ id, title, createdAt }`).
4. **Upload Image/PDF & Generate Quiz:** 
   - Convert the user's File into a `base64` string.
   - Strip out the `data:image/png;base64,` prefix.
   - Send `POST` to `/api/generate-quiz` with body: 
     `JSON.stringify({ text: "optional prompt", modelId: "the_selected_model_id_here", apiKey: "localStorage.getItem('nanoGptApiKey')", files: [{ inlineData: { data: base64String, mimeType: file.type } }] })`
5. If no file is attached, just pass the `text`, `modelId`, and `apiKey`.
6. Catch `401` errors and prompt the user to "Please add your API Key in the Settings". The API returns `{ error: "..." }`.
7. Success returns `{ quiz: [...the MCQs...] }`. 
