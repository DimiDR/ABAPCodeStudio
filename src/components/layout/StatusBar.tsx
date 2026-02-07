"use client";

import { C, F } from "@/lib/theme";

export default function StatusBar() {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        height: 22,
        background: C.greenDim,
        flexShrink: 0,
        fontFamily: F.mono,
        fontSize: 9,
        color: "rgba(255,255,255,0.75)",
      }}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <span>◆ ECC connected</span>
        <span>◇ BTP connected</span>
        <span>⑂ feature/ai-margin-field</span>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <span>MCP: 7 tools</span>
        <span>JWT: 42min</span>
        <span>Agent: online</span>
      </div>
    </footer>
  );
}
