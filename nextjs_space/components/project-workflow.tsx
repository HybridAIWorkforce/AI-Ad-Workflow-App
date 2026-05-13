"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Target,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Check,
  Play,
  RefreshCw,
  Download,
  Edit3,
  Save,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

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

interface Deliverable {
  id: string;
  stepNumber: number;
  content: string;
  approved: boolean;
  createdAt: string;
}

interface ProjectImage {
  id: string;
  stepNumber: number;
  sceneNumber: number;
  imageUrl: string;
  promptUsed: string;
  createdAt: string;
}

interface ProjectAudio {
  id: string;
  stepNumber: number;
  sceneNumber: number;
  audioUrl: string;
  voiceoverText: string;
  voiceId?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  intakeData: IntakeData;
  deliverables: Deliverable[];
  images: ProjectImage[];
  audios: ProjectAudio[];
}

const steps = [
  { number: 1, name: "Strategy Engine", icon: Target, description: "Define ad strategy" },
  { number: 2, name: "Style Engine", icon: Sparkles, description: "Visual specifications" },
  { number: 3, name: "Script Engine", icon: FileText, description: "Scene-by-scene script" },
  { number: 4, name: "Image Generation", icon: ImageIcon, description: "Generate AI images with Gemini" },
  { number: 5, name: "Video JSON", icon: Video, description: "VEO/video output" },
  { number: 6, name: "Voice Generation", icon: Mic, description: "Generate voiceovers with ElevenLabs" }
];

