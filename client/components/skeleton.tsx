function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-control bg-beige ${className}`} />;
}

function ShelfPlaceholder({ faded = false }: { faded?: boolean }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-3 ${faded ? "opacity-50" : ""}`}>
      <Block className="h-7 w-64 max-w-full" />
      <Block className="h-4 w-40" />
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Block className="aspect-[2/3] w-full rounded-cover" />
            <Block className="h-4 w-4/5" />
            <Block className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="h-3 rounded-sm bg-beige" />
    </div>
  );
}

export function ShelfSkeleton({ label = "Loading your shelves…" }: { label?: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <p role="status" className="text-muted">
        {label}
      </p>
      <ShelfPlaceholder />
      <ShelfPlaceholder faded />
    </div>
  );
}

export function RowsSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <p role="status" className="text-muted">
        {label}
      </p>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="card flex items-center gap-4 p-4"
          style={{ opacity: 1 - index * 0.25 }}
        >
          <Block className="aspect-[2/3] w-16 shrink-0 rounded-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <Block className="h-5 w-2/3" />
            <Block className="h-4 w-1/3" />
            <Block className="h-6 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
