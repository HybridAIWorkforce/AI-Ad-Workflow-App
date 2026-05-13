"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  Archive,
  Trash2,
  Play,
  Eye,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  intakeData: {
    targetPlatform?: string;
    adStyle?: string;
  };
  createdAt: string;
  updatedAt: string;
  deliverables?: Array<{ stepNumber: number; approved: boolean }>;
}

const stepNames = [
  "Strategy",
  "Style",
  "Script",
  "Images",
  "Video JSON"
];

export default function DashboardContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res?.json();
      setProjects(data ?? []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects?.();
  }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res?.ok) {
        toast.success("Project deleted");
        fetchProjects?.();
      } else {
        toast.error("Failed to delete project");
      }
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="default">In Progress</Badge>;
    }
  };

  const getProgressWidth = (currentStep: number, status: string) => {
    if (status === "completed") return "100%";
    return `${((currentStep - 1) / 5) * 100}%`;
  };

  const inProgress = projects?.filter((p) => p?.status === "in_progress") ?? [];
  const completed = projects?.filter((p) => p?.status === "completed") ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your ad creation projects</p>
        </div>
        <Link href="/dashboard/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{projects?.length ?? 0}</div>
                <div className="text-sm text-gray-400">Total Projects</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{inProgress?.length ?? 0}</div>
                <div className="text-sm text-gray-400">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{completed?.length ?? 0}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (projects?.length ?? 0) === 0 ? (
        <Card className="bg-gray-900/30 border-gray-800">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">Create your first ad project to get started</p>
            <Link href="/dashboard/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Your Projects</h2>
          <div className="grid gap-4">
            {projects?.map((project, index) => (
              <motion.div
                key={project?.id ?? index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {project?.name ?? "Untitled"}
                          </h3>
                          {getStatusBadge(project?.status ?? "in_progress")}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(project?.createdAt ?? Date.now())?.toLocaleDateString?.() ?? "Unknown"}
                          </span>
                          {project?.intakeData?.targetPlatform && (
                            <span>{project?.intakeData?.targetPlatform ?? ""}</span>
                          )}
                          {project?.intakeData?.adStyle && (
                            <span>{project?.intakeData?.adStyle ?? ""}</span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                            <span>
                              Step {project?.currentStep ?? 1} of 5:{" "}
                              {stepNames?.[(project?.currentStep ?? 1) - 1] ?? "Unknown"}
                            </span>
                            <span>
                              {project?.status === "completed"
                                ? "100%"
                                : `${Math.round(((project?.currentStep ?? 1) - 1) / 5 * 100)}%`}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all"
                              style={{
                                width: getProgressWidth(
                                  project?.currentStep ?? 1,
                                  project?.status ?? "in_progress"
                                )
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {project?.status !== "completed" && (
                          <Link href={`/dashboard/project/${project?.id ?? ""}`}>
                            <Button className="gap-2">
                              <Play className="w-4 h-4" />
                              Continue
                            </Button>
                          </Link>
                        )}
                        <Link href={`/dashboard/project/${project?.id ?? ""}`}>
                          <Button variant="outline" size="icon" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete?.(project?.id ?? "")}
                          disabled={deleting === project?.id}
                          title="Delete"
                        >
                          {deleting === project?.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
