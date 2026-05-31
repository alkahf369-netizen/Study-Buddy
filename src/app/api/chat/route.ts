import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';
import { getPublicApiKey } from '@/lib/admin';

export async function POST(req: Request) {
  try {
    // Parse body and auth in parallel — saves ~50-80ms
    const [session, body] = await Promise.all([
      auth(),
      req.json(),
    ]);

    const { text, files, modelId, messages: chatHistory } = body;

    if (!text && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Message text or file is required" }, { status: 400 });
    }

    // Resolve API key — try user key and public key in parallel
    let apiKey = process.env.NANO_GPT_API_KEY;
    let apiEndpoint = process.env.AI_API_ENDPOINT || "https://nano-gpt.com/api/v1/chat/completions";
    let usedKeyId: string | null = null;

    if (session?.user?.id) {
      const activeKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id, isActive: true, isPublic: false },
        select: { id: true, key: true, endpoint: true }
      });
      if (activeKey?.key) {
        apiKey = decrypt(activeKey.key);
        if (activeKey.endpoint) apiEndpoint = activeKey.endpoint;
        usedKeyId = activeKey.id;
      }
    }

    // Fall back to public API key
    if (!usedKeyId || !apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      const publicKey = await getPublicApiKey();
      if (publicKey) {
        if (publicKey.tokenLimit && publicKey.tokenUsed >= publicKey.tokenLimit) {
          return NextResponse.json({ error: "Public API token limit reached. Please add your own API key in Settings." }, { status: 429 });
        }
        apiKey = decrypt(publicKey.key);
        if (publicKey.endpoint) apiEndpoint = publicKey.endpoint;
        usedKeyId = publicKey.id;
      }
    }

    // Auto-correct endpoint
    if (!apiEndpoint.endsWith('/chat/completions') && !apiEndpoint.endsWith('/messages') && !apiEndpoint.endsWith('/generate')) {
      apiEndpoint = apiEndpoint.replace(/\/$/, '') + '/chat/completions';
    }

    if (!apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      return NextResponse.json({ error: "API key is missing. Please provide it in Settings → API Key." }, { status: 401 });
    }

    // Build message content
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

    // Build messages array with history
    const messages: any[] = [
      {
        role: "system",
        content: "You are a helpful, friendly AI study assistant. You help students learn, explain concepts clearly, and answer questions on any topic. Be concise but thorough. Use examples when helpful."
      }
    ];

    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      let totalLength = 0;
      const MAX_HISTORY_CHARS = 12000;
      const validHistory: any[] = [];

      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (msg.role === "user" || msg.role === "assistant") {
          const content = msg.content || "";
          // Skip image generation messages (they add no useful context for text chat)
          if (content.startsWith("[Image generated:") || content.startsWith("![Generated Image]")) continue;
          if (totalLength + content.length > MAX_HISTORY_CHARS && validHistory.length > 0) break;
          totalLength += content.length;
          validHistory.unshift({ role: msg.role, content });
        }
      }
      messages.push(...validHistory);
    }

    messages.push({ role: "user", content: messageContent });

    // Fire the AI request
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
      console.error(`[chat] API Error (${response.status}):`, errorText);
      return NextResponse.json({
        error: `AI model returned an error (${response.status}). ${errorText.slice(0, 200)}`
      }, { status: 502 });
    }

    // Stream response to client with lightweight token tracking
    const originalBody = response.body!;
    let chunkCount = 0;
    let totalBytes = 0;

    const trackingStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        chunkCount++;
        totalBytes += chunk.byteLength;
      },
      flush() {
        // Fire-and-forget token usage tracking after stream ends
        if (usedKeyId) {
          // Estimate: SSE overhead is ~40% of payload, so actual content ≈ 60%
          // Then ~4 chars per token
          const outputTokens = Math.ceil((totalBytes * 0.6) / 4);
          const inputTokens = Math.ceil(JSON.stringify(messages).length / 4);
          const total = inputTokens + outputTokens;

          // Single batch write — faster than sequential create + update
          Promise.all([
            prisma.tokenUsage.create({
              data: {
                apiKeyId: usedKeyId,
                model: targetModel,
                inputTokens,
                outputTokens,
                totalTokens: total,
                endpoint: 'chat',
                userId: session?.user?.id || null,
              }
            }),
            prisma.apiKey.update({
              where: { id: usedKeyId! },
              data: { tokenUsed: { increment: total } }
            })
          ]).catch(err => {
            console.error('[chat] Token tracking error:', err);
          });
        }
      }
    });

    return new Response(originalBody.pipeThrough(trackingStream), {
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
