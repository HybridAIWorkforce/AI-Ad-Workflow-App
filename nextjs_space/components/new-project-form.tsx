"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  FileText,
  Image as ImageIcon,
  Target,
  Layout,
  Clock,
  Palette,
  Users,
  Upload,
  X,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

const platforms = [
  { value: "YouTube Shorts", label: "YouTube Shorts" },
  { value: "TikTok", label: "TikTok" },
  { value: "Instagram Reels", label: "Instagram Reels" },
  { value: "Meta", label: "Meta (Facebook/Instagram)" },
  { value: "LinkedIn", label: "LinkedIn" }
];

const adLengths = [
  { value: "15s", label: "15 seconds" },
  { value: "30s", label: "30 seconds" },
  { value: "60s", label: "60 seconds" }
];

const adStyles = [
  { value: "Movie", label: "Movie/Cinematic", icon: "🎬" },
  { value: "UGC", label: "UGC (User Generated)", icon: "📱" },
  { value: "Product Demo", label: "Product Demo", icon: "🎯" },
  { value: "Minimalist Apple", label: "Minimalist/Apple Style", icon: "✨" },
  { value: "CGI", label: "CGI/3D", icon: "🎮" },
  { value: "Hybrid", label: "Hybrid Mix", icon: "🔀" }
];

