export function Rating({ value }: { value?: number }) {
  if (!value) return null;

  return (
    <span aria-label={`Rated ${value} out of 5`} className="text-accent">
      {"★".repeat(value)}
    </span>
  );
}
