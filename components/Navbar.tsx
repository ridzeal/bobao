import Link from "next/link";

export function Navbar() {
  return (
    <header className="h-12 border-b border-bg-border bg-bg-surface flex items-center px-5 gap-4 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-green font-mono text-sm font-medium">⬡</span>
        <span className="font-semibold text-sm tracking-tight text-txt">
          BOB<span className="text-txt-muted">AO</span>
        </span>
      </Link>
      <div className="h-4 w-px bg-bg-border" />
      <nav className="flex items-center gap-1">
        <Link
          href="/"
          className="text-xs text-txt-muted hover:text-txt px-2 py-1 rounded hover:bg-bg-elevated transition-colors"
        >
          Projects
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs font-mono text-txt-dim">IBM Bob Shell</span>
        <span className="size-2 rounded-full bg-green animate-pulse" />
      </div>
    </header>
  );
}
