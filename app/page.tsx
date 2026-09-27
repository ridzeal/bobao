import Link from "next/link";
import { defaultProvider } from "@/lib/session-provider";
import { ProjectBadge } from "@/components/StatusBadge";
import { RelTime } from "@/components/RelTime";
import { PageShell } from "@/components/Layout";
import { NewProjectForm } from "@/components/NewProjectForm";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await defaultProvider.listProjects();

  return (
    <PageShell>
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-txt">Projects</h1>
          <p className="text-sm text-txt-muted mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} — IBM Bob CLI harness
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono text-txt-dim">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-green" />
              {projects.filter((p) => p.status === "active").length} active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-yellow" />
              {projects.filter((p) => p.status === "blocked").length} blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-txt-dim" />
              {projects.filter((p) => p.status === "idle").length} idle
            </span>
          </div>
          <NewProjectForm />
        </div>
      </div>

      {/* empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-2xl mb-3">🗂</div>
          <p className="text-sm text-txt-muted mb-1">No projects yet</p>
          <p className="text-xs text-txt-dim">Click &ldquo;New Project&rdquo; to get started.</p>
        </div>
      )}

      {/* project grid */}
      {projects.length > 0 && (
        <div className="grid gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block bg-bg-surface border border-bg-border rounded-lg p-4 hover:border-txt-dim/30 hover:bg-bg-elevated transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-medium text-sm text-txt group-hover:text-white transition-colors truncate">
                      {project.name}
                    </span>
                    <ProjectBadge status={project.status} />
                  </div>
                  <p className="text-xs text-txt-muted leading-relaxed line-clamp-1">
                    {project.description || <span className="italic">No description</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs font-mono text-txt-dim">
                    {project.sessionCount} session{project.sessionCount !== 1 ? "s" : ""}
                  </span>
                  <RelTime date={project.lastUpdated} />
                </div>
              </div>
              {project.status === "blocked" && (
                <div className="mt-3 text-xs font-mono text-yellow bg-yellow-dim border border-yellow/10 rounded px-2.5 py-1.5">
                  ⚠ Waiting for input — click to respond
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
