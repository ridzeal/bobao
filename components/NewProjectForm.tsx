"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState("http://localhost:4000");
  const [workingDir, setWorkingDir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch username and next project number on mount to build defaults
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/projects/next-number").then((r) => r.json()),
    ]).then(([user, proj]) => {
      const n = proj.number ?? 1;
      const uname = user.username ?? "user";
      const suggestedName = `project-${n}`;
      setName(suggestedName);
      setWorkingDir(`/home/${uname}/${suggestedName}`);
    });
  }, [open]);

  // Keep working dir in sync with name changes
  useEffect(() => {
    if (!open || !name.trim()) return;
    fetch("/api/user")
      .then((r) => r.json())
      .then((user) => {
        const uname = user.username ?? "user";
        setWorkingDir(`/home/${uname}/${name.trim()}`);
      });
  }, [name, open]);

  function reset() {
    setName("");
    setDescription("");
    setPreviewUrl("http://localhost:4000");
    setWorkingDir("");
    setError(null);
  }

  function handleCancel() {
    reset();
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            description: description.trim() || undefined,
            previewUrl: previewUrl.trim() || undefined,
            workingDir: workingDir.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to create project");
          return;
        }

        const project = await res.json();
        reset();
        setOpen(false);
        router.refresh();
        router.push(`/projects/${project.id}`);
      } catch {
        setError("Network error — could not create project");
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
        New Project
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
          New Project
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Name <span className="text-red">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Working Directory <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="/home/user/my-project"
              required
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm font-mono text-txt placeholder:text-txt-dim focus:outline-none focus:ring-1 focus:ring-green/50 focus:border-green/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-txt-dim mb-1.5">
              Preview URL <span className="text-txt-dim">(optional)</span>
            </label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="http://localhost:4000"
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
            disabled={isPending || !name.trim()}
            className="px-4 py-2 bg-green/10 border border-green/30 text-green text-xs font-medium rounded-lg hover:bg-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating…" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
