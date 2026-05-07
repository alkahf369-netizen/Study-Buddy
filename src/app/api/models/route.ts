import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decrypt } from "@/lib/encryption";

function getModelDescription(id: string) {
  const lower = id.toLowerCase();
  if (lower.includes('llama-3.1-8b-instant')) return 'Turbo Response';
  if (lower.includes('llama')) return 'Meta Llama Model';
  if (lower.includes('mixtral')) return 'Fast Mixture of Experts';
  if (lower.includes('gemma')) return 'Lightweight Google Model';
  if (lower.includes('qwen')) return 'High Performance Assistant';
  if (lower.includes('gpt-4')) return 'Advanced OpenAI Model';
  if (lower.includes('gpt-3.5')) return 'Fast OpenAI Model';
  if (lower.includes('claude-3-opus')) return 'Deep Reasoning Anthropic Model';
  if (lower.includes('claude-3-sonnet')) return 'Balanced Anthropic Model';
  if (lower.includes('claude-3-haiku')) return 'Fast Anthropic Model';
  if (lower.includes('claude-3-haiku')) return 'Fast Anthropic Model';
  return 'Standard AI Model';
}

function getModelIcon(id: string) {
  const lower = id.toLowerCase();
  // Brain icon for reasoning models
  if (lower.includes('deepseek-r1') || lower.includes('deepseek-reasoner') || lower.includes('o1') || lower.includes('o3') || lower.includes('reason') || lower.includes('think')) {
    return 'brain';
  }
  // Lightning icon for fast models
  if (lower.includes('instant') || lower.includes('flash') || lower.includes('mini') || lower.includes('haiku') || lower.includes('fast')) {
    return 'lightning';
  }
  return null;
}

// Models that do NOT support image/vision input (text-only).
// Most modern LLMs (2024+) support multimodal image input.
// This list is for models confirmed to be text-only.
const TEXT_ONLY_PATTERNS = [
  // OpenAI text-only
  'o1-mini',
  'o1-preview',
  'o3-mini',
  'gpt-3.5',
  'gpt-4-turbo-preview',    // non-vision turbo variant
  'gpt-4-0314',
  'gpt-4-0613',
  
  // Anthropic text-only (older)
  'claude-3-haiku-20240307', // original haiku was text-only
  'claude-2',
  'claude-instant',
  
  // DeepSeek — text/code only models
  'deepseek-chat',
  'deepseek-coder',
  'deepseek-math',
  'deepseek-prover',
  'deepseek-reasoner',       // R1 reasoning is text-only
  'deepseek-r1-distill',
  'deepseek-r1',
  
  // Kimi / Moonshot — text only
  'moonshot-v1-8k',
  'moonshot-v1-32k',
  'moonshot-v1-128k',
  'kimi-k2-instruct',
  
  // Grok text-only
  'grok-1',
  'grok-2',
  'grok-3-mini-beta',
  'grok-3-mini-fast-beta',
  
  // Meta text-only
  'llama-3-8b',
  'llama-3-70b',
  'llama-3.1-8b',
  'llama-3.1-70b',
  'llama-3.1-405b',
  'llama-3.2-1b',
  'llama-3.2-3b',
  'llama-3.3-70b',
  
  // Qwen text-only
  'qwen-2-72b',
  'qwen-2.5-72b',
  'qwen-2.5-coder',
  
  // Mistral text-only
  'mixtral',
  'mistral-7b',
  'mistral-small',
  'codestral',
  'devstral',
  'mistral-large-2402',
  
  // Other text-only
  'gemma-2',
  'gemma-3-1b',
  'phi-3-mini',
  'phi-3-small',
  'command-r',
  'command-r-plus',
];

function isVisionModel(id: string, provider: string) {
  const lower = id.toLowerCase();
  // Check if model matches any text-only pattern
  for (const pattern of TEXT_ONLY_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }
  
  // Turn off image input for "other models" (not in main providers)
  const mainBrands = ['ChatGPT', 'Claude', 'Gemini', 'Deepseek', 'Kimi', 'Grok'];
  if (!mainBrands.includes(provider)) {
    return false;
  }
  
  // Default: most modern models from main providers support vision/image input
  return true;
}

