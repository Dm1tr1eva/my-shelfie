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

export function LibraryIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 1.5Z" />
      <path d="M6 21h14" />
    </Svg>
  );
}

export function HeartIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z" />
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

export function BagIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </Svg>
  );
}

export function UserIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
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
