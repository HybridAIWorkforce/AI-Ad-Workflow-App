"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Target,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Volume2,
  Save,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

interface MasterPrompt {
  id: string;
  stepNumber: number;
  stepName: string;
  promptText: string;
  updatedAt: string;
}

interface AppSettings {
  id: string;
  voiceToneProfile: string;
  updatedAt: string;
}

const stepIcons = [
  Target,
  Sparkles,
  FileText,
  ImageIcon,
  Video,
  Mic
];

const stepDescriptions = [
  "Analyzes product info and creates ad strategy brief",
  "Defines visual style, colors, and character specifications",
  "Creates scene-by-scene scripts with timing and dialogue",
  "Generates detailed prompts for AI image generation (Gemini Imagen)",
  "Outputs structured JSON for video generation tools like VEO",
  "Generates voiceover audio using ElevenLabs"
];

const placeholderVariables = [
  "{{productName}}, {{coreDescription}}, {{primaryOffer}}, {{targetPlatform}}, {{adLength}}, {{adStyle}}, {{hasCharacter}}, {{voiceTone}}",
  "{{strategyBrief}} + all intake variables",
  "{{strategyBrief}}, {{styleSpec}} + all intake variables",
  "{{styleSpec}}, {{script}} + all intake variables",
  "{{script}}, {{imagePrompts}} + all intake variables",
  "Uses voiceover text extracted from Step 3 script"
];

export default function SettingsContent() {
  const [prompts, setPrompts] = useState<MasterPrompt[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<number[]>([1]);
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({});
  const [editedVoiceTone, setEditedVoiceTone] = useState("");
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [promptsRes, settingsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/settings")
      ]);

      const promptsData = await promptsRes?.json();
      const settingsData = await settingsRes?.json();

      setPrompts(promptsData ?? []);
      setSettings(settingsData ?? null);
      setEditedVoiceTone(settingsData?.voiceToneProfile ?? "");

      const initialEdits: Record<number, string> = {};
      for (const p of promptsData ?? []) {
        initialEdits[p?.stepNumber ?? 0] = p?.promptText ?? "";
      }
      setEditedPrompts(initialEdits);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData?.();
  }, [fetchData]);

  const handleSavePrompt = async (stepNumber: number) => {
    setSaving(`prompt-${stepNumber}`);
    try {
      const prompt = prompts?.find((p) => p?.stepNumber === stepNumber);
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepNumber,
          stepName: prompt?.stepName ?? `Step ${stepNumber}`,
          promptText: editedPrompts?.[stepNumber] ?? ""
        })
      });

      if (res?.ok) {
        toast.success(`Step ${stepNumber} prompt saved!`);
        fetchData?.();
      } else {
        throw new Error("Save failed");
      }
    } catch {
      toast.error("Failed to save prompt");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveVoiceTone = async () => {
    setSaving("voice-tone");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceToneProfile: editedVoiceTone ?? ""
        })
      });

      if (res?.ok) {
        toast.success("Voice/Tone profile saved!");
        fetchData?.();
      } else {
        throw new Error("Save failed");
      }
    } catch {
      toast.error("Failed to save voice/tone profile");
    } finally {
      setSaving(null);
    }
  };

  const togglePromptExpand = (stepNumber: number) => {
    setExpandedPrompts((prev) =>
      prev?.includes?.(stepNumber)
        ? prev?.filter?.((s) => s !== stepNumber) ?? []
        : [...(prev ?? []), stepNumber]
    );
  };

  const hasPromptChanges = (stepNumber: number) => {
    const original = prompts?.find((p) => p?.stepNumber === stepNumber)?.promptText ?? "";
    return editedPrompts?.[stepNumber] !== original;
  };

  const hasVoiceToneChanges = () => {
    return editedVoiceTone !== (settings?.voiceToneProfile ?? "");
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-purple-400" />
          Admin Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Configure master prompts and voice/tone profile for the AI workflow
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="mb-2">
                <strong>Master prompts</strong> are templates that drive each step of the workflow.
                They include placeholder variables like <code className="bg-gray-800 px-1 rounded">{'{{productName}}'}</code> that get replaced with actual project data.
              </p>
              <p>
                The <strong>Voice/Tone Profile</strong> is injected into prompts via <code className="bg-gray-800 px-1 rounded">{'{{voiceTone}}'}</code> and ensures consistent brand voice across all generated content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice/Tone Profile */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-purple-400" />
                Voice/Tone Profile
              </CardTitle>
              <CardDescription>
                Define your brand voice that will be applied to all generated content
              </CardDescription>
            </div>
            {hasVoiceToneChanges() && (
              <span className="text-xs text-yellow-400">Unsaved changes</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={editedVoiceTone ?? ""}
            onChange={(e) => setEditedVoiceTone(e?.target?.value ?? "")}
            rows={10}
            placeholder="Describe your brand voice, tone, language preferences, and communication style..."
            className="font-mono text-sm"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSaveVoiceTone}
              disabled={saving === "voice-tone" || !hasVoiceToneChanges()}
              className="gap-2"
            >
              {saving === "voice-tone" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Voice/Tone
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Master Prompts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Master Prompts</h2>

        {[1, 2, 3, 4, 5]?.map((stepNumber) => {
          const prompt = prompts?.find((p) => p?.stepNumber === stepNumber);
          const Icon = stepIcons?.[stepNumber - 1] ?? Settings;
          const isExpanded = expandedPrompts?.includes?.(stepNumber);
          const hasChanges = hasPromptChanges(stepNumber);

          return (
            <motion.div
              key={stepNumber}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stepNumber * 0.05 }}
            >
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="cursor-pointer" onClick={() => togglePromptExpand(stepNumber)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        {Icon && <Icon className="w-5 h-5 text-purple-400" />}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Step {stepNumber}: {prompt?.stepName ?? `Step ${stepNumber}`}
                          {hasChanges && (
                            <span className="text-xs text-yellow-400 font-normal">
                              (unsaved)
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {stepDescriptions?.[stepNumber - 1] ?? ""}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prompt && (
                        <span className="text-xs text-gray-500">
                          Updated: {new Date(prompt?.updatedAt ?? Date.now())?.toLocaleDateString?.() ?? "Unknown"}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Available Variables */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">
                        <Eye className="w-3 h-3 inline mr-1" />
                        Available variables:
                      </p>
                      <code className="text-xs text-purple-300">
                        {placeholderVariables?.[stepNumber - 1] ?? ""}
                      </code>
                    </div>

                    <Textarea
                      value={editedPrompts?.[stepNumber] ?? ""}
                      onChange={(e) =>
                        setEditedPrompts((prev) => ({
                          ...(prev ?? {}),
                          [stepNumber]: e?.target?.value ?? ""
                        }))
                      }
                      rows={15}
                      placeholder={`Enter the master prompt for Step ${stepNumber}...`}
                      className="font-mono text-sm"
                    />

                    <div className="flex justify-end gap-2">
                      {hasChanges && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setEditedPrompts((prev) => ({
                              ...(prev ?? {}),
                              [stepNumber]: prompt?.promptText ?? ""
                            }))
                          }
                        >
                          Discard Changes
                        </Button>
                      )}
                      <Button
                        onClick={() => handleSavePrompt?.(stepNumber)}
                        disabled={saving === `prompt-${stepNumber}` || !hasChanges}
                        className="gap-2"
                      >
                        {saving === `prompt-${stepNumber}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Prompt
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
