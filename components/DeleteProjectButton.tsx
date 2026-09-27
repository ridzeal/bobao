"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red/10 border border-red/30 text-red hover:bg-red/20 disabled:opacity-40 transition-colors"
      >
        {isPending ? "Deleting…" : "Confirm Delete"}
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-1.5 text-xs font-medium rounded-lg text-txt-muted border border-bg-border hover:bg-bg-elevated hover:text-red transition-colors"
    >
      Delete
    </button>
  );
}
