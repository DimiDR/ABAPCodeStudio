"use client";

import { C, F } from "@/lib/theme";
import { Badge, Dot } from "@/components/ui";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 14px",
        height: 40,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: `linear-gradient(135deg, ${C.orange}, ${C.green})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#fff",
          fontWeight: 800,
        }}
      >
        A
      </div>
      <span
        style={{
          fontFamily: F.mono,
          fontSize: 13,
          fontWeight: 600,
          color: C.bright,
        }}
      >
        ABAP Code Studio
      </span>
      <Badge color={C.yellow}>DUAL-SYSTEM</Badge>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={C.orange} />
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
            ECC
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={C.green} />
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
            BTP
          </span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
          |
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
          ⑂ feature/ai-margin-field
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
          |
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.yellow }}>
          DEVK900123
        </span>
      </div>
    </header>
  );
}
