export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, stepNumber, content } = body ?? {};

    if (!projectId || !stepNumber) {
      return NextResponse.json(
        { error: "Project ID and step number are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string })?.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.deliverable.upsert({
      where: {
        projectId_stepNumber: {
          projectId,
          stepNumber
        }
      },
      update: {
        approved: true,
        content: content ?? undefined
      },
      create: {
        projectId,
        stepNumber,
        content: content ?? "",
        approved: true
      }
    });

    const nextStep = stepNumber < 5 ? stepNumber + 1 : 5;
    const newStatus = stepNumber >= 5 ? "completed" : "in_progress";

    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentStep: nextStep,
        status: newStatus
      }
    });

    return NextResponse.json({ success: true, nextStep, status: newStatus });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve deliverable" },
      { status: 500 }
    );
  }
}
