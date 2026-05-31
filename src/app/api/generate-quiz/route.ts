import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';
import { getPublicApiKey } from '@/lib/admin';
import { extractTextFromMultiplePdfs, extractTextFromPdfRange } from '@/lib/quiz/pdf-extractor';
import { StreamingParser } from '@/lib/quiz/streaming-parser';
import type { FilePayload, QuizQuestion, DoneEvent } from '@/lib/quiz/types';
import { validateAndFormatFiles, FileSizeError } from '@/lib/quiz/file-router';
import { validatePageRange } from '@/lib/quiz/page-range-validator';
import { splitPdfPages } from '@/lib/quiz/pdf-splitter';

/**
 * Builds the AI prompt for quiz generation.
 * Exported for testability (property tests).
 */
export function buildQuizPrompt(options: {
  text?: string;
}): string {
  const { text } = options;

  let promptText = `Based on the following context, create a multiple-choice quiz.
You MUST return ONLY a valid JSON array of objects. Do not include markdown wrappers like \`\`\`json.
Structure:
[
  {
    "question": "Question text here",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "Exact text of correct option",
    "explanation": "Short explanation in the language of the provided context."
  }
]`;

  promptText += `\n\nPick the optimal number of questions based on the source material depth.`;

  promptText += `\n\nContext: "${text || 'Generate from the provided files'}"`;

  return promptText;
}

/** Inactivity timeout in milliseconds (30 seconds) */
const INACTIVITY_TIMEOUT_MS = 30_000;

