import type { ShelfStats } from "@/lib/book-stats";

export function StatsCards({ stats }: { stats: ShelfStats }) {
  const items = [
    { label: "On the shelf", value: String(stats.total) },
    { label: "Read", value: String(stats.read) },
    { label: "Reading now", value: String(stats.reading) },
    {
      label: "Average rating",
      value: stats.averageRating === null ? "—" : stats.averageRating.toFixed(1),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="mt-1 font-display text-3xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
