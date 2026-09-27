"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProjectDefaults {
  workingDir?: string;
  previewUrl?: string;
}

export function NewSessionForm({
  projectId,
  projectDefaults,
}: {
  projectId: string;
  projectDefaults?: ProjectDefaults;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [cwd, setCwd] = useState("");
  const [argsRaw, setArgsRaw] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-generate title when opening
  useEffect(() => {
    if (!open) return;
    fetch(`/api/projects/${projectId}/sessions/next-number`)
      .then((r) => r.json())
      .then((data) => {
        const n = data.number ?? 1;
        setTitle(`session-${n}`);
      })
      .catch(() => {
        setTitle("session-1");
      });
  }, [open, projectId]);

  // Apply project defaults when opening
  useEffect(() => {
    if (!open) return;
    setCwd(projectDefaults?.workingDir ?? "");
    setPreviewUrl(projectDefaults?.previewUrl ?? "");
  }, [open, projectDefaults]);

  function reset() {
    setTitle("");
    setTopic("");
    setCwd("");
    setArgsRaw("");
    setPreviewUrl("");
    setError(null);
  }

  function handleCancel() {
    reset();
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedTopic = topic.trim();
    const trimmedCwd = cwd.trim();
    if (!trimmedTitle || !trimmedTopic || !trimmedCwd) return;

    // Parse args: split on whitespace respecting quoted strings
    const args = argsRaw.trim()
      ? argsRaw.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
      : [];

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            topic: trimmedTopic,
            args,
            cwd: trimmedCwd,
            previewUrl: previewUrl.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to create session");
          return;
        }

        const session = await res.json();
        reset();
        setOpen(false);
        router.refresh();
        router.push(`/projects/${projectId}/sessions/${session.id}`);
      } catch {
        setError("Network error — could not create session");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/30 text-green text-xs font-medium rounded-lg hover:bg-green/20 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        New Session
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-base border border-bg-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6"
      >
        <h2 className="text-sm font-semibold text-txt uppercase tracking-wider mb-5">
          New Session
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Title <span className="text-red">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the task for Bob…"
              required
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Topic <span className="text-red">*</span>{" "}
              <span className="text-txt-dim">(first prompt sent to Bob)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Fix the login bug on the auth page"
              required
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Working Directory <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/home/user/my-project"
              required
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Bob Args{" "}
              <span className="text-txt-dim">(passed to <code className="font-mono">bob</code>)</span>
            </label>
            <input
              type="text"
              value={argsRaw}
              onChange={(e) => setArgsRaw(e.target.value)}
              placeholder='--print "Fix the bug"'
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
            <p className="mt-1 text-xs text-txt-dim">
              Shell-style quoting supported. Leave empty to launch interactive mode.
            </p>
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Preview URL <span className="text-txt-dim">(optional)</span>
            </label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="http://localhost:3001"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red font-mono">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 py-2 text-xs text-txt-muted border border-bg-border rounded-lg hover:bg-bg-elevated transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim() || !topic.trim() || !cwd.trim()}
            className="px-4 py-2 bg-green/10 border border-green/30 text-green text-xs font-medium rounded-lg hover:bg-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Launching…" : "Launch Session"}
          </button>
        </div>
      </form>
    </div>
  );
}
