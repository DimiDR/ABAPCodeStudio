"use client";

import { F, C } from "@/lib/theme";

interface LblProps {
  children: React.ReactNode;
  color?: string;
}

export default function Lbl({ children, color = C.dim }: LblProps) {
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 9,
        letterSpacing: 2.5,
        color,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
