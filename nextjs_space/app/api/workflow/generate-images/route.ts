export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// Load API secrets from environment variables
function getApiSecrets() {
  return {
    geminiKey: process.env.GEMINI_API_KEY || "",
    openaiKey: process.env.OPENAI_API_KEY || ""
  };
}

interface ScenePrompt {
  sceneNumber: number;
  prompt: string;
}

function extractImagePrompts(content: string): ScenePrompt[] {
  const prompts: ScenePrompt[] = [];
  
  // Look for patterns like "SCENE [X]" or "Scene 1" followed by prompts
  const sceneRegex = /SCENE\s*\[?(\d+)\]?[^]*?(?:FINAL.*?PROMPT|IMAGE PROMPT)[^:]*:\s*["']?([^"']+)["']?/gi;
  const nanoRegex = /NANO BANANA.*?PROMPT[^:]*:\s*["']?([^"'\n]+)/gi;
  
  let match;
  let sceneNum = 1;
  
  // Try to extract structured prompts
  while ((match = sceneRegex.exec(content)) !== null) {
    prompts.push({
      sceneNumber: parseInt(match[1]) || sceneNum,
      prompt: match[2].trim().slice(0, 1000) // Limit prompt length
    });
    sceneNum++;
  }
  
  // If no structured prompts found, try nano banana patterns
  if (prompts.length === 0) {
    sceneNum = 1;
    while ((match = nanoRegex.exec(content)) !== null) {
      prompts.push({
        sceneNumber: sceneNum,
        prompt: match[1].trim().slice(0, 1000)
      });
      sceneNum++;
    }
  }
  
  // If still no prompts, create a generic one from the content
  if (prompts.length === 0) {
    const lines = content.split('\n').filter(l => l.trim().length > 50);
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      prompts.push({
        sceneNumber: i + 1,
        prompt: lines[i].trim().slice(0, 500)
      });
    }
  }
  
  return prompts.slice(0, 8); // Max 8 scenes
}

async function generateImageWithGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Use Gemini's Imagen model for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            safetyFilterLevel: "block_only_high"
          }
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini Imagen error:", await response.text());
      return null;
    }

    const data = await response.json();
    const base64Image = data?.predictions?.[0]?.bytesBase64Encoded;
    
    if (base64Image) {
      return `data:image/png;base64,${base64Image}`;
    }
    return null;
  } catch (error) {
    console.error("Gemini image generation error:", error);
    return null;
  }
}

async function generateImageWithOpenAI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    // Clean prompt for DALL-E (remove technical photography terms that might cause issues)
    const cleanPrompt = prompt
      .replace(/Sony A7R IV|Canon R5|85mm|50mm|8K/gi, "high quality")
      .replace(/ultra-detailed|hyper-detailed/gi, "detailed")
      .slice(0, 4000);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: cleanPrompt,
        n: 1,
        size: "1792x1024",
        quality: "hd",
        style: "vivid"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI DALL-E error:", errText);
      return null;
    }

    const data = await response.json();
    return data?.data?.[0]?.url || null;
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, stepNumber = 4 } = body ?? {};

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const userId = (session.user as { id: string })?.id;

    // Get project and deliverable content
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { deliverables: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the image prompt deliverable (step 4)
    const imagePromptsDeliverable = project.deliverables.find(d => d.stepNumber === stepNumber);
    if (!imagePromptsDeliverable?.content) {
      return NextResponse.json(
        { error: "Please generate image prompts first (Step 4)" },
        { status: 400 }
      );
    }

    // Extract individual scene prompts
    const scenePrompts = extractImagePrompts(imagePromptsDeliverable.content);
    
    if (scenePrompts.length === 0) {
      return NextResponse.json(
        { error: "Could not extract image prompts from content" },
        { status: 400 }
      );
    }

    const { geminiKey, openaiKey } = getApiSecrets();
    
    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        { error: "No image generation API configured" },
        { status: 500 }
      );
    }

    const generatedImages: Array<{
      sceneNumber: number;
      imageUrl: string;
      promptUsed: string;
    }> = [];

    // Generate images for each scene
    for (const scene of scenePrompts) {
      let imageUrl: string | null = null;
      
      // Try Gemini first, then fall back to OpenAI
      if (geminiKey) {
        imageUrl = await generateImageWithGemini(scene.prompt, geminiKey);
      }
      
      if (!imageUrl && openaiKey) {
        imageUrl = await generateImageWithOpenAI(scene.prompt, openaiKey);
      }

      if (imageUrl) {
        // Save to database
        await prisma.projectImage.create({
          data: {
            projectId,
            stepNumber,
            sceneNumber: scene.sceneNumber,
            imageUrl,
            promptUsed: scene.prompt,
            isPublic: true
          }
        });

        generatedImages.push({
          sceneNumber: scene.sceneNumber,
          imageUrl,
          promptUsed: scene.prompt
        });
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any images" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: generatedImages,
      totalGenerated: generatedImages.length,
      totalRequested: scenePrompts.length
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    );
  }
}
