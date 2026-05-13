export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

interface IntakeData {
  productName?: string;
  coreDescription?: string;
  referenceImageUrl?: string;
  primaryOffer?: string;
  targetPlatform?: string;
  adLength?: string;
  adStyle?: string;
  hasCharacter?: boolean;
}

function buildPrompt(
  templatePrompt: string,
  intakeData: IntakeData,
  voiceTone: string,
  previousDeliverables: Record<number, string>
): string {
  let prompt = templatePrompt;

  const replacements: Record<string, string> = {
    "{{productName}}": intakeData?.productName ?? "[Product Name]",
    "{{coreDescription}}": intakeData?.coreDescription ?? "[Description]",
    "{{primaryOffer}}": intakeData?.primaryOffer ?? "[CTA]",
    "{{targetPlatform}}": intakeData?.targetPlatform ?? "[Platform]",
    "{{adLength}}": intakeData?.adLength ?? "[Length]",
    "{{adStyle}}": intakeData?.adStyle ?? "[Style]",
    "{{hasCharacter}}": intakeData?.hasCharacter ? "Yes" : "No",
    "{{voiceTone}}": voiceTone ?? "",
    "{{strategyBrief}}": previousDeliverables?.[1] ?? "[Strategy Brief]",
    "{{styleSpec}}": previousDeliverables?.[2] ?? "[Style Spec]",
    "{{script}}": previousDeliverables?.[3] ?? "[Script]",
    "{{imagePrompts}}": previousDeliverables?.[4] ?? "[Image Prompts]"
  };

  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt?.split(key)?.join(value) ?? prompt;
  }

  if (intakeData?.hasCharacter) {
    prompt = prompt?.replace(/{{#if hasCharacter}}([\s\S]*?){{\/(if|endif)}}/g, "$1") ?? prompt;
  } else {
    prompt = prompt?.replace(/{{#if hasCharacter}}[\s\S]*?{{\/(if|endif)}}/g, "") ?? prompt;
  }

  return prompt;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, stepNumber } = body ?? {};

    if (!projectId || !stepNumber) {
      return NextResponse.json(
        { error: "Project ID and step number are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string })?.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { deliverables: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const masterPrompt = await prisma.masterPrompt.findUnique({
      where: { stepNumber }
    });

    if (!masterPrompt) {
      return NextResponse.json(
        { error: "Master prompt not found" },
        { status: 404 }
      );
    }

    const settings = await prisma.appSettings.findFirst();
    const voiceTone = settings?.voiceToneProfile ?? "";

    const previousDeliverables: Record<number, string> = {};
    for (const d of project?.deliverables ?? []) {
      previousDeliverables[d?.stepNumber ?? 0] = d?.content ?? "";
    }

    const intakeData = (project?.intakeData as IntakeData) ?? {};
    const finalPrompt = buildPrompt(
      masterPrompt?.promptText ?? "",
      intakeData,
      voiceTone,
      previousDeliverables
    );

    const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI advertising assistant. Generate high-quality, detailed, and actionable content for ad creation workflows."
          },
          { role: "user", content: finalPrompt }
        ],
        stream: true,
        max_tokens: 4000
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
        let fullContent = "";
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
                  await prisma.deliverable.upsert({
                    where: {
                      projectId_stepNumber: {
                        projectId,
                        stepNumber
                      }
                    },
                    update: {
                      content: fullContent,
                      approved: false
                    },
                    create: {
                      projectId,
                      stepNumber,
                      content: fullContent,
                      approved: false
                    }
                  });

                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "done", content: fullContent })}\n\n`
                    )
                  );
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? "";
                  if (content) {
                    fullContent += content;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "chunk", content })}\n\n`
                      )
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
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
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
