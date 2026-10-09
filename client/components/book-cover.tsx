const SIZES = {
  sm: "h-16 w-11",
  lg: "h-28 w-[4.5rem]",
  fill: "aspect-[2/3] w-full",
};

function withoutPageCurl(url: string) {
  return url.replace("&edge=curl", "");
}

export function BookCover({ url, size = "sm" }: { url?: string; size?: keyof typeof SIZES }) {
  const classes = `${SIZES[size]} shrink-0 rounded-md border object-cover`;

  if (!url) {
    return <div aria-hidden="true" className={`${classes} bg-surface-alt`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image would keep a copy of the cover in Vercel's optimizer, which Google's terms do not allow
    <img
      src={withoutPageCurl(url)}
      alt=""
      width={128}
      height={192}
      loading="lazy"
      className={classes}
    />
  );
}