export default function ProjectWorkflow({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [approving, setApproving] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res?.json();
      if (res?.ok) {
        setProject(data ?? null);
        setActiveStep(data?.currentStep ?? 1);
      } else {
        toast.error("Project not found");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    setMounted(true);
    if (projectId) {
      fetchProject?.();
    }
  }, [projectId, fetchProject]);

  const getDeliverable = (stepNumber: number): Deliverable | undefined => {
    return project?.deliverables?.find((d) => d?.stepNumber === stepNumber);
  };

  const handleGenerate = async (stepNumber: number) => {
    setGenerating(true);
    setStreamContent("");
    setActiveStep(stepNumber);

    try {
      const response = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stepNumber })
      });

      if (!response?.ok) throw new Error("Generation failed");

      const reader = response?.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = "";
      let fullContent = "";

      while (true) {
        const result = await reader?.read();
        if (result?.done) break;

        const chunk = decoder?.decode(result?.value, { stream: true }) ?? "";
        partialRead += chunk;

        const lines = partialRead?.split?.("\n") ?? [];
        partialRead = lines?.pop?.() ?? "";

        for (const line of lines ?? []) {
          if (line?.startsWith?.("data: ")) {
            try {
              const data = JSON.parse(line?.slice?.(6) ?? "{}");
              if (data?.type === "chunk") {
                fullContent += data?.content ?? "";
                setStreamContent(fullContent);
              } else if (data?.type === "done") {
                setStreamContent(data?.content ?? fullContent);
                await fetchProject?.();
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (stepNumber: number, content?: string) => {
    setApproving(true);
    try {
      const res = await fetch("/api/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stepNumber,
          content: content ?? getDeliverable(stepNumber)?.content ?? streamContent ?? ""
        })
      });

      const data = await res?.json();
      if (res?.ok) {
        toast.success(`Step ${stepNumber} approved!`);
        setEditMode(false);
        setStreamContent("");
        await fetchProject?.();
        if ((data?.nextStep ?? 0) > stepNumber) {
          setActiveStep(data?.nextStep ?? stepNumber + 1);
        }
      } else {
        throw new Error(data?.error ?? "Approval failed");
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const handleGenerateImages = async () => {
    setGeneratingImages(true);
    try {
      const res = await fetch("/api/workflow/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stepNumber: 4 })
      });
      
      const data = await res?.json();
      if (res?.ok) {
        toast.success(`Generated ${data?.totalGenerated} images!`);
        await fetchProject?.();
      } else {
        throw new Error(data?.error || "Failed to generate images");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate images";
      toast.error(message);
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleGenerateVoice = async () => {
    setGeneratingVoice(true);
    try {
      const res = await fetch("/api/workflow/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      
      const data = await res?.json();
      if (res?.ok) {
        toast.success(`Generated ${data?.totalGenerated} voice clips!`);
        await fetchProject?.();
      } else {
        throw new Error(data?.error || "Failed to generate voice");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate voice";
      toast.error(message);
    } finally {
      setGeneratingVoice(false);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a?.click?.();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator?.clipboard?.writeText?.(text ?? "");
    toast.success("Copied to clipboard");
  };

  const toggleStepExpand = (stepNumber: number) => {
    setExpandedSteps((prev) =>
      prev?.includes?.(stepNumber)
        ? prev?.filter?.((s) => s !== stepNumber) ?? []
        : [...(prev ?? []), stepNumber]
    );
  };

  const isStepComplete = (stepNumber: number) => {
    const deliverable = getDeliverable(stepNumber);
    return deliverable?.approved === true;
  };

  const canRunStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    return isStepComplete(stepNumber - 1);
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Project not found</p>
      </div>
    );
  }

  const currentDeliverable = getDeliverable(activeStep);
  const displayContent = streamContent || currentDeliverable?.content || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{project?.name ?? "Untitled"}</h1>
            <p className="text-gray-400 text-sm">
              {project?.intakeData?.targetPlatform ?? "Unknown"} • {project?.intakeData?.adLength ?? "Unknown"} •{" "}
              {project?.intakeData?.adStyle ?? "Unknown"}
            </p>
          </div>
        </div>
        {project?.status === "completed" && (
          <Badge variant="success" className="text-sm">
            <Check className="w-4 h-4 mr-1" /> Completed
          </Badge>
        )}
      </div>

      {/* Progress Steps */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {steps?.map((step, index) => {
              const Icon = step?.icon;
              const isComplete = isStepComplete(step?.number ?? 0);
              const isCurrent = activeStep === step?.number;
              const isAccessible = canRunStep(step?.number ?? 0);

              return (
                <div key={step?.number ?? index} className="flex items-center">
                  <button
                    onClick={() => {
                      if (isAccessible || isComplete) {
                        setActiveStep(step?.number ?? 1);
                        setStreamContent("");
                        setEditMode(false);
                      }
                    }}
                    disabled={!isAccessible && !isComplete}
                    className={`flex flex-col items-center p-2 rounded-lg transition-colors min-w-[80px] ${
                      isCurrent
                        ? "bg-purple-600/20"
                        : isComplete
                        ? "hover:bg-gray-800"
                        : isAccessible
                        ? "hover:bg-gray-800"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        isComplete
                          ? "bg-green-600"
                          : isCurrent
                          ? "bg-purple-600"
                          : "bg-gray-700"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : Icon ? (
                        <Icon className="w-5 h-5 text-white" />
                      ) : null}
                    </div>
                    <span
                      className={`text-xs font-medium text-center ${
                        isCurrent ? "text-purple-400" : "text-gray-400"
                      }`}
                    >
                      {step?.name ?? "Step"}
                    </span>
                  </button>
                  {index < (steps?.length ?? 0) - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-2 ${
                        isComplete ? "bg-green-600" : "bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Step */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Step {activeStep}: {steps?.find((s) => s?.number === activeStep)?.name ?? "Unknown"}
                  </CardTitle>
                  <CardDescription>
                    {steps?.find((s) => s?.number === activeStep)?.description ?? ""}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {displayContent && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard?.(displayContent ?? "")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownload?.(
                            displayContent ?? "",
                            `step${activeStep}-${project?.name ?? "project"}.md`
                          )
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Content Display */}
              {generating ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating content...</span>
                  </div>
                  {streamContent && (
                    <div className="prose prose-invert max-w-none bg-gray-800/50 rounded-lg p-4 max-h-[500px] overflow-auto">
                      <div className="markdown-content whitespace-pre-wrap">
                        {streamContent ?? ""}
                      </div>
                    </div>
                  )}
                </div>
              ) : displayContent ? (
                <div className="space-y-4">
                  {editMode ? (
                    <Textarea
                      value={editContent ?? ""}
                      onChange={(e) => setEditContent(e?.target?.value ?? "")}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-gray-800/50 rounded-lg p-4 max-h-[500px] overflow-auto">
                      <div className="markdown-content whitespace-pre-wrap text-gray-200">
                        {displayContent ?? ""}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {!currentDeliverable?.approved && (
                      <>
                        {editMode ? (
                          <>
                            <Button
                              onClick={() => {
                                handleApprove?.(activeStep, editContent ?? "");
                              }}
                              disabled={approving}
                              className="gap-2"
                            >
                              {approving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save & Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditMode(false)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleApprove?.(activeStep)}
                              disabled={approving}
                              className="gap-2"
                            >
                              {approving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Approve & Continue
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditContent(displayContent ?? "");
                                setEditMode(true);
                              }}
                              className="gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleGenerate?.(activeStep)}
                              className="gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Regenerate
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    {currentDeliverable?.approved && (
                      <Badge variant="success" className="text-sm py-2">
                        <Check className="w-4 h-4 mr-1" /> Approved
                      </Badge>
                    )}
                  </div>

                  {/* Step 4: Image Generation UI */}
                  {activeStep === 4 && currentDeliverable?.approved && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Wand2 className="w-5 h-5 text-purple-400" />
                          Generate Images with Gemini Imagen
                        </h4>
                        <Button
                          onClick={handleGenerateImages}
                          disabled={generatingImages}
                          className="gap-2"
                        >
                          {generatingImages ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                          {generatingImages ? "Generating..." : "Generate Images"}
                        </Button>
                      </div>
                      
                      {/* Display Generated Images */}
                      {(project?.images?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {project?.images
                            ?.filter(img => img.stepNumber === 4)
                            ?.sort((a, b) => a.sceneNumber - b.sceneNumber)
                            ?.map((img) => (
                            <div key={img.id} className="bg-gray-800 rounded-lg overflow-hidden">
                              <div className="aspect-video relative">
                                {img.imageUrl.startsWith('data:') ? (
                                  <img
                                    src={img.imageUrl}
                                    alt={`Scene ${img.sceneNumber}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <img
                                    src={img.imageUrl}
                                    alt={`Scene ${img.sceneNumber}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="p-3">
                                <p className="text-sm font-medium text-white">Scene {img.sceneNumber}</p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{img.promptUsed}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 6: Voice Generation UI */}
                  {activeStep === 6 && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Mic className="w-5 h-5 text-purple-400" />
                          Generate Voiceovers with ElevenLabs
                        </h4>
                        <Button
                          onClick={handleGenerateVoice}
                          disabled={generatingVoice || !getDeliverable(3)?.approved}
                          className="gap-2"
                        >
                          {generatingVoice ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                          {generatingVoice ? "Generating..." : "Generate Voice"}
                        </Button>
                      </div>
                      
                      {!getDeliverable(3)?.approved && (
                        <p className="text-sm text-amber-400 mb-4">
                          ⚠️ Complete Step 3 (Script) first to generate voiceovers
                        </p>
                      )}
                      
                      {/* Display Generated Audio */}
                      {(project?.audios?.length ?? 0) > 0 && (
                        <div className="space-y-4">
                          {project?.audios
                            ?.filter(audio => audio.stepNumber === 6)
                            ?.sort((a, b) => a.sceneNumber - b.sceneNumber)
                            ?.map((audio) => (
                            <div key={audio.id} className="bg-gray-800 rounded-lg p-4">
                              <p className="text-sm font-medium text-white mb-2">Scene {audio.sceneNumber}</p>
                              <p className="text-xs text-gray-400 mb-3 italic">&quot;{audio.voiceoverText}&quot;</p>
                              <audio controls className="w-full">
                                <source src={audio.audioUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    {(() => {
                      const Icon = steps?.find((s) => s?.number === activeStep)?.icon;
                      return Icon ? <Icon className="w-8 h-8 text-gray-500" /> : null;
                    })()}
                  </div>
                  <p className="text-gray-400 mb-6">
                    {canRunStep(activeStep)
                      ? "Click the button below to generate content for this step"
                      : "Complete the previous step first"}
                  </p>
                  <Button
                    onClick={() => handleGenerate?.(activeStep)}
                    disabled={!canRunStep(activeStep) || generating}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Generate Step {activeStep}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Previous Deliverables */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Deliverables</h3>
          {steps?.map((step) => {
            const deliverable = getDeliverable(step?.number ?? 0);
            if (!deliverable) return null;

            const isExpanded = expandedSteps?.includes?.(step?.number ?? 0);

            return (
              <Card
                key={step?.number ?? 0}
                className="bg-gray-900/50 border-gray-800"
              >
                <CardHeader className="p-4">
                  <button
                    onClick={() => toggleStepExpand?.(step?.number ?? 0)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      {deliverable?.approved ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {step?.name ?? "Step"}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-4 pt-0">
                    <div className="bg-gray-800/50 rounded p-3 max-h-40 overflow-auto">
                      <p className="text-xs text-gray-400 whitespace-pre-wrap">
                        {(deliverable?.content ?? "")?.slice?.(0, 500) ?? ""}
                        {(deliverable?.content?.length ?? 0) > 500 && "..."}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveStep(step?.number ?? 1);
                          setStreamContent("");
                          setEditMode(false);
                        }}
                      >
                        View Full
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Project Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platform</span>
                <span className="text-white">{project?.intakeData?.targetPlatform ?? "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Length</span>
                <span className="text-white">{project?.intakeData?.adLength ?? "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Style</span>
                <span className="text-white">{project?.intakeData?.adStyle ?? "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Character</span>
                <span className="text-white">
                  {project?.intakeData?.hasCharacter ? "Yes" : "No"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
