import Link from "next/link";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: { href: string; label: string };
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? (
        <Link href={action.href} className="button button--cobalt">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
