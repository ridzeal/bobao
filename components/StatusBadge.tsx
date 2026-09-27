import { ProjectStatus, SessionStatus } from "@/lib/session-provider";

const PROJECT_BADGE: Record<
  ProjectStatus,
  { label: string; dot: string; ring: string; text: string }
> = {
  active:  { label: "active",  dot: "bg-green",  ring: "ring-green/20",  text: "text-green"  },
  blocked: { label: "blocked", dot: "bg-yellow",  ring: "ring-yellow/20", text: "text-yellow" },
  idle:    { label: "idle",    dot: "bg-txt-dim", ring: "ring-txt-dim/20", text: "text-txt-muted" },
};

const SESSION_BADGE: Record<
  SessionStatus,
  { label: string; dot: string; ring: string; text: string }
> = {
  running:   { label: "running",   dot: "bg-green",  ring: "ring-green/20",  text: "text-green"  },
  blocked:   { label: "blocked",   dot: "bg-yellow",  ring: "ring-yellow/20", text: "text-yellow" },
  done:      { label: "done",      dot: "bg-txt-dim", ring: "ring-txt-dim/20", text: "text-txt-muted" },
};

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  const cfg = PROJECT_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full ring-1 ${cfg.ring} ${cfg.text} bg-bg-elevated`}
    >
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function SessionBadge({ status }: { status: SessionStatus }) {
  const cfg = SESSION_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full ring-1 ${cfg.ring} ${cfg.text} bg-bg-elevated`}
    >
      <span className={`size-1.5 rounded-full ${cfg.dot} ${status === "running" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

export function HarnessBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ring-1 ring-blue/20 text-blue bg-bg-elevated uppercase tracking-wide">
      {label}
    </span>
  );
}