export default function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    coreDescription: "",
    referenceImageUrl: "",
    primaryOffer: "",
    targetPlatform: "TikTok",
    adLength: "30s",
    adStyle: "UGC",
    hasCharacter: true
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    // Validate file type - allow common image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const fileType = file?.type?.toLowerCase() || '';
    const fileName = file?.name?.toLowerCase() || '';
    
    // Check by MIME type or file extension
    const isValidImage = allowedTypes.includes(fileType) || 
      fileName.endsWith('.jpg') || 
      fileName.endsWith('.jpeg') || 
      fileName.endsWith('.png') || 
      fileName.endsWith('.gif') || 
      fileName.endsWith('.webp') ||
      fileName.endsWith('.heic');
    
    if (!isValidImage) {
      toast.error("Please upload an image file (JPG, PNG, GIF, WebP)");
      return;
    }

    if (file?.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      // Determine content type - default to jpeg if unknown
      let contentType = fileType;
      if (!contentType || contentType === 'application/octet-stream') {
        if (fileName.endsWith('.png')) contentType = 'image/png';
        else if (fileName.endsWith('.gif')) contentType = 'image/gif';
        else if (fileName.endsWith('.webp')) contentType = 'image/webp';
        else contentType = 'image/jpeg';
      }

      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file?.name ?? "image.jpg",
          contentType: contentType,
          isPublic: true
        })
      });

      if (!presignedRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, cloud_storage_path } = await presignedRes?.json();

      // Check if content-disposition is in signed headers
      const hasContentDisposition = uploadUrl?.includes?.("content-disposition");
      const headers: Record<string, string> = {
        "Content-Type": contentType
      };
      if (hasContentDisposition) {
        headers["Content-Disposition"] = "attachment";
      }

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      // Build the public S3 URL from the cloud_storage_path
      const getFileUrlRes = await fetch("/api/upload/get-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      });
      
      let imageUrl = '';
      if (getFileUrlRes.ok) {
        const { url } = await getFileUrlRes.json();
        imageUrl = url;
      } else {
        // Fallback: use cloud_storage_path as identifier
        imageUrl = cloud_storage_path;
      }

      setFormData((prev) => ({ ...(prev ?? {}), referenceImageUrl: imageUrl }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again or use a URL instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    if (!formData?.productName?.trim?.()) {
      toast.error("Product name is required");
      return;
    }

    if (!formData?.coreDescription?.trim?.()) {
      toast.error("Product description is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData?.productName ?? "Untitled",
          intakeData: formData ?? {}
        })
      });

      const project = await res?.json();

      if (!res?.ok) {
        throw new Error(project?.error ?? "Failed to create project");
      }

      toast.success("Project created! Starting workflow...");
      router.push(`/dashboard/project/${project?.id ?? ""}`);
    } catch (error) {
      console.error("Create project error:", error);
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Create New Project</h1>
        <p className="text-gray-400 mt-1">
          Fill in your product details to start the AI ad creation workflow
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Details */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Product Details
            </CardTitle>
            <CardDescription>Basic information about your product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Product Name *
              </label>
              <Input
                value={formData?.productName ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...(prev ?? {}),
                    productName: e?.target?.value ?? ""
                  }))
                }
                placeholder="e.g., SuperClean Water Bottle"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Core Description *
              </label>
              <Textarea
                value={formData?.coreDescription ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...(prev ?? {}),
                    coreDescription: e?.target?.value ?? ""
                  }))
                }
                placeholder="Describe your product, its key features, benefits, and what makes it unique..."
                rows={4}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Reference Image */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              Reference Image
            </CardTitle>
            <CardDescription>Upload a product image or paste a URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData?.referenceImageUrl ? (
              <div className="relative">
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <Image
                    src={formData?.referenceImageUrl ?? ""}
                    alt="Product reference"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...(prev ?? {}), referenceImageUrl: "" }))
                  }
                  className="absolute top-2 right-2 w-8 h-8 bg-gray-900/80 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-500 mb-2" />
                      <span className="text-sm text-gray-400">Click to upload image</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</span>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                <div className="text-center text-gray-500 text-sm">or</div>
                <Input
                  value={formData?.referenceImageUrl ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...(prev ?? {}),
                      referenceImageUrl: e?.target?.value ?? ""
                    }))
                  }
                  placeholder="Paste image URL..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Call to Action
            </CardTitle>
            <CardDescription>What action should viewers take?</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={formData?.primaryOffer ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...(prev ?? {}),
                  primaryOffer: e?.target?.value ?? ""
                }))
              }
              placeholder="e.g., Shop Now - 20% Off, Learn More, Download Free, etc."
            />
          </CardContent>
        </Card>

        {/* Platform & Length */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-purple-400" />
              Platform & Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Platform
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {platforms?.map((platform) => (
                  <button
                    key={platform?.value ?? ""}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...(prev ?? {}),
                        targetPlatform: platform?.value ?? ""
                      }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      formData?.targetPlatform === platform?.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {platform?.label ?? ""}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ad Length
              </label>
              <div className="flex gap-2">
                {adLengths?.map((length) => (
                  <button
                    key={length?.value ?? ""}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...(prev ?? {}),
                        adLength: length?.value ?? ""
                      }))
                    }
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                      formData?.adLength === length?.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {length?.label ?? ""}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ad Style */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Ad Style
            </CardTitle>
            <CardDescription>Choose the visual style for your ad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {adStyles?.map((style) => (
                <button
                  key={style?.value ?? ""}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...(prev ?? {}),
                      adStyle: style?.value ?? ""
                    }))
                  }
                  className={`p-4 rounded-lg text-left transition-colors ${
                    formData?.adStyle === style?.value
                      ? "bg-purple-600/20 border-2 border-purple-500"
                      : "bg-gray-800 border-2 border-transparent hover:border-gray-700"
                  }`}
                >
                  <div className="text-2xl mb-2">{style?.icon ?? ""}</div>
                  <div className="text-sm font-medium text-white">{style?.label ?? ""}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Character */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Character/Spokesperson
            </CardTitle>
            <CardDescription>
              Should the ad feature a character or spokesperson?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...(prev ?? {}), hasCharacter: true }))
                }
                className={`flex-1 p-4 rounded-lg text-center transition-colors ${
                  formData?.hasCharacter
                    ? "bg-purple-600/20 border-2 border-purple-500"
                    : "bg-gray-800 border-2 border-transparent hover:border-gray-700"
                }`}
              >
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-medium text-white">Yes, include character</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...(prev ?? {}), hasCharacter: false }))
                }
                className={`flex-1 p-4 rounded-lg text-center transition-colors ${
                  !formData?.hasCharacter
                    ? "bg-purple-600/20 border-2 border-purple-500"
                    : "bg-gray-800 border-2 border-transparent hover:border-gray-700"
                }`}
              >
                <div className="text-2xl mb-2">📦</div>
                <div className="text-sm font-medium text-white">No, product only</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Start Workflow <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