/**
 * Helper to format an SSE event string.
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { text, files, modelId, pageRanges } = await req.json();

    if (!text && (!files || files.length === 0)) {
      return NextResponse.json({ error: "Text or file is required" }, { status: 400 });
    }

    // Validate page ranges if provided
    const hasPageRanges = pageRanges && typeof pageRanges === 'object' && Object.keys(pageRanges).length > 0;
    if (hasPageRanges) {
      for (const [indexStr, range] of Object.entries(pageRanges as Record<string, { startPage: number; endPage: number }>)) {
        const { startPage, endPage } = range;
        const validation = validatePageRange({ startPage, endPage });
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
      }
    }

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

    // Fall back to public API key if no user key
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

    // Auto-correct endpoint if it's just a base URL
    if (!apiEndpoint.endsWith('/chat/completions') && !apiEndpoint.endsWith('/messages') && !apiEndpoint.endsWith('/generate')) {
      apiEndpoint = apiEndpoint.replace(/\/$/, '') + '/chat/completions';
    }

    if (!apiKey || apiKey.includes('your_nano_gpt_api_key_here')) {
      return NextResponse.json({ error: "API key is missing. Please provide it in the UI." }, { status: 401 });
    }

    // Build prompt with structured directives (server is the source of truth)
    let combinedText = text || '';

    // Build message content — use simple string when no files, array format when files present
    let messageContent: any;
    let hasPdfFiles = false;
    let pdfFiles: FilePayload[] = [];

    if (files && files.length > 0) {
      try {
        // When page ranges are present, SPLIT the PDF server-side and send only
        // the selected pages as a new smaller PDF to the AI model.
        let processedFiles = [...files] as FilePayload[];

        if (hasPageRanges) {
          const pageRangeEntries = pageRanges as Record<string, { startPage: number; endPage: number }>;

          for (const [indexStr, range] of Object.entries(pageRangeEntries)) {
            const fileIndex = parseInt(indexStr, 10);
            const file = files[fileIndex] as FilePayload | undefined;

            if (file && file.inlineData?.mimeType === 'application/pdf') {
              // Split the PDF — create a new PDF with only the selected pages
              const splitResult = await splitPdfPages(
                file.inlineData.data,
                range.startPage,
                range.endPage
              );

              console.log(`[generate-quiz] PDF split: pages ${range.startPage}-${range.endPage} of ${splitResult.totalPages} → new PDF with ${splitResult.pageCount} pages`);

              // Replace the original file with the split PDF
              processedFiles[fileIndex] = {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: splitResult.base64,
                },
              };
            }
          }
        }

        const formattedFiles = validateAndFormatFiles(processedFiles, hasPageRanges ? { hasPageRange: true } : undefined);

        if (formattedFiles.length > 0) {
          const promptText = buildQuizPrompt({ text: combinedText || undefined });
          const contentArray: any[] = [
            { type: "text", text: promptText }
          ];
          for (const part of formattedFiles) {
            contentArray.push(part);
          }
          messageContent = contentArray;
        } else {
          const promptText = buildQuizPrompt({ text: combinedText || undefined });
          messageContent = promptText;
        }

        hasPdfFiles = processedFiles.some((f: FilePayload) => f.inlineData?.mimeType === 'application/pdf');
        pdfFiles = processedFiles.filter((f: FilePayload) => f.inlineData?.mimeType === 'application/pdf');
      } catch (error: any) {
        if (error instanceof FileSizeError) {
          return NextResponse.json({ error: error.message }, { status: 413 });
        }
        return NextResponse.json({ error: error.message || "Invalid file" }, { status: 400 });
      }
    } else {
      // Simple text — no need for array format
      const promptText = buildQuizPrompt({ text: combinedText || undefined });
      messageContent = promptText;
    }

    const targetModel = modelId || "gemini-2.5-flash";
    console.log(`[generate-quiz] Using model: ${targetModel}, streaming: true`);

    // --- SSE Streaming Response ---
    // AbortController for upstream AI request (used for timeout and client disconnect)
    const abortController = new AbortController();

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to write an SSE event to the stream
        function writeSSE(event: string, data: unknown): void {
          controller.enqueue(encoder.encode(formatSSE(event, data)));
        }

        // Inactivity timeout management
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

        function resetInactivityTimer(): void {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => {
            writeSSE("error", { message: "Stream timeout: no data received for 30 seconds" });
            controller.close();
            abortController.abort();
          }, INACTIVITY_TIMEOUT_MS);
        }

        function clearInactivityTimer(): void {
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
          }
        }

        try {
          // Make the initial AI API call with streaming enabled
          let aiResponse = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [{ role: "user", content: messageContent }],
              stream: true,
            }),
            signal: abortController.signal,
          });

          // Handle non-OK response — check for PDF fallback scenario
          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error(`[generate-quiz] AI API Error (${aiResponse.status}):`, errorText);

            const is4xx = aiResponse.status >= 400 && aiResponse.status < 500;
            const isContentTypeError = /unsupported.*(content[- ]?type|media[- ]?type|mime)/i.test(errorText) ||
              /content[- ]?type.*unsupported/i.test(errorText) ||
              /media[- ]?type.*not supported/i.test(errorText) ||
              /invalid.*media/i.test(errorText);

            if (is4xx && isContentTypeError && hasPdfFiles) {
              console.log('[generate-quiz] PDF content type rejected, attempting text extraction fallback...');

              // Extract text from PDF files
              let extractedText: string;
              try {
                extractedText = await extractTextFromMultiplePdfs(pdfFiles);
              } catch (extractionError: any) {
                console.error('[generate-quiz] PDF extraction failed:', extractionError.message);
                writeSSE("error", { message: extractionError.message || 'Failed to extract text from PDF' });
                controller.close();
                return;
              }

              // Validate extracted text is non-empty
              if (!extractedText || extractedText.trim().length === 0) {
                writeSSE("error", { message: 'PDF has no extractable text content' });
                controller.close();
                return;
              }

              // Rebuild prompt with extracted text appended after user-provided text
              const combinedText = text ? `${text}\n\n${extractedText}` : extractedText;
              const fallbackPrompt = buildQuizPrompt({ text: combinedText });

              // Build text-only message content (exclude PDFs, keep images)
              const nonPdfFiles = files.filter((f: FilePayload) => f.inlineData?.mimeType !== 'application/pdf');
              let fallbackContent: any;

              if (nonPdfFiles.length > 0) {
                const contentArray: any[] = [{ type: "text", text: fallbackPrompt }];
                for (const file of nonPdfFiles) {
                  contentArray.push({
                    type: "image_url",
                    image_url: {
                      url: `data:${file.inlineData.mimeType};base64,${file.inlineData.data}`
                    }
                  });
                }
                fallbackContent = contentArray;
              } else {
                fallbackContent = fallbackPrompt;
              }

              // Retry the AI request exactly once with text-only content
              console.log('[generate-quiz] Retrying with extracted text (fallback), streaming...');
              aiResponse = await fetch(apiEndpoint, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: targetModel,
                  messages: [{ role: "user", content: fallbackContent }],
                  stream: true,
                }),
                signal: abortController.signal,
              });

              if (!aiResponse.ok) {
                const retryErrorText = await aiResponse.text();
                console.error(`[generate-quiz] Retry also failed (${aiResponse.status}):`, retryErrorText);
                writeSSE("error", { message: `AI model returned an error (${aiResponse.status}). ${retryErrorText.slice(0, 200)}` });
                controller.close();
                return;
              }
            } else {
              // Non-recoverable error
              writeSSE("error", { message: `AI model returned an error (${aiResponse.status}). ${errorText.slice(0, 200)}` });
              controller.close();
              return;
            }
          }

          // At this point we have a successful streaming response from the AI
          if (!aiResponse.body) {
            writeSSE("error", { message: "AI response has no body" });
            controller.close();
            return;
          }

          // Set up the StreamingParser with callbacks that emit SSE events
          let streamIncomplete = false;

          const parser = new StreamingParser({
            onQuestion: (question: QuizQuestion, index: number) => {
              console.log(`[generate-quiz] Question ${index} extracted: ${question.question.slice(0, 60)}...`);
              writeSSE("question", { index, data: question });
              resetInactivityTimer();
            },
            onError: (message: string) => {
              console.error(`[generate-quiz] Parser error: ${message}`);
              writeSSE("error", { message });
            },
            onDone: async (questions: QuizQuestion[], warnings: string[]) => {
              clearInactivityTimer();
              console.log(`[generate-quiz] Stream done — ${questions.length} questions, ${warnings.length} warnings`);
              if (warnings.length > 0) console.log(`[generate-quiz] Warnings:`, warnings);

              // FALLBACK: if streaming parser found 0 questions but we have a response,
              // try to parse the full accumulated response as a JSON array (old reliable way)
              if (questions.length === 0 && fullResponseText.trim().length > 0) {
                console.log(`[generate-quiz] Streaming parser found 0 questions — trying fallback JSON.parse on ${fullResponseText.length} chars`);
                try {
                  const cleaned = fullResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                  let parsed: any;
                  try {
                    parsed = JSON.parse(cleaned);
                  } catch {
                    // Try to extract JSON array from the text
                    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                      parsed = JSON.parse(arrayMatch[0]);
                    }
                  }

                  if (Array.isArray(parsed)) {
                    for (let i = 0; i < parsed.length; i++) {
                      const q = parsed[i];
                      if (
                        typeof q?.question === 'string' &&
                        Array.isArray(q?.options) &&
                        typeof q?.correctAnswer === 'string' &&
                        typeof q?.explanation === 'string'
                      ) {
                        const validQ: QuizQuestion = {
                          question: q.question,
                          options: q.options,
                          correctAnswer: q.correctAnswer,
                          explanation: q.explanation,
                        };
                        questions.push(validQ);
                        writeSSE("question", { index: questions.length - 1, data: validQ });
                      }
                    }
                    console.log(`[generate-quiz] Fallback parser extracted ${questions.length} questions`);
                  }
                } catch (fallbackErr: any) {
                  console.error(`[generate-quiz] Fallback parse also failed:`, fallbackErr.message);
                }
              }

              // Determine if the stream was incomplete
              const incomplete = streamIncomplete;

              // Persist quiz to database
              let savedQuizId: string | null = null;
              let fallbackData: QuizQuestion[] | undefined;

              if (questions.length > 0) {
                const dynamicTitle = text
                  ? text.slice(0, 47) + (text.length > 47 ? "..." : "")
                  : "File/Image generated Quiz";
                // Ensure title is max 50 chars
                const title = dynamicTitle.slice(0, 50);

                try {
                  const savedQuiz = await prisma.quiz.create({
                    data: {
                      title,
                      originalText: text || "Generated from file",
                      complexity: null,
                      requestedCount: null,
                      userId: session?.user?.id || undefined,
                      questions: {
                        create: questions.map((q) => ({
                          question: q.question,
                          options: JSON.stringify(q.options),
                          correctAnswer: q.correctAnswer,
                          explanation: q.explanation,
                        }))
                      }
                    }
                  });
                  savedQuizId = savedQuiz.id;
                } catch (dbError: any) {
                  console.error("[generate-quiz] DB save failed:", dbError.message);
                  // Include full quiz data so client doesn't lose content
                  fallbackData = questions;
                }
              }

              // Emit done event
              const doneEvent: DoneEvent = {
                id: savedQuizId,
                totalCount: questions.length,
                incomplete,
              };
              if (warnings.length > 0) doneEvent.warnings = warnings;
              if (fallbackData) doneEvent.fallbackData = fallbackData;

              writeSSE("done", doneEvent);

              // Track token usage (non-blocking)
              if (usedKeyId && fullResponseText.length > 0) {
                const outputTokens = Math.ceil(fullResponseText.length / 4);
                const inputTokens = Math.ceil((text || '').length / 4) + (files ? files.length * 500 : 0);
                const total = inputTokens + outputTokens;

                prisma.tokenUsage.create({
                  data: {
                    apiKeyId: usedKeyId,
                    model: targetModel,
                    inputTokens,
                    outputTokens,
                    totalTokens: total,
                    endpoint: 'quiz',
                    userId: session?.user?.id || null,
                  }
                }).then(() => {
                  return prisma.apiKey.update({
                    where: { id: usedKeyId! },
                    data: { tokenUsed: { increment: total } }
                  });
                }).catch(err => {
                  console.error('[generate-quiz] Token usage tracking error:', err);
                });
              }

              controller.close();
            },
          });

          // Start the inactivity timer
          resetInactivityTimer();

          // Read the AI SSE stream and feed tokens to the parser
          const reader = aiResponse.body.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = "";
          let totalTokensReceived = 0;
          let firstChars = "";
          let fullResponseText = ""; // accumulate full response for fallback parsing

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // AI stream ended — signal end to parser
                console.log(`[generate-quiz] AI stream complete — ${totalTokensReceived} chars received total`);
                console.log(`[generate-quiz] First 500 chars of response: "${firstChars}"`);
                streamIncomplete = false;
                parser.end();
                break;
              }

              // Reset inactivity timer on each chunk received
              resetInactivityTimer();

              // Decode the chunk and process SSE lines
              sseBuffer += decoder.decode(value, { stream: true });

              // Process complete SSE lines
              const lines = sseBuffer.split("\n");
              // Keep the last potentially incomplete line in the buffer
              sseBuffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();

                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith(":")) continue;

                // Handle [DONE] signal from OpenAI-compatible APIs
                if (trimmed === "data: [DONE]") {
                  // Stream is complete
                  continue;
                }

                // Parse data lines
                if (trimmed.startsWith("data: ")) {
                  const jsonStr = trimmed.slice(6);
                  try {
                    const chunk = JSON.parse(jsonStr);
                    // Extract the content delta (OpenAI format)
                    const token = chunk.choices?.[0]?.delta?.content;
                    if (token) {
                      totalTokensReceived += token.length;
                      fullResponseText += token;
                      if (totalTokensReceived <= 500) {
                        firstChars += token;
                      }
                      parser.push(token);
                    }
                  } catch {
                    // Skip unparseable SSE data lines (e.g., partial JSON)
                  }
                }
              }
            }
          } catch (readError: any) {
            clearInactivityTimer();

            if (readError.name === 'AbortError') {
              // Client disconnected or timeout — stream was aborted
              console.log('[generate-quiz] Stream aborted (client disconnect or timeout)');
              streamIncomplete = true;
              parser.end();
            } else {
              console.error('[generate-quiz] Error reading AI stream:', readError.message);
              streamIncomplete = true;
              parser.end();
            }
          }
        } catch (error: any) {
          clearInactivityTimer();

          if (error.name === 'AbortError') {
            // Already handled above
            return;
          }

          console.error("[generate-quiz] Streaming error:", error.message);
          writeSSE("error", { message: error.message || "Failed to generate quiz" });
          controller.close();
        }
      },

      cancel() {
        // Client disconnected — abort the upstream AI request
        console.log('[generate-quiz] Client disconnected, aborting upstream request');
        abortController.abort();
      }
    });

    // Return the SSE streaming response
    return new Response(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("[generate-quiz] Unhandled error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
