"use client";

interface DotProps {
  color: string;
  size?: number;
}

export default function Dot({ color, size = 6 }: DotProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
