import Link from "next/link";
import { BookIcon } from "@/components/icons";

export function EmptyState({
  title,
  text,
  actionLabel,
  actionHref,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-slate">
        <BookIcon size={40} />
      </span>
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted">{text}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
