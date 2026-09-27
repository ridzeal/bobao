import { notFound } from "next/navigation";
import Link from "next/link";
import { defaultProvider } from "@/lib/session-provider";
import { SessionBadge, HarnessBadge } from "@/components/StatusBadge";
import { RelTime } from "@/components/RelTime";
import { PageShell } from "@/components/Layout";
import { LiveLogPanel } from "@/components/LiveLogPanel";
import { InputForm } from "@/components/InputForm";
import { PreviewPanel, PreviewPlaceholder } from "@/components/PreviewPanel";
import { sendInputAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: { id: string; sessionId: string };
}) {
  const [project, session] = await Promise.all([
    defaultProvider.getProject(params.id),
    defaultProvider.getSession(params.sessionId),
  ]);

  if (!project || !session) notFound();

  return (
    <PageShell
      breadcrumbs={
        <>
          <Link href="/" className="hover:text-txt-muted transition-colors">
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${project.id}`}
            className="hover:text-txt-muted transition-colors"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-txt-muted truncate max-w-xs">{session.title}</span>
        </>
      }
    >
      {/* header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-base font-semibold text-txt">{session.title}</h1>
            <SessionBadge status={session.status} />
            <HarnessBadge label={session.harness} />
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-txt-dim">
            <span>{session.id}</span>
            <span>·</span>
            <span>started <RelTime date={session.startedAt} /></span>
          </div>
        </div>
      </div>

      {/* blocked banner */}
      {session.status === "blocked" && (
        <div className="mb-4 rounded-lg border border-yellow/30 bg-yellow-dim px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow text-sm font-semibold">⚠ Needs your input</span>
          </div>
          <p className="text-xs text-txt-muted mb-3 leading-relaxed">
            The agent is blocked and waiting for your decision. Review the log below, then
            respond in the box.
          </p>
          <InputForm sessionId={session.id} onSend={sendInputAction} />
        </div>
      )}

      {/* two-column: log + preview */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: session.previewUrl ? "1fr 1fr" : "1fr" }}
      >
        {/* live log panel — streams via SSE */}
        <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden flex flex-col" style={{ height: "520px" }}>
          <LiveLogPanel sessionId={session.id} />
        </div>

        {/* preview panel — only rendered when URL present */}
        {session.previewUrl && (
          <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden flex flex-col" style={{ height: "520px" }}>
            <div className="px-3 py-2 border-b border-bg-border bg-bg-elevated shrink-0 flex items-center gap-2">
              <span className="text-xs font-mono text-txt-dim uppercase tracking-wide">
                Local app preview
              </span>
            </div>
            <PreviewPanel url={session.previewUrl} />
          </div>
        )}
      </div>

      {/* placeholder shown below when no preview URL */}
      {!session.previewUrl && (
        <div className="mt-3 bg-bg-surface border border-bg-border rounded-lg flex items-center justify-center" style={{ height: "80px" }}>
          <PreviewPlaceholder />
        </div>
      )}
    </PageShell>
  );
}
