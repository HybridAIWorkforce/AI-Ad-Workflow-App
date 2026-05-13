export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const SYSTEM_PROMPT = `You are a helpful assistant for an AI Ad Creation Workflow platform. Your role is to:

1. Help users understand the 5-step ad creation process:
   - Step 1: Strategy Engine - Creates the overall ad strategy brief
   - Step 2: Style Engine - Defines visual style and character specifications
   - Step 3: Script Engine - Writes scene-by-scene scripts
   - Step 4: Image Scene Generation - Creates image prompts and generates images
   - Step 5: Video Engine VEO JSON - Outputs structured JSON for video tools

2. Provide tips for better results at each step
3. Answer questions about ad creation best practices
4. Help troubleshoot issues with the workflow
5. Explain how to use the intake form effectively

Be concise, helpful, and encouraging. Focus on actionable advice.`;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body ?? {};

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(messages ?? [])
        ],
        stream: true,
        max_tokens: 1000
      })
    });

    if (!response?.ok) {
      throw new Error(`LLM API error: ${response?.status}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response?.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let partialRead = "";

        try {
          while (true) {
            const result = await reader?.read();
            if (result?.done) break;
            const chunk = decoder?.decode(result?.value, { stream: true }) ?? "";
            partialRead += chunk;

            const lines = partialRead?.split("\n") ?? [];
            partialRead = lines?.pop() ?? "";

            for (const line of lines ?? []) {
              if (line?.startsWith("data: ")) {
                const data = line?.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? "";
                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Chatbot stream error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
