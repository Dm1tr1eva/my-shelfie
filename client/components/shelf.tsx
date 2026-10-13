export function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ul className="grid grid-cols-3 items-start gap-x-3 gap-y-5 px-3 pb-3 md:grid-cols-4 md:gap-x-4 xl:grid-cols-6">
        {children}
      </ul>
      <div aria-hidden="true" className="h-3 rounded-sm bg-slate shadow-shelf" />
    </div>
  );
}
