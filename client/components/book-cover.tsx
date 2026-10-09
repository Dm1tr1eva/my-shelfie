export function BookCover({ url }: { url?: string }) {
  const classes = "h-16 w-11 shrink-0 rounded border object-cover";

  if (!url) {
    return <div aria-hidden="true" className={classes} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image would keep a copy of the cover in Vercel's optimizer, which Google's terms do not allow
    <img src={url} alt="" width={44} height={64} loading="lazy" className={classes} />
  );
}
