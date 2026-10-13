import Link from "next/link";

export function ErrorState({
  title,
  text,
  onRetry,
  backHref,
  backLabel,
}: {
  title: string;
  text: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div role="alert" className="card flex flex-col gap-3 border-2 border-burgundy p-5">
      <p className="font-serif text-xl font-semibold">{title}</p>
      <p className="text-muted">{text}</p>
      {(onRetry || backHref) && (
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-primary">
              Try again
            </button>
          )}
          {backHref && (
            <Link href={backHref} className="btn-outline">
              {backLabel ?? "Back"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function NotFound({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted">
        It may have been deleted, or the link is wrong. Nothing was changed.
      </p>
      <Link href={backHref} className="btn-primary mt-2">
        {backLabel}
      </Link>
    </div>
  );
}
