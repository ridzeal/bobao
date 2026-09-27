import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="font-mono text-4xl text-txt-dim">404</p>
      <p className="text-sm text-txt-muted">Page not found</p>
      <Link href="/" className="text-xs text-blue hover:underline">
        ← Back to projects
      </Link>
    </div>
  );
}
