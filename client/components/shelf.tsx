export function Shelf({
  children,
  columns = "grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
}: {
  children: React.ReactNode;
  columns?: string;
}) {
  return (
    <div>
      <ul className={`grid items-start gap-x-3 gap-y-5 px-3 pb-3 md:gap-x-4 ${columns}`}>
        {children}
      </ul>
      <div aria-hidden="true" className="h-3 rounded-sm bg-slate shadow-shelf" />
    </div>
  );
}
