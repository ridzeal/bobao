import { notFound } from "next/navigation";
import Link from "next/link";
import { defaultProvider } from "@/lib/session-provider";
import { ProjectBadge, SessionBadge, HarnessBadge } from "@/components/StatusBadge";
import { RelTime } from "@/components/RelTime";
import { PageShell, Card } from "@/components/Layout";
import { NewSessionForm } from "@/components/NewSessionForm";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await defaultProvider.getProject(params.id);
  if (!project) notFound();

  const sessions = await defaultProvider.listSessions(project.id);
  const blocked = sessions.filter((s) => s.status === "blocked");
  const running = sessions.filter((s) => s.status === "running");

  // derive "what agent is doing" from most recent session
  const activeSess = running[0] ?? blocked[0] ?? sessions[0];

  return (
    <PageShell
      breadcrumbs={
        <>
          <Link href="/" className="hover:text-txt-muted transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-txt-muted">{project.name}</span>
        </>
      }
    >
      {/* title row */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-lg font-semibold text-txt">{project.name}</h1>
            <ProjectBadge status={project.status} />
          </div>
          <p className="text-sm text-txt-muted">{project.description || <span className="italic text-txt-dim">No description</span>}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RelTime date={project.lastUpdated} />
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      {/* summary panel */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs text-txt-dim uppercase tracking-wider mb-1.5">Current state</p>
            <ProjectBadge status={project.status} />
          </div>
          <div>
            <p className="text-xs text-txt-dim uppercase tracking-wider mb-1.5">Agent activity</p>
            <p className="text-sm text-txt-muted font-mono">
              {activeSess ? activeSess.title : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-txt-dim uppercase tracking-wider mb-1.5">Open blockers</p>
            {blocked.length === 0 ? (
              <span className="text-xs text-txt-dim">None</span>
            ) : (
              <ul className="space-y-1">
                {blocked.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/projects/${project.id}/sessions/${s.id}`}
                      className="text-xs font-mono text-yellow hover:underline"
                    >
                      ⚠ {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* sessions list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-txt uppercase tracking-wider">
            Sessions
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-txt-dim font-mono">{sessions.length} total</span>
            <NewSessionForm
              projectId={project.id}
              projectDefaults={{
                workingDir: project.workingDir,
                previewUrl: project.previewUrl,
              }}
            />
          </div>
        </div>

        {/* empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-bg-border rounded-lg bg-bg-surface">
            <div className="text-2xl mb-3">🤖</div>
            <p className="text-sm text-txt-muted mb-1">No sessions yet</p>
            <p className="text-xs text-txt-dim">Click &ldquo;New Session&rdquo; to launch Bob on a task.</p>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="grid gap-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/projects/${project.id}/sessions/${session.id}`}
                className="group flex items-center gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3 hover:border-txt-dim/30 hover:bg-bg-elevated transition-all"
              >
                <SessionBadge status={session.status} />
                <HarnessBadge label={session.harness} />
                <span className="flex-1 text-sm text-txt-muted group-hover:text-txt font-mono truncate transition-colors">
                  {session.title}
                </span>
                <span className="text-xs font-mono text-txt-dim shrink-0">{session.id}</span>
                <RelTime date={session.startedAt} />
                <span className="text-txt-dim text-xs ml-1 group-hover:text-txt-muted transition-colors">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
