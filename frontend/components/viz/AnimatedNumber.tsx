"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatNumber } from "@/lib/format";

/** Counts from the previous value to the new one whenever `value` changes. */
export function AnimatedNumber({
  value,
  compact = false,
  className,
}: {
  value: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || value == null) return;
    if (reduce) {
      el.textContent = formatNumber(value, compact);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: from.current === 0 ? 1.1 : 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatNumber(v, compact);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, compact, reduce]);

  return (
    <span ref={ref} className={className}>
      {value == null ? "—" : formatNumber(0, compact)}
    </span>
  );
}
