"use client";

import { F, C } from "@/lib/theme";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  filled?: boolean;
}

export default function Badge({ children, color = C.dim, filled }: BadgeProps) {
  return (
    <span
      style={{
        fontFamily: F.mono,
        fontSize: 9,
        letterSpacing: 0.5,
        padding: "2px 6px",
        borderRadius: 3,
        color: filled ? "#fff" : color,
        background: filled ? color : color + "14",
        border: `1px solid ${color}22`,
      }}
    >
      {children}
    </span>
  );
}
