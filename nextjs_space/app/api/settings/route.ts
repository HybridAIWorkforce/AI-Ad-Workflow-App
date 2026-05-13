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

    const settings = await prisma.appSettings.findFirst();
    return NextResponse.json(settings ?? { voiceToneProfile: "" });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { voiceToneProfile } = body ?? {};

    let settings = await prisma.appSettings.findFirst();

    if (settings) {
      settings = await prisma.appSettings.update({
        where: { id: settings.id },
        data: { voiceToneProfile: voiceToneProfile ?? "" }
      });
    } else {
      settings = await prisma.appSettings.create({
        data: { voiceToneProfile: voiceToneProfile ?? "" }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
