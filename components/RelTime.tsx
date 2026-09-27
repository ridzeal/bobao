export function RelTime({ date }: { date: Date }) {
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);

  let label: string;
  if (diff < 60) label = `${diff}s ago`;
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) label = `${Math.floor(diff / 3600)}h ago`;
  else label = `${Math.floor(diff / 86400)}d ago`;

  return (
    <time
      className="text-xs font-mono text-txt-dim"
      dateTime={date.toISOString()}
      title={date.toLocaleString()}
    >
      {label}
    </time>
  );
}

export function Timestamp({ date }: { date: Date }) {
  return (
    <time
      className="text-xs font-mono text-txt-dim"
      dateTime={date.toISOString()}
    >
      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </time>
  );
}
