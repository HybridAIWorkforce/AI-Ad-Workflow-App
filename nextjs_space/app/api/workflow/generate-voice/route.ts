export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// Load API secrets from environment variables
function getApiSecrets() {
  return {
    elevenLabsKey: process.env.ELEVENLABS_API_KEY || ""
  };
}

interface VoiceoverScene {
  sceneNumber: number;
  text: string;
}

function extractVoiceovers(content: string): VoiceoverScene[] {
  const voiceovers: VoiceoverScene[] = [];
  
  // Normalize line endings and convert smart quotes to regular quotes
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  normalizedContent = normalizedContent.replace(/[""]/g, '"').replace(/['']/g, "'");
  
  // Primary pattern: Match SCENE X followed by content, extract VOICEOVER text
  // Format: SCENE 1 — TITLE ... 4) VOICEOVER (VO) \n "text here"
  const scenePattern = /SCENE\s+(\d+)[^\n]*\n([\s\S]*?)(?=SCENE\s+\d+|$)/gi;
  let sceneMatch;
  
  while ((sceneMatch = scenePattern.exec(normalizedContent)) !== null) {
    const sceneNum = parseInt(sceneMatch[1]);
    const sceneContent = sceneMatch[2];
    
    // Look for "4) VOICEOVER (VO)" followed by quoted text on the next line
    // Handle whitespace including trailing spaces before newline
    const voPattern = /\d+\)\s*VOICEOVER\s*\(VO\)\s*\n"([^"]+)"/gi;
    let voMatch;
    
    while ((voMatch = voPattern.exec(sceneContent)) !== null) {
      const text = voMatch[1].trim();
      if (text.length > 5) {
        voiceovers.push({ sceneNumber: sceneNum, text });
      }
    }
  }
  
  // Fallback: simpler pattern if the above didn't work
  if (voiceovers.length === 0) {
    const simplePattern = /VOICEOVER\s*\(VO\)\s*\n"([^"]+)"/gi;
    let match;
    let sceneNum = 1;
    while ((match = simplePattern.exec(normalizedContent)) !== null) {
      const text = match[1].trim();
      if (text.length > 5) {
        voiceovers.push({ sceneNumber: sceneNum++, text });
      }
    }
  }
  
  // Second fallback: any quoted text after VOICEOVER header
  if (voiceovers.length === 0) {
    const anyQuotePattern = /VOICEOVER[^\n]*\n"([^"]+)"/gi;
    let match;
    let sceneNum = 1;
    while ((match = anyQuotePattern.exec(normalizedContent)) !== null) {
      const text = match[1].trim();
      if (text.length > 5) {
        voiceovers.push({ sceneNumber: sceneNum++, text });
      }
    }
  }
  
  console.log(`Extracted ${voiceovers.length} voiceovers from script`);
  
  return voiceovers.slice(0, 10); // Max 10 scenes
}

async function generateVoiceWithElevenLabs(
  text: string,
  apiKey: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM" // Default: Rachel voice
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs error:", await response.text());
      return null;
    }

    // Get audio as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error("ElevenLabs generation error:", error);
    return null;
  }
}

async function getAvailableVoices(apiKey: string) {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });
    if (response.ok) {
      const data = await response.json();
      return data?.voices || [];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, voiceId } = body ?? {};

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const userId = (session.user as { id: string })?.id;

    // Get project and script
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { deliverables: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get script deliverable (step 3)
    const scriptDeliverable = project.deliverables.find(d => d.stepNumber === 3);
    if (!scriptDeliverable?.content) {
      return NextResponse.json(
        { error: "Please generate script first (Step 3)" },
        { status: 400 }
      );
    }

    // Extract voiceovers from script
    const voiceovers = extractVoiceovers(scriptDeliverable.content);
    
    if (voiceovers.length === 0) {
      return NextResponse.json(
        { error: "Could not extract voiceover text from script" },
        { status: 400 }
      );
    }

    const { elevenLabsKey } = getApiSecrets();
    
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: "ElevenLabs API not configured" },
        { status: 500 }
      );
    }

    const generatedAudios: Array<{
      sceneNumber: number;
      audioUrl: string;
      voiceoverText: string;
    }> = [];

    // Use provided voiceId or default
    const selectedVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

    // Generate voice for each scene
    for (const scene of voiceovers) {
      const audioUrl = await generateVoiceWithElevenLabs(
        scene.text,
        elevenLabsKey,
        selectedVoiceId
      );

      if (audioUrl) {
        // Save to database
        await prisma.projectAudio.create({
          data: {
            projectId,
            stepNumber: 6,
            sceneNumber: scene.sceneNumber,
            audioUrl,
            voiceoverText: scene.text,
            voiceId: selectedVoiceId,
            isPublic: true
          }
        });

        generatedAudios.push({
          sceneNumber: scene.sceneNumber,
          audioUrl,
          voiceoverText: scene.text
        });
      }
    }

    if (generatedAudios.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any audio" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audios: generatedAudios,
      totalGenerated: generatedAudios.length,
      totalRequested: voiceovers.length
    });

  } catch (error) {
    console.error("Voice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate voice" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch available voices
export async function GET() {
  try {
    const { elevenLabsKey } = getApiSecrets();
    if (!elevenLabsKey) {
      return NextResponse.json({ voices: [] });
    }
    
    const voices = await getAvailableVoices(elevenLabsKey);
    return NextResponse.json({ voices });
  } catch {
    return NextResponse.json({ voices: [] });
  }
}
