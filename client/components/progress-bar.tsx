export function ProgressBar({
  percent,
  valueText,
  label,
  labelledBy,
  muted = false,
}: {
  percent: number;
  valueText: string;
  label?: string;
  labelledBy?: string;
  muted?: boolean;
}) {
  return (
    <span className="flex w-full items-center gap-3">
      <span
        role="progressbar"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
        className="relative h-1.5 min-w-0 max-w-[150px] flex-1 overflow-hidden rounded-full bg-page md:max-w-[200px] lg:max-w-[240px]"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${muted ? "bg-muted" : "bg-burgundy"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className={`text-[13px] font-semibold ${muted ? "text-muted" : "text-burgundy"}`}>
        {percent}%
      </span>
    </span>
  );
}
