import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';
import { getPublicApiKey } from '@/lib/admin';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const [session, body] = await Promise.all([auth(), req.json()]);
    const { prompt, modelId, size } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Resolve API key
    let apiKey = process.env.NANO_GPT_API_KEY;
    let usedKeyId: string | null = null;

    if (session?.user?.id) {
      const activeKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id, isActive: true, isPublic: false },
        select: { id: true, key: true, endpoint: true }
      });
      if (activeKey?.key) {
        apiKey = decrypt(activeKey.key);
        usedKeyId = activeKey.id;
      }
    }

    if (!usedKeyId || !apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      const publicKey = await getPublicApiKey();
      if (publicKey) {
        if (publicKey.tokenLimit && publicKey.tokenUsed >= publicKey.tokenLimit) {
          return NextResponse.json({ error: "Public API token limit reached. Please add your own API key in Settings." }, { status: 429 });
        }
        apiKey = decrypt(publicKey.key);
        usedKeyId = publicKey.id;
      }
    }

    if (!apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      return NextResponse.json({ error: "API key is missing. Please provide it in Settings → API Key." }, { status: 401 });
    }

    // NanoGPT image generation endpoint (per official docs)
    // Always use: https://nano-gpt.com/v1/images/generations
    const imageEndpoint = "https://nano-gpt.com/v1/images/generations";
    const targetModel = modelId || "hidream";

    const response = await fetch(imageEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        prompt: prompt.trim(),
        n: 1,
        size: size || "1024x1024",
        response_format: "url",
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-image] API Error (${response.status}):`, errorText);
      return NextResponse.json({
        error: `Image generation failed (${response.status}). ${errorText.slice(0, 200)}`
      }, { status: 502 });
    }

    const data = await response.json();

    // Handle both URL and b64_json responses (API may fallback to b64_json)
    const rawUrl = data?.data?.[0]?.url;
    const b64Json = data?.data?.[0]?.b64_json;
    const revisedPrompt = data?.data?.[0]?.revised_prompt;

    if (!rawUrl && !b64Json) {
      return NextResponse.json({ error: "No image returned from the model" }, { status: 502 });
    }

    // Save image to local storage (BLOCKING — ensures file exists before responding)
    const userId = session?.user?.id || 'anonymous';
    const userFolder = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12);
    const imageId = crypto.randomUUID();
    const filename = `${imageId}.png`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'images', userFolder);
    const filePath = path.join(uploadsDir, filename);
    // Use API route explicitly to bypass Next.js static serving limits for dynamically generated files
    const localPath = `/api/uploads/images/${userFolder}/${filename}`;

    let savedLocally = false;
    try {
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      if (b64Json) {
        // Direct base64 — decode and save (full quality, no network fetch needed)
        const buffer = Buffer.from(b64Json, 'base64');
        await writeFile(filePath, buffer);
        savedLocally = true;
      } else if (rawUrl) {
        // Download from signed URL (full quality, raw bytes)
        const imgResponse = await fetch(rawUrl, { headers: { 'Accept': 'image/*' } });
        if (imgResponse.ok) {
          const buffer = Buffer.from(await imgResponse.arrayBuffer());
          await writeFile(filePath, buffer);
          savedLocally = true;
        }
      }
    } catch (saveErr) {
      console.error('[generate-image] Failed to save image locally:', saveErr);
    }

    // Determine which URL to return
    const imageUrl = savedLocally ? localPath : (rawUrl || '');

    // Track token usage
    if (usedKeyId) {
      const estimatedTokens = 1000;
      Promise.all([
        prisma.tokenUsage.create({
          data: {
            apiKeyId: usedKeyId,
            model: targetModel,
            inputTokens: Math.ceil(prompt.length / 4),
            outputTokens: estimatedTokens,
            totalTokens: estimatedTokens + Math.ceil(prompt.length / 4),
            endpoint: 'image',
            userId: session?.user?.id || null,
          }
        }),
        prisma.apiKey.update({
          where: { id: usedKeyId },
          data: { tokenUsed: { increment: estimatedTokens + Math.ceil(prompt.length / 4) } }
        })
      ]).catch(err => {
        console.error('[generate-image] Token tracking error:', err);
      });
    }

    return NextResponse.json({
      imageUrl,
      revisedPrompt: revisedPrompt || null,
      model: targetModel,
    });

  } catch (error: any) {
    console.error("[generate-image] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
  }
}
