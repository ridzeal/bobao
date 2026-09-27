"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

export function EditProjectButton({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(project.description ?? "");
  const [previewUrl, setPreviewUrl] = useState(project.previewUrl ?? "");
  const [workingDir, setWorkingDir] = useState(project.workingDir ?? "");
  const [devCommand, setDevCommand] = useState(project.devCommand ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setDescription(project.description ?? "");
    setPreviewUrl(project.previewUrl ?? "");
    setWorkingDir(project.workingDir ?? "");
    setDevCommand(project.devCommand ?? "");
    setError(null);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description.trim(),
            previewUrl: previewUrl.trim() || undefined,
            workingDir: workingDir.trim() || undefined,
            devCommand: devCommand.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to update");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs text-txt-muted border border-bg-border rounded-lg hover:bg-bg-elevated hover:text-txt transition-colors"
      >
        Edit Project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-base border border-bg-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
      >
        <h2 className="text-sm font-semibold text-txt uppercase tracking-wider mb-5">
          Edit Project
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-txt-dim mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">Working Directory</label>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">Preview URL</label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="http://localhost:4000"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">Dev Command</label>
            <input
              type="text"
              value={devCommand}
              onChange={(e) => setDevCommand(e.target.value)}
              placeholder="just dev"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
            <p className="mt-1 text-xs text-txt-dim">
              e.g. <code>just dev</code>, <code>npm run dev</code>
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red font-mono">{error}</p>}

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
            disabled={isPending}
            className="px-4 py-2 bg-green/10 border border-green/30 text-green text-xs font-medium rounded-lg hover:bg-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
