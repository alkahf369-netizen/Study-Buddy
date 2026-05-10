import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { text, files, modelId } = await req.json();

    if (!text && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Text or file is required" }, { status: 400 });
    }

    let apiKey = process.env.NANO_GPT_API_KEY;
    let apiEndpoint = process.env.AI_API_ENDPOINT || "https://nano-gpt.com/api/v1/chat/completions";

    if (session?.user?.id) {
      const activeKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id, isActive: true },
        select: { key: true, endpoint: true }
      });
      if (activeKey?.key) apiKey = decrypt(activeKey.key);
      if (activeKey?.endpoint) apiEndpoint = activeKey.endpoint;
    }

    // Auto-correct endpoint if it's just a base URL
    if (!apiEndpoint.endsWith('/chat/completions') && !apiEndpoint.endsWith('/messages') && !apiEndpoint.endsWith('/generate')) {
      apiEndpoint = apiEndpoint.replace(/\/$/, '') + '/chat/completions';
    }

    if (!apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      return NextResponse.json({ error: "API key is missing. Please provide it in the UI." }, { status: 401 });
    }

    const promptText = `Based on the following context, create a multiple-choice quiz.
You MUST return ONLY a valid JSON array of objects. Do not include markdown wrappers like \`\`\`json.
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

    // Build message content — use simple string when no files, array format when files present
    let messageContent: any;

    if (files && files.length > 0) {
      // OpenAI Vision-compatible multimodal format
      const contentArray: any[] = [
        { type: "text", text: promptText }
      ];
      for (const file of files) {
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:${file.inlineData.mimeType};base64,${file.inlineData.data}`
          }
        });
      }
      messageContent = contentArray;
    } else {
      // Simple text — no need for array format
      messageContent = promptText;
    }

    const targetModel = modelId || "gemini-2.5-flash";

    console.log(`[generate-quiz] Using model: ${targetModel}`);

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "user", content: messageContent }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-quiz] NanoGPT API Error (${response.status}):`, errorText);
      return NextResponse.json({
        error: `AI model returned an error (${response.status}). ${errorText.slice(0, 200)}`
      }, { status: 502 });
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
         console.error("[generate-quiz] JSON parse failed. Raw response:", cleanedText.slice(0, 500));
         return NextResponse.json({
           error: "AI returned an unparseable response. Try again or use a different model."
         }, { status: 422 });
      }
    }

    // Save to Database
    const dynamicTitle = text ? text.slice(0, 30) + (text.length > 30 ? "..." : " Quiz") : "File/Image generated Quiz";

    try {
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
    } catch (dbError: any) {
      console.error("[generate-quiz] DB save failed:", dbError.message);
      // Still return the quiz even if DB save fails
      return NextResponse.json({ quiz: quizData, id: null });
    }

  } catch (error: any) {
    console.error("[generate-quiz] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}

