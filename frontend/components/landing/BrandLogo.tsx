import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** Accessible name; omit when decorative next to visible “Ping My Nest” text */
  title?: string;
  priority?: boolean;
};

/** Uses the supplied eaglesnest.png asset only — no generated marks. */
export function BrandLogo({
  className = "h-8 w-8",
  title = "Ping My Nest",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/images/eaglesnest.png"
      alt={title}
      width={536}
      height={537}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
