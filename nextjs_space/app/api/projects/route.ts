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

    const userId = (session.user as { id: string })?.id;
    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        deliverables: {
          select: { stepNumber: true, approved: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(projects ?? []);
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string })?.id;
    const body = await request.json();
    const { name, intakeData } = body ?? {};

    if (!name || !intakeData) {
      return NextResponse.json(
        { error: "Name and intake data are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        intakeData,
        userId,
        currentStep: 1,
        status: "in_progress"
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
