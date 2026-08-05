/**
 * Inline SVG rather than an icon-font glyph or a file: it is ~400 bytes, it
 * ships inside the JS bundle, and it never causes a request that could fail
 * or arrive after the header has painted.
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="flex-none"
    >
      <rect width="28" height="28" rx="8" fill="var(--brand)" />
      <path d="M11 9.5v9l7.5-4.5L11 9.5Z" fill="#fff" />
    </svg>
  );
}
