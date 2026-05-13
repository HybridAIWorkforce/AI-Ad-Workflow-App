export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cloud_storage_path, isPublic } = body ?? {};

    if (!cloud_storage_path) {
      return NextResponse.json(
        { error: "cloud_storage_path is required" },
        { status: 400 }
      );
    }

    const url = await getFileUrl(cloud_storage_path, isPublic ?? true);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get file URL error:", error);
    return NextResponse.json(
      { error: "Failed to get file URL" },
      { status: 500 }
    );
  }
}