function formatModelName(id: string) {
  let name = id.includes('/') ? id.split('/')[1] : id;
  return name.split('-').map(word => {
    const lower = word.toLowerCase();
    if (lower === 'gpt') return 'GPT';
    if (lower === 'o1') return 'o1';
    if (lower === 'o3') return 'o3';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

// Release date map: model keyword -> approximate release date (YYYY-MM-DD)
// Used for ranking (most recent first) and tagging NEW models
const MODEL_RELEASE_DATES: Record<string, string> = {
  // OpenAI
  'gpt-5.5':       '2026-04-23',
  'gpt-5.4':       '2026-03-10',
  'gpt-5.3':       '2026-02-01',
  'gpt-5.2':       '2026-01-15',
  'gpt-5.1':       '2025-11-13',
  'gpt-5':         '2025-12-01',
  'gpt-oss':       '2025-10-01',
  'o4-mini':       '2025-04-16',
  'o3-pro':        '2025-06-10',
  'o3-mini':       '2025-01-31',
  'o3':            '2025-04-16',
  'o1-pro':        '2024-12-05',
  'o1-preview':    '2024-09-12',
  'o1':            '2024-12-05',
  'gpt-4.1':       '2025-04-14',
  'gpt-4o':        '2025-01-30',
  'gpt-4-turbo':   '2024-04-09',
  'gpt-4':         '2023-03-14',
  'gpt-3.5':       '2022-11-30',
  
  // Anthropic / Claude  
  'claude-opus-4.7':    '2026-04-16',
  'claude-4.7':         '2026-04-16',
  'claude-mythos':      '2026-04-20',
  'claude-opus-4.6':    '2026-02-17',
  'claude-sonnet-4.6':  '2026-02-17',
  'claude-4.6':         '2026-02-17',
  'sonnet-5':           '2026-02-17',
  'claude-opus-4-5':    '2025-11-01',
  'claude-sonnet-4-5':  '2025-09-29',
  'claude-opus-4-1':    '2025-08-05',
  'claude-opus-4':      '2025-05-14',
  'claude-sonnet-4':    '2025-05-14',
  'claude-3-7-sonnet':  '2025-02-19',
  'claude-haiku-4-5':   '2025-10-01',
  'haiku-4.5':          '2025-10-15',
  'claude-3.5':         '2025-06-20',
  'claude-3-5':         '2024-10-22',
  'claude-3-opus':      '2024-03-04',
  'claude-3-sonnet':    '2024-03-04',
  'claude-3-haiku':     '2024-03-13',
  'claude-haiku':       '2024-03-13',
  'claude-opus':        '2025-05-14',
  'claude-sonnet':      '2025-05-14',
  
  // Google
  'gemini-3.1':    '2026-02-01',
  'gemini-3':      '2026-01-10',
  'gemini-2.5':    '2025-03-25',
  'gemini-2.0':    '2025-02-05',
  'gemini-2':      '2025-02-05',
  'gemini-1.5-pro':'2024-05-14',
  'gemini-1.5-flash':'2024-05-14',
  'gemini-1.0':    '2023-12-06',
  'gemma-4':       '2025-07-01',
  'gemma-3':       '2025-03-12',
  
  // DeepSeek
  'deepseek-v4':   '2026-04-24',
  'deepseek-v3.2': '2026-01-15',
  'deepseek-v3.1': '2025-09-01',
  'deepseek-r1':   '2025-01-20',
  'deepseek-reasoner': '2025-01-20',
  'deepseek-v3':   '2024-12-26',
  'deepseek-prover':'2025-04-01',
  'deepseek-chat': '2024-05-06',
  'deepseek-math': '2024-05-06',
  
  // Kimi / Moonshot
  'kimi-k2.6':     '2026-04-20',
  'kimi-k2.5':     '2026-01-27',
  'kimi-k2-instruct': '2025-07-11',
  'kimi-k2-thinking': '2025-07-11',
  'kimi-k2':       '2025-07-11',
  'moonshot-v1-auto': '2025-06-01',
  'moonshot-v1-128k': '2025-03-01',
  'moonshot-v1-32k':  '2025-03-01',
  'moonshot-v1-8k':   '2024-10-01',
  'kimi-thinking':    '2025-06-01',
  'kimi-latest':      '2026-04-20',
  
  // Grok / xAI
  'grok-4.3':        '2026-04-01',
  'grok-4.20':       '2026-03-15',
  'grok-4.1':        '2025-12-01',
  'grok-4':          '2025-07-09',
  'grok-code-fast':  '2025-07-01',
  'grok-3':          '2025-02-17',
  'grok-2':          '2024-08-13',
  'grok-1':          '2024-03-17',
  'grok-latest':     '2026-04-01',
  
  // Meta
  'llama-4':       '2025-04-05',
  'llama-3.3':     '2024-12-06',
  'llama-3.2':     '2024-09-25',
  'llama-3.1':     '2024-07-23',
  'llama-3':       '2024-04-18',
  
  // Qwen
  'qwen3.6':       '2026-03-01',
  'qwen3.5':       '2025-12-01',
  'qwen-3':        '2025-04-29',
  'qwen3':         '2025-04-29',
  'qwen-2.5':      '2024-09-19',
  'qwen-2':        '2024-06-07',
  
  // Mistral
  'mistral-medium-3.5': '2025-09-01',
  'mistral-medium-3.1': '2025-06-01',
  'mistral-medium-3':   '2025-03-01',
  'mistral-small-4':    '2025-03-01',
  'mistral-large':  '2024-02-26',
  'codestral':      '2025-06-01',
  'devstral':       '2025-05-01',
  'mixtral':        '2023-12-11',
};

function getModelReleaseDate(id: string): string | null {
  const lower = id.toLowerCase();
  // Try to find the most specific match first (longest key)
  const sortedKeys = Object.keys(MODEL_RELEASE_DATES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return MODEL_RELEASE_DATES[key];
    }
  }
  return null;
}

function isNewModel(id: string): boolean {
  const releaseDate = getModelReleaseDate(id);
  if (!releaseDate) return false;
  const released = new Date(releaseDate);
  const now = new Date();
  const diffDays = (now.getTime() - released.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 45; // Models released within last 45 days are "NEW"
}

function scoreModel(id: string) {
  const lower = id.toLowerCase();
  
  // Primary score: based on release date (newer = higher score)
  const releaseDate = getModelReleaseDate(id);
  let score = 0;
  
  if (releaseDate) {
    // Convert date to a numeric score: days since 2023-01-01
    const base = new Date('2023-01-01').getTime();
    const released = new Date(releaseDate).getTime();
    score = Math.floor((released - base) / (1000 * 60 * 60 * 24)); // days since base
  }
  
  // Bonus modifiers
  if (lower.includes('pro') && !lower.includes('gemini-1.5-pro')) score += 30;
  if (lower.includes('preview') || lower.includes('latest')) score += 15;
  
  // Penalty modifiers for lightweight variants
  if (lower.includes('mini') || lower.includes('nano') || lower.includes('haiku') || lower.includes('flash') || lower.includes('8k')) score -= 50;
  
  return score;
}

function extractProvider(id: string) {
  if (id.includes('/')) {
    const parts = id.split('/');
    let p = parts[0].toLowerCase();
    if (p === 'openai') return 'ChatGPT';
    if (p === 'anthropic') return 'Claude';
    if (p === 'google') return 'Gemini';
    if (p === 'moonshot' || p === 'kimi' || p === 'moonshotai') return 'Kimi';
    if (p === 'meta-llama' || p === 'meta') return 'Meta';
    if (p === 'x-ai' || p === 'xai') return 'Grok';
    if (p === 'mistralai' || p === 'mistral') return 'Mistral';
    if (p === 'cohere') return 'Cohere';
    if (p === 'qwen') return 'Qwen';
    if (p === 'deepseek') return 'Deepseek';
    return p.charAt(0).toUpperCase() + p.slice(1);
  }
  
  const lower = id.toLowerCase();
  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) return 'ChatGPT';
  if (lower.includes('claude')) return 'Claude';
  if (lower.includes('gemini')) return 'Gemini';
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'Kimi';
  if (lower.includes('llama')) return 'Meta';
  if (lower.includes('qwen')) return 'Qwen';
  if (lower.includes('deepseek')) return 'Deepseek';
  if (lower.includes('grok')) return 'Grok';
  
  return 'Other';
}

export async function GET() {
  try {
    const session = await auth();
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

    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured." }, { status: 401 });
    }

    // Determine the base /models endpoint
    let modelsUrl = apiEndpoint;
    if (modelsUrl.endsWith("/chat/completions")) {
      modelsUrl = modelsUrl.replace("/chat/completions", "/models");
    } else if (!modelsUrl.endsWith("/models")) {
      modelsUrl = modelsUrl.endsWith("/") ? modelsUrl + "models" : modelsUrl + "/models";
    }

    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch models from provider." }, { status: response.status });
    }

    const data = await response.json();
    
    if (data && Array.isArray(data.data)) {
       // Filter out audio/tts models
       const filteredModels = data.data.filter((m: any) => {
         const lower = m.id.toLowerCase();
         return !lower.includes('whisper') && !lower.includes('audio') && !lower.includes('tts') && !lower.includes('speech');
       });

       const mappedModels = filteredModels.map((m: any) => {
         const provider = extractProvider(m.id);
         return {
           id: m.id,
           name: formatModelName(m.id),
           provider: provider,
           description: getModelDescription(m.id),
           icon: getModelIcon(m.id),
           isVision: isVisionModel(m.id, provider),
           isNew: isNewModel(m.id)
         };
       });
       
       mappedModels.sort((a: any, b: any) => {
         const diff = scoreModel(b.id) - scoreModel(a.id);
         if (diff !== 0) return diff;
         return a.name.localeCompare(b.name);
       });
       
       // Limit NEW tags to max 2 per provider
       const newCountByProvider: Record<string, number> = {};
       for (const m of mappedModels) {
         if (m.isNew) {
           const count = newCountByProvider[m.provider] || 0;
           if (count >= 2) {
             m.isNew = false;
           } else {
             newCountByProvider[m.provider] = count + 1;
           }
         }
       }
       
       return NextResponse.json({ models: mappedModels });
    }

    return NextResponse.json({ models: [] });
  } catch (error) {
    console.error("[api-models GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
