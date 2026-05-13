import ProjectWorkflow from "@/components/project-workflow";

export default async function ProjectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectWorkflow projectId={id ?? ""} />;
}
