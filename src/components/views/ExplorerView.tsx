"use client";

import { useState } from "react";
import { C, F } from "@/lib/theme";
import { Badge, Dot } from "@/components/ui";

const objects = [
  { name: "Z_SALES", type: "DDLS", pkg: "Z_SD", status: "active", lines: 42, system: "BTP", desc: "Sales CDS View Entity" },
  { name: "ZCL_SALES_CALC", type: "CLAS", pkg: "Z_SD", status: "modified", lines: 287, system: "BTP", desc: "Sales Calculation Logic" },
  { name: "ZSALES_DATA", type: "TABL", pkg: "Z_SD", status: "active", lines: 18, system: "BTP", desc: "Sales Base Table" },
  { name: "ZSD_SALES_ORDER", type: "BDEF", pkg: "Z_SD", status: "active", lines: 56, system: "BTP", desc: "Behavior Definition" },
  { name: "Z_SALES_REPORT", type: "PROG", pkg: "Z_SD_LEGACY", status: "active", lines: 412, system: "ECC", desc: "Classic Sales Report" },
  { name: "Z_BAPI_SALES_GET", type: "FUGR", pkg: "Z_SD_LEGACY", status: "active", lines: 89, system: "ECC", desc: "Sales BAPI Function Group" },
  { name: "ZIF_SALES_API", type: "INTF", pkg: "Z_SD", status: "inactive", lines: 24, system: "BTP", desc: "Sales API Interface" },
  { name: "ZI_SALES_TP", type: "DDLS", pkg: "Z_SD", status: "active", lines: 38, system: "BTP", desc: "Transaction Projection" },
];

const typeColors: Record<string, string> = {
  DDLS: C.blue, CLAS: C.purple, TABL: C.yellow, BDEF: C.teal,
  PROG: C.orange, FUGR: C.orange, INTF: C.cyan, DTEL: C.dim,
};
const statusColors: Record<string, string> = {
  active: C.green, modified: C.yellow, inactive: C.red,
};

const codeLines = [
  { n: 1, t: "@AccessControl.authorizationCheck: #CHECK", h: false },
  { n: 2, t: "@EndUserText.label: 'Sales Data View'", h: false },
  { n: 3, t: "define view entity Z_SALES", h: false },
  { n: 4, t: "  as select from zsales_data", h: false },
  { n: 5, t: "{", h: false },
  { n: 6, t: "  key sales_order   as SalesOrder,", h: false },
  { n: 7, t: "      customer_id   as Customer,", h: false },
  { n: 8, t: "      revenue       as Revenue,", h: false },
  { n: 9, t: "      cost          as Cost,", h: false },
  { n: 10, t: "      @EndUserText.label: 'Margin'", h: true },
  { n: 11, t: "      revenue - cost as Margin,", h: true },
  { n: 12, t: "      currency      as Currency,", h: false },
  { n: 13, t: "      created_at    as CreatedAt", h: false },
  { n: 14, t: "}", h: false },
];

export default function ExplorerView() {
  const [selected, setSelected] = useState(0);
  const sel = objects[selected];

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Object List */}
      <div style={{ width: 340, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <input
            placeholder="Objekt suchen..."
            style={{
              width: "100%", fontFamily: F.mono, fontSize: 11,
              background: C.bg2, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: "6px 10px", color: C.text, outline: "none",
            }}
          />
        </div>
        {objects.map((o, i) => (
          <div
            key={i}
            onClick={() => setSelected(i)}
            style={{
              padding: "10px 14px", cursor: "pointer",
              borderBottom: `1px solid ${C.border}`,
              background: selected === i ? C.surfaceAlt : "transparent",
              borderLeft: selected === i
                ? `2px solid ${typeColors[o.type] || C.dim}`
                : "2px solid transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge color={typeColors[o.type]} filled>{o.type}</Badge>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.bright, fontWeight: 600 }}>
                {o.name}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <Badge color={o.system === "ECC" ? C.orange : C.green}>{o.system}</Badge>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Dot color={statusColors[o.status]} size={5} />
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{o.desc}</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginLeft: "auto" }}>
                {o.lines} lines
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Source Code */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div
          style={{
            padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Badge color={typeColors[sel.type]} filled>{sel.type}</Badge>
          <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: C.bright }}>
            {sel.name}
          </span>
          <Badge color={sel.system === "ECC" ? C.orange : C.green}>{sel.system}</Badge>
          <Dot color={statusColors[sel.status]} size={5} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{sel.status}</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim, marginLeft: "auto" }}>
            {sel.pkg}
          </span>
        </div>
        <div style={{ padding: "8px 0" }}>
          {codeLines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex", fontFamily: F.mono, fontSize: 12, lineHeight: 1.9,
                background: l.h ? C.green + "0A" : "transparent",
                borderLeft: l.h ? `3px solid ${C.green}50` : "3px solid transparent",
              }}
            >
              <span
                style={{
                  width: 44, textAlign: "right", paddingRight: 12,
                  color: C.dim, fontSize: 11, userSelect: "none",
                }}
              >
                {l.n}
              </span>
              <span style={{ color: l.h ? C.greenBright : C.text, whiteSpace: "pre" }}>
                {l.t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
