import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

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
      src="/images/eaglesnest-mark.png"
      alt={title}
      width={434}
      height={434}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}

/** Logo + name, linking home. */
export function Wordmark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <BrandLogo className="h-8 w-8" title="" priority />
      <span className={cn("text-[15px] font-bold", inverted ? "text-white" : "text-ink")}>
        Ping My Nest
      </span>
    </Link>
  );
}
