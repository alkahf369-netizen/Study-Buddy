import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { text, files, modelId, messages: chatHistory } = await req.json();

    if (!text && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Message text or file is required" }, { status: 400 });
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
      return NextResponse.json({ error: "API key is missing. Please provide it in Settings → API Key." }, { status: 401 });
    }

    // Build message content — simple string for text, array for multimodal
    let messageContent: any;

    if (files && files.length > 0) {
      const contentArray: any[] = [
        { type: "text", text: text || "Describe the attached file(s)." }
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
      messageContent = text;
    }

    const targetModel = modelId || "gemini-2.5-flash";

    // Build messages array — include chat history for context if provided
    const messages: any[] = [
      {
        role: "system",
        content: "You are a helpful, friendly AI study assistant. You help students learn, explain concepts clearly, and answer questions on any topic. Be concise but thorough. Use examples when helpful."
      }
    ];

    // Append previous conversation history using a smart character limit to save tokens (~3000 tokens limit)
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      let totalLength = 0;
      const MAX_HISTORY_CHARS = 12000; 
      const validHistory: any[] = [];

      // Iterate backwards to prioritize the most recent messages
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (msg.role === "user" || msg.role === "assistant") {
          const content = msg.content || "";
          
          // Check if adding this message exceeds the context budget
          if (totalLength + content.length > MAX_HISTORY_CHARS && validHistory.length > 0) {
            // If we already have some history, we stop here to save tokens.
            break;
          }
          
          totalLength += content.length;
          validHistory.unshift({ role: msg.role, content });
        }
      }
      
      messages.push(...validHistory);
    }

    // Add the current user message
    messages.push({ role: "user", content: messageContent });

    console.log(`[chat] Streaming model: ${targetModel}, history: ${messages.length - 2} prior messages`);

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        stream: true,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[chat] NanoGPT API Error (${response.status}):`, errorText);
      return NextResponse.json({
        error: `AI model returned an error (${response.status}). ${errorText.slice(0, 200)}`
      }, { status: 502 });
    }

    // Pipe the SSE stream directly to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Model": targetModel,
      },
    });

  } catch (error: any) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
