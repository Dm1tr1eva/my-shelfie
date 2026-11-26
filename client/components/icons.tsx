import type { ReactNode } from "react";

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export function BookmarkIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.6L5.5 21V4.5a1 1 0 0 1 1-1z" />
    </Svg>
  );
}

export function ShelfIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="5" width="4" height="14" rx="1" />
      <rect x="9.5" y="3" width="4" height="16" rx="1" />
      <rect x="15" y="7" width="4" height="12" rx="1" />
      <path d="M2.5 21.5h19" />
    </Svg>
  );
}

export function ArrowLeftIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

export function HeadphonesIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </Svg>
  );
}

export function PlusIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function SearchIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function ChevronRightIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function ChevronDownIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function CheckIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function XIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function TrashIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </Svg>
  );
}

export function ExternalLinkIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}

export function BookIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 1.5Z" />
      <path d="M8 7h7" />
    </Svg>
  );
}

export function TabletIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M10.5 18.5h3" />
    </Svg>
  );
}

export function EditIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 3 3" />
    </Svg>
  );
}

export function StarIcon({ size, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size ?? 20}
      height={size ?? 20}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
    </svg>
  );
}

export function FilterIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />
    </Svg>
  );
}

export function GridIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </Svg>
  );
}

export function ListIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  );
}

export function EyeIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function EyeOffIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 6.5 10 6.5c1.6 0 3-.4 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  );
}

export function ArrowRightIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Svg>
  );
}
