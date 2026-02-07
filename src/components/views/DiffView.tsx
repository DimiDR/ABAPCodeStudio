"use client";

import { C, F } from "@/lib/theme";
import { Badge, Lbl } from "@/components/ui";

const diffs = [
  { type: "ctx", n1: 4, n2: 4, code: "  as select from zsales_data" },
  { type: "ctx", n1: 5, n2: 5, code: "{" },
  { type: "ctx", n1: 6, n2: 6, code: "  key sales_order   as SalesOrder," },
  { type: "ctx", n1: 7, n2: 7, code: "      customer_id   as Customer," },
  { type: "ctx", n1: 8, n2: 8, code: "      revenue       as Revenue," },
  { type: "ctx", n1: 9, n2: 9, code: "      cost          as Cost," },
  { type: "add", n1: null, n2: 10, code: "      @EndUserText.label: 'Margin'" },
  { type: "add", n1: null, n2: 11, code: "      revenue - cost as Margin," },
  { type: "ctx", n1: 10, n2: 12, code: "      currency      as Currency," },
  { type: "ctx", n1: 11, n2: 13, code: "      created_at    as CreatedAt" },
  { type: "ctx", n1: 12, n2: 14, code: "}" },
];

export default function DiffView() {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      {/* Commit info */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <Lbl color={C.teal}>Commit Metadata</Lbl>
          <div
            style={{
              fontFamily: F.sans,
              fontSize: 14,
              fontWeight: 600,
              color: C.bright,
            }}
          >
            feat(Z_SALES): Add MARGIN calculated field
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Badge color={C.teal}>AI-GENERATED</Badge>
          <Badge color={C.purple}>claude-opus-4-6</Badge>
          <Badge color={C.green}>Confidence: 0.94</Badge>
          <Badge color={C.yellow}>DEVK900123</Badge>
          <Badge color={C.red}>REVIEW PENDING</Badge>
        </div>
      </div>

      {/* Diff */}
      <div style={{ padding: "8px 0" }}>
        {diffs.map((d, i) => {
          const bg =
            d.type === "add"
              ? C.green + "0C"
              : d.type === "del"
                ? C.red + "0C"
                : "transparent";
          const fg =
            d.type === "add"
              ? C.greenBright
              : d.type === "del"
                ? C.red
                : C.text;
          const pre = d.type === "add" ? "+" : d.type === "del" ? "-" : " ";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                fontFamily: F.mono,
                fontSize: 12,
                lineHeight: 2,
                background: bg,
              }}
            >
              <span
                style={{
                  width: 40,
                  textAlign: "right",
                  paddingRight: 8,
                  color: C.dim,
                  fontSize: 10,
                }}
              >
                {d.n1 || ""}
              </span>
              <span
                style={{
                  width: 40,
                  textAlign: "right",
                  paddingRight: 8,
                  color: C.dim,
                  fontSize: 10,
                }}
              >
                {d.n2 || ""}
              </span>
              <span
                style={{
                  color: d.type !== "ctx" ? fg : C.dim,
                  width: 14,
                }}
              >
                {pre}
              </span>
              <span style={{ color: fg, whiteSpace: "pre" }}>{d.code}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            padding: "8px 24px",
            background: C.green,
            border: "none",
            borderRadius: 5,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ✓ Approve & Deploy
        </button>
        <button
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            padding: "8px 24px",
            background: "transparent",
            border: `1px solid ${C.red}40`,
            borderRadius: 5,
            color: C.red,
            cursor: "pointer",
          }}
        >
          ✗ Reject
        </button>
        <button
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            padding: "8px 16px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 5,
            color: C.text,
            cursor: "pointer",
          }}
        >
          💬 Comment
        </button>
      </div>
    </div>
  );
}
