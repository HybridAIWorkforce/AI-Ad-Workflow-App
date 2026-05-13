export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prompts = await prisma.masterPrompt.findMany({
      orderBy: { stepNumber: "asc" }
    });

    return NextResponse.json(prompts ?? []);
  } catch (error) {
    console.error("Get prompts error:", error);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stepNumber, promptText, stepName } = body ?? {};

    if (!stepNumber || !promptText) {
      return NextResponse.json(
        { error: "Step number and prompt text are required" },
        { status: 400 }
      );
    }

    const prompt = await prisma.masterPrompt.upsert({
      where: { stepNumber },
      update: { promptText, stepName: stepName ?? undefined },
      create: {
        stepNumber,
        stepName: stepName ?? `Step ${stepNumber}`,
        promptText
      }
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("Update prompt error:", error);
    return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 });
  }
}
