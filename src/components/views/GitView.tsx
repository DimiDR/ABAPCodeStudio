"use client";

import { C, F } from "@/lib/theme";
import { Badge, Lbl } from "@/components/ui";

const commits = [
  { sha: "a3f7b2e", msg: "feat(Z_SALES): Add MARGIN calculated field", author: "AI + dimitri", time: "14:23", ai: true, status: "pending", branch: "feature/ai-margin-field" },
  { sha: "e12c4a9", msg: "refactor(ZCL_SALES_CALC): Extract method CALC_MARGIN", author: "AI + dimitri", time: "14:20", ai: true, status: "pending", branch: "feature/ai-margin-field" },
  { sha: "b8d1e3f", msg: "fix(Z_BAPI_SALES_GET): Correct date range filter", author: "dimitri", time: "11:45", ai: false, status: "approved", branch: "main" },
  { sha: "c45a92d", msg: "feat(ZI_SALES_TP): Add projection for UI", author: "AI + dimitri", time: "Yesterday", ai: true, status: "merged", branch: "feature/ai-sales-ui" },
  { sha: "f1e8b7a", msg: "chore: Update CDS annotations for Z_SALES", author: "dimitri", time: "Yesterday", ai: false, status: "merged", branch: "main" },
  { sha: "d29c5e1", msg: "feat(ZSD_SALES_ORDER): Add validation logic", author: "AI + dimitri", time: "Feb 4", ai: true, status: "merged", branch: "feature/ai-validation" },
];

const statusStyle: Record<string, { color: string; bg: string }> = {
  pending: { color: C.yellow, bg: C.yellow + "14" },
  approved: { color: C.green, bg: C.green + "14" },
  merged: { color: C.blue, bg: C.blue + "14" },
};

export default function GitView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px 20px" }}>
      <Lbl color={C.blue}>Git History — feature/ai-margin-field</Lbl>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {commits.map((c, i) => {
          const st = statusStyle[c.status];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 12px",
                background: i < 2 ? C.surfaceAlt : "transparent",
                borderRadius: 6,
                border: i < 2 ? `1px solid ${C.border}` : "1px solid transparent",
              }}
            >
              {/* Timeline */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0,
                  paddingTop: 2,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c.ai ? C.teal : C.blue,
                    border: `2px solid ${C.bg}`,
                  }}
                />
                {i < commits.length - 1 && (
                  <div style={{ width: 1, height: 32, background: C.border }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.yellow }}>
                    {c.sha}
                  </span>
                  <span
                    style={{
                      fontFamily: F.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.bright,
                    }}
                  >
                    {c.msg}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>
                    {c.author} · {c.time}
                  </span>
                  {c.ai && <Badge color={C.teal}>AI-GENERATED</Badge>}
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 3,
                      color: st.color,
                      background: st.bg,
                    }}
                  >
                    {c.status}
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>
                    ⑂ {c.branch}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
