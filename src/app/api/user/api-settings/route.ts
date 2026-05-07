import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    const maskedKeys = apiKeys.map(k => {
      const rawKey = decrypt(k.key);
      const masked = rawKey && rawKey.length > 8 
        ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}` 
        : (rawKey ? "••••••••" : "");
      return { ...k, key: masked };
    });

    return NextResponse.json({ apiKeys: maskedKeys });
  } catch (error: any) {
    console.error("[api-settings GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, key, endpoint } = body;

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint URL is required" }, { status: 400 });
    }

    // Auto-correct endpoint if user pasted a base URL
    let finalEndpoint = endpoint.trim();
    if (!finalEndpoint.endsWith('/chat/completions') && 
        !finalEndpoint.endsWith('/messages') && 
        !finalEndpoint.endsWith('/generate')) {
      finalEndpoint = finalEndpoint.replace(/\/$/, '') + '/chat/completions';
    }

    // Validation step
    let isValid = false;
    let errorMessage = "Invalid API Key or endpoint.";
    try {
      const targetEndpoint = finalEndpoint;
      // To validate an OpenAI compatible key, we MUST send a dummy request to the target endpoint
      // because some /models endpoints (like NanoGPT's) return 200 OK without authenticating the key.
      const testReq = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "invalid-dummy-model-test",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1
        })
      });

      // 401 or 403 generally means invalid key. 404 means wrong URL. 400 or 200 means the key is accepted but request is malformed (expected)
      if (testReq.status === 401 || testReq.status === 403) {
        isValid = false;
        errorMessage = "Invalid API Key. Validation failed.";
      } else if (testReq.status === 404) {
        isValid = false;
        errorMessage = "Endpoint not found (404). Please ensure the URL is correct.";
      } else {
        isValid = true;
      }
    } catch (e) {
      isValid = false;
      errorMessage = "Failed to reach the provided endpoint for validation.";
    }

    if (!isValid) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // If valid, save it. Also check if this is the first key, make it active
    const existingCount = await prisma.apiKey.count({
      where: { userId: session.user.id }
    });

    const rawKey = key.trim();
    const encryptedKey = encrypt(rawKey);

    const newKey = await prisma.apiKey.create({
      data: {
        name: name || "My API Key",
        key: encryptedKey,
        endpoint: finalEndpoint,
        isActive: existingCount === 0, // Make active if it's the first key
        userId: session.user.id
      }
    });

    const maskedKey = rawKey && rawKey.length > 8 
      ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}` 
      : (rawKey ? "••••••••" : "");

    return NextResponse.json({ success: true, apiKey: { ...newKey, key: maskedKey } });
  } catch (error: any) {
    console.error("[api-settings POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

    // Ensure the key belongs to user
    const keyRecord = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id }
    });
    if (!keyRecord) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    // Deactivate all
    await prisma.apiKey.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false }
    });

    // Activate the selected one
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api-settings PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

    const keyRecord = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id }
    });

    if (!keyRecord) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id }
    });

    // If we deleted the active key, make the most recent key active
    if (keyRecord.isActive) {
      const fallbackKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      });
      if (fallbackKey) {
        await prisma.apiKey.update({
          where: { id: fallbackKey.id },
          data: { isActive: true }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api-settings DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
