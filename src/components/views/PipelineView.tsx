"use client";

import { C, F } from "@/lib/theme";
import { Badge, Box, Lbl } from "@/components/ui";

const steps = [
  { name: "Syntax Check", desc: "ADT validation", status: "pass", detail: "0 Errors", icon: "✓", color: C.green },
  { name: "ATC Checks", desc: "Code Inspector", status: "warn", detail: "0 Errors, 2 Warnings", icon: "⚠", color: C.yellow },
  { name: "ABAP Unit Tests", desc: "12 Tests", status: "pass", detail: "12/12 passed (0.8s)", icon: "✓", color: C.green },
  { name: "CDS Test Doubles", desc: "SQL verification", status: "pass", detail: "4/4 passed", icon: "✓", color: C.green },
  { name: "Code Review Gate", desc: "Human approval", status: "pending", detail: "Waiting for reviewer", icon: "⏳", color: C.yellow },
  { name: "Transport Release", desc: "DEVK900123", status: "blocked", detail: "Blocked until review", icon: "🔒", color: C.red },
  { name: "abapGit Push", desc: "feature/ai-margin-field", status: "blocked", detail: "After transport", icon: "⑂", color: C.red },
];

function barWidth(status: string) {
  if (status === "pass" || status === "warn") return "100%";
  if (status === "pending") return "50%";
  return "0%";
}

export default function PipelineView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px 20px" }}>
      <Lbl>CI/CD Pipeline — Z_SALES / MARGIN Field</Lbl>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {steps.map((s, i) => (
          <Box key={i}>
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: s.color + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: F.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.bright,
                    }}
                  >
                    {s.name}
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>
                    {s.desc}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: s.color,
                    marginTop: 2,
                  }}
                >
                  {s.detail}
                </div>
              </div>
              <Badge color={s.color}>{s.status.toUpperCase()}</Badge>
            </div>
            {/* Progress bar */}
            <div style={{ height: 2, background: C.bg }}>
              <div
                style={{
                  height: 2,
                  width: barWidth(s.status),
                  background: s.color,
                  transition: "width 0.5s",
                }}
              />
            </div>
          </Box>
        ))}
      </div>
      {/* Summary */}
      <Box style={{ marginTop: 14 }}>
        <div style={{ padding: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Duration", value: "12.3s", color: C.text },
            { label: "Tests", value: "16/16", color: C.green },
            { label: "ATC Issues", value: "0E 2W", color: C.yellow },
            { label: "AI Confidence", value: "0.94", color: C.teal },
            { label: "Review", value: "PENDING", color: C.yellow },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 9,
                  color: C.dim,
                  letterSpacing: 1,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 16,
                  fontWeight: 700,
                  color: m.color,
                  marginTop: 2,
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
