import clsx from "clsx";

interface IconProps {
  /** A Material Symbols Outlined ligature name, e.g. "terminal". */
  name: string;
  /** Pixel size; the design uses 12-20 depending on context. */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * The design's icon set is Material Symbols, referenced by ligature name.
 * Wrapping it keeps the font-family class and sizing in one place.
 */
export function Icon({ name, size = 16, className, title }: IconProps) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={clsx("material-symbols-outlined", className)}
      style={{ fontSize: `${size}px` }}
    >
      {name}
    </span>
  );
}
