"use client";

import { C } from "@/lib/theme";

interface BoxProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  borderColor?: string;
}

export default function Box({ children, style = {}, borderColor }: BoxProps) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${borderColor || C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
