import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// THEME & SHARED
// ═══════════════════════════════════════════════════════════════
const C = {
  bg: "#080A0E", bg2: "#0C0F14", surface: "#11141A", surfaceAlt: "#161A22",
  border: "#1C2028", borderLight: "#252A34",
  text: "#B8BCC6", dim: "#505868", bright: "#DEE2EA", white: "#F4F5F8",
  green: "#38C172", greenDim: "#245A3A", greenBright: "#6EE7A0",
  orange: "#E8853A", orangeDim: "#7A4420",
  blue: "#4E96D9", blueDim: "#284A6E", blueBright: "#7CB8F0",
  purple: "#9B72CF", purpleDim: "#4E3968",
  yellow: "#E2B93B", yellowDim: "#6E5A1E",
  red: "#E05252", redDim: "#6E2828",
  teal: "#3ABAB0", tealDim: "#1E5E5A",
  cyan: "#42C6DD",
};
const F = { mono: "'JetBrains Mono',monospace", sans: "'Plus Jakarta Sans',system-ui,sans-serif" };

// Shared micro-components
const Badge = ({ children, color = C.dim, filled }) => (
  <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: .5, padding: "2px 6px", borderRadius: 3,
    color: filled ? "#fff" : color, background: filled ? color : color + "14", border: `1px solid ${color}22` }}>{children}</span>
);
const Lbl = ({ children, color = C.dim }) => (
  <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 2.5, color, textTransform: "uppercase", marginBottom: 6 }}>{children}</div>
);
const Box = ({ children, style = {}, borderColor }) => (
  <div style={{ background: C.surface, border: `1px solid ${borderColor || C.border}`, borderRadius: 8, overflow: "hidden", ...style }}>{children}</div>
);
const Dot = ({ color, size = 6 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
);
const Ic = ({ children, color }) => (
  <span style={{ fontSize: 13, color, width: 20, textAlign: "center", display: "inline-block" }}>{children}</span>
);

// ═══════════════════════════════════════════════════════════════
// NAV STRUCTURE
// ═══════════════════════════════════════════════════════════════
const NAV = [
  { section: "WORKSPACE", items: [
    { id: "chat", icon: "💬", label: "AI Chat" },
    { id: "explorer", icon: "📂", label: "SAP Explorer" },
    { id: "diff", icon: "±", label: "Code Diff" },
    { id: "git", icon: "⑂", label: "Git History" },
    { id: "pipeline", icon: "▶", label: "Pipeline" },
  ]},
  { section: "DOCUMENTATION", items: [
    { id: "doc-arch", icon: "◎", label: "Architecture" },
    { id: "doc-connect", icon: "🔌", label: "How to Connect" },
    { id: "doc-hosting", icon: "☁", label: "Hosting Guide" },
  ]},
  { section: "BUSINESS", items: [
    { id: "pricing", icon: "€", label: "Pricing" },
    { id: "security", icon: "🔒", label: "Security" },
  ]},
];

// ═══════════════════════════════════════════════════════════════
// AI CHAT VIEW
// ═══════════════════════════════════════════════════════════════
function ChatView() {
  const [msgs, setMsgs] = useState([
    { role: "system", text: "ABAP Code Studio v1.0 bereit. Verbunden mit ECC Prod + BTP Dev." },
    { role: "user", text: "Füge ein Feld MARGIN zum CDS View Z_SALES hinzu" },
    { role: "assistant", thinking: ["sap_search → Z_SALES gefunden (DDLS, Paket Z_SD)", "sap_read → CDS View Source geladen (42 Zeilen)", "sap_read → Basis-Tabelle ZSALES_DATA analysiert", "ai_generate → SAP-ABAP-1 Model, Confidence: 0.94"], text: "Ich habe den CDS View `Z_SALES` analysiert und ein neues kalkuliertes Feld `Margin` hinzugefügt:\n\n```sql\n@EndUserText.label: 'Margin'\nkey SalesOrder,\n    Revenue,\n    Cost,\n    Revenue - Cost as Margin\n```\n\nÄnderungen:\n• Z_SALES (CDS View) — 1 Feld hinzugefügt\n• ZCL_SALES_CALC — neue Methode CALC_MARGIN\n\nTransport: DEVK900123 | Git: feature/ai-margin-field\nBereit für Review → Code Diff Tab" },
  ]);
  const [input, setInput] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
            ...(m.role === "system" ? { justifyContent: "center" } : {}) }}>
            {m.role === "system" ? (
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.dim, padding: "6px 14px", background: C.surface, borderRadius: 20, border: `1px solid ${C.border}` }}>
                <Dot color={C.green} size={5} /> {m.text}
              </div>
            ) : m.role === "user" ? (
              <div style={{ marginLeft: "auto", maxWidth: "70%" }}>
                <div style={{ background: C.blue + "18", border: `1px solid ${C.blue}25`, borderRadius: "14px 14px 4px 14px", padding: "10px 14px" }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, color: C.bright, lineHeight: 1.6 }}>{m.text}</div>
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, textAlign: "right", marginTop: 3 }}>Du · gerade eben</div>
              </div>
            ) : (
              <div style={{ maxWidth: "80%" }}>
                {m.thinking && (
                  <div style={{ marginBottom: 8, padding: "8px 10px", background: C.bg2, borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>AI THINKING</div>
                    {m.thinking.map((t, ti) => (
                      <div key={ti} style={{ fontFamily: F.mono, fontSize: 10, color: C.teal, lineHeight: 1.8, display: "flex", gap: 6 }}>
                        <span style={{ color: C.dim }}>→</span> {t}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px 14px 14px 14px", padding: "12px 14px" }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginTop: 3 }}>Claude · SAP-ABAP-1 + Claude Opus</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ padding: "6px 20px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Analyse Objekt", "Generiere RAP Stack", "Syntax Check", "ATC ausführen", "Transport erstellen"].map((a, i) => (
          <button key={i} style={{ fontFamily: F.mono, fontSize: 10, padding: "4px 10px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, cursor: "pointer" }}>{a}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 20px 14px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Beschreibe deine Anforderung..."
            style={{ flex: 1, fontFamily: F.sans, fontSize: 13, background: "transparent", border: "none", outline: "none", color: C.bright }} />
          <div style={{ display: "flex", gap: 4 }}>
            <Badge color={C.orange}>ECC</Badge>
            <Badge color={C.green}>BTP</Badge>
          </div>
          <button style={{ fontFamily: F.mono, fontSize: 10, padding: "5px 14px", background: C.green, border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Senden</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SAP EXPLORER VIEW
// ═══════════════════════════════════════════════════════════════
function ExplorerView() {
  const [selected, setSelected] = useState(0);
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
  const typeColors = { DDLS: C.blue, CLAS: C.purple, TABL: C.yellow, BDEF: C.teal, PROG: C.orange, FUGR: C.orange, INTF: C.cyan, DTEL: C.dim };
  const statusColors = { active: C.green, modified: C.yellow, inactive: C.red };
  const sel = objects[selected];

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

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Object List */}
      <div style={{ width: 340, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <input placeholder="Objekt suchen..." style={{ width: "100%", fontFamily: F.mono, fontSize: 11, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", color: C.text, outline: "none" }} />
        </div>
        {objects.map((o, i) => (
          <div key={i} onClick={() => setSelected(i)} style={{
            padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
            background: selected === i ? C.surfaceAlt : "transparent",
            borderLeft: selected === i ? `2px solid ${typeColors[o.type] || C.dim}` : "2px solid transparent",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge color={typeColors[o.type]} filled>{o.type}</Badge>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.bright, fontWeight: 600 }}>{o.name}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <Badge color={o.system === "ECC" ? C.orange : C.green}>{o.system}</Badge>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Dot color={statusColors[o.status]} size={5} />
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{o.desc}</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginLeft: "auto" }}>{o.lines} lines</span>
            </div>
          </div>
        ))}
      </div>

      {/* Source Code */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Badge color={typeColors[sel.type]} filled>{sel.type}</Badge>
          <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: C.bright }}>{sel.name}</span>
          <Badge color={sel.system === "ECC" ? C.orange : C.green}>{sel.system}</Badge>
          <Dot color={statusColors[sel.status]} size={5} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{sel.status}</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim, marginLeft: "auto" }}>{sel.pkg}</span>
        </div>
        <div style={{ padding: "8px 0" }}>
          {codeLines.map((l, i) => (
            <div key={i} style={{ display: "flex", fontFamily: F.mono, fontSize: 12, lineHeight: 1.9,
              background: l.h ? C.green + "0A" : "transparent",
              borderLeft: l.h ? `3px solid ${C.green}50` : "3px solid transparent" }}>
              <span style={{ width: 44, textAlign: "right", paddingRight: 12, color: C.dim, fontSize: 11, userSelect: "none" }}>{l.n}</span>
              <span style={{ color: l.h ? C.greenBright : C.text, whiteSpace: "pre" }}>{l.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIFF VIEW
// ═══════════════════════════════════════════════════════════════
function DiffView() {
  const diffs = [
    { type: "ctx", n1: 4, n2: 4, code: "  as select from zsales_data" },
    { type: "ctx", n1: 5, n2: 5, code: "{" },
    { type: "ctx", n1: 6, n2: 6, code: "  key sales_order   as SalesOrder," },
    { type: "ctx", n1: 7, n2: 7, code: "      customer_id   as Customer," },
    { type: "ctx", n1: 8, n2: 8, code: "      revenue       as Revenue," },
    { type: "ctx", n1: 9, n2: 9, code: "      cost          as Cost," },
    { type: "add", n2: 10, code: "      @EndUserText.label: 'Margin'" },
    { type: "add", n2: 11, code: "      revenue - cost as Margin," },
    { type: "ctx", n1: 10, n2: 12, code: "      currency      as Currency," },
    { type: "ctx", n1: 11, n2: 13, code: "      created_at    as CreatedAt" },
    { type: "ctx", n1: 12, n2: 14, code: "}" },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      {/* Commit info */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <Lbl color={C.teal}>Commit Metadata</Lbl>
          <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: C.bright }}>feat(Z_SALES): Add MARGIN calculated field</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          const bg = d.type === "add" ? C.green + "0C" : d.type === "del" ? C.red + "0C" : "transparent";
          const fg = d.type === "add" ? C.greenBright : d.type === "del" ? C.red : C.text;
          const pre = d.type === "add" ? "+" : d.type === "del" ? "-" : " ";
          return (
            <div key={i} style={{ display: "flex", fontFamily: F.mono, fontSize: 12, lineHeight: 2, background: bg }}>
              <span style={{ width: 40, textAlign: "right", paddingRight: 8, color: C.dim, fontSize: 10 }}>{d.n1 || ""}</span>
              <span style={{ width: 40, textAlign: "right", paddingRight: 8, color: C.dim, fontSize: 10 }}>{d.n2 || ""}</span>
              <span style={{ color: d.type !== "ctx" ? fg : C.dim, width: 14 }}>{pre}</span>
              <span style={{ color: fg, whiteSpace: "pre" }}>{d.code}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
        <button style={{ fontFamily: F.mono, fontSize: 11, padding: "8px 24px", background: C.green, border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", fontWeight: 600 }}>✓ Approve & Deploy</button>
        <button style={{ fontFamily: F.mono, fontSize: 11, padding: "8px 24px", background: "transparent", border: `1px solid ${C.red}40`, borderRadius: 5, color: C.red, cursor: "pointer" }}>✗ Reject</button>
        <button style={{ fontFamily: F.mono, fontSize: 11, padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, cursor: "pointer" }}>💬 Comment</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GIT HISTORY VIEW
// ═══════════════════════════════════════════════════════════════
function GitView() {
  const commits = [
    { sha: "a3f7b2e", msg: "feat(Z_SALES): Add MARGIN calculated field", author: "AI + dimitri", time: "14:23", ai: true, status: "pending", branch: "feature/ai-margin-field" },
    { sha: "e12c4a9", msg: "refactor(ZCL_SALES_CALC): Extract method CALC_MARGIN", author: "AI + dimitri", time: "14:20", ai: true, status: "pending", branch: "feature/ai-margin-field" },
    { sha: "b8d1e3f", msg: "fix(Z_BAPI_SALES_GET): Correct date range filter", author: "dimitri", time: "11:45", ai: false, status: "approved", branch: "main" },
    { sha: "c45a92d", msg: "feat(ZI_SALES_TP): Add projection for UI", author: "AI + dimitri", time: "Yesterday", ai: true, status: "merged", branch: "feature/ai-sales-ui" },
    { sha: "f1e8b7a", msg: "chore: Update CDS annotations for Z_SALES", author: "dimitri", time: "Yesterday", ai: false, status: "merged", branch: "main" },
    { sha: "d29c5e1", msg: "feat(ZSD_SALES_ORDER): Add validation logic", author: "AI + dimitri", time: "Feb 4", ai: true, status: "merged", branch: "feature/ai-validation" },
  ];
  const statusStyle = { pending: { color: C.yellow, bg: C.yellow + "14" }, approved: { color: C.green, bg: C.green + "14" }, merged: { color: C.blue, bg: C.blue + "14" } };

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px 20px" }}>
      <Lbl color={C.blue}>Git History — feature/ai-margin-field</Lbl>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {commits.map((c, i) => {
          const st = statusStyle[c.status];
          return (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: i < 2 ? C.surfaceAlt : "transparent", borderRadius: 6, border: i < 2 ? `1px solid ${C.border}` : "1px solid transparent" }}>
              {/* Timeline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, paddingTop: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.ai ? C.teal : C.blue, border: `2px solid ${C.bg}` }} />
                {i < commits.length - 1 && <div style={{ width: 1, height: 32, background: C.border }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.yellow }}>{c.sha}</span>
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 500, color: C.bright }}>{c.msg}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{c.author} · {c.time}</span>
                  {c.ai && <Badge color={C.teal}>AI-GENERATED</Badge>}
                  <span style={{ fontFamily: F.mono, fontSize: 9, padding: "1px 6px", borderRadius: 3, color: st.color, background: st.bg }}>{c.status}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>⑂ {c.branch}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE VIEW
// ═══════════════════════════════════════════════════════════════
function PipelineView() {
  const steps = [
    { name: "Syntax Check", desc: "ADT validation", status: "pass", detail: "0 Errors", icon: "✓", color: C.green },
    { name: "ATC Checks", desc: "Code Inspector", status: "warn", detail: "0 Errors, 2 Warnings", icon: "⚠", color: C.yellow },
    { name: "ABAP Unit Tests", desc: "12 Tests", status: "pass", detail: "12/12 passed (0.8s)", icon: "✓", color: C.green },
    { name: "CDS Test Doubles", desc: "SQL verification", status: "pass", detail: "4/4 passed", icon: "✓", color: C.green },
    { name: "Code Review Gate", desc: "Human approval", status: "pending", detail: "Waiting for reviewer", icon: "⏳", color: C.yellow },
    { name: "Transport Release", desc: "DEVK900123", status: "blocked", detail: "Blocked until review", icon: "🔒", color: C.red },
    { name: "abapGit Push", desc: "feature/ai-margin-field", status: "blocked", detail: "After transport", icon: "⑂", color: C.red },
  ];
  const barWidth = (i) => {
    if (steps[i].status === "pass") return "100%";
    if (steps[i].status === "warn") return "100%";
    if (steps[i].status === "pending") return "50%";
    return "0%";
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px 20px" }}>
      <Lbl>CI/CD Pipeline — Z_SALES / MARGIN Field</Lbl>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {steps.map((s, i) => (
          <Box key={i}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.bright }}>{s.name}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{s.desc}</span>
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: s.color, marginTop: 2 }}>{s.detail}</div>
              </div>
              <Badge color={s.color}>{s.status.toUpperCase()}</Badge>
            </div>
            {/* Progress bar */}
            <div style={{ height: 2, background: C.bg }}>
              <div style={{ height: 2, width: barWidth(i), background: s.color, transition: "width 0.5s" }} />
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
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, letterSpacing: 1 }}>{m.label}</div>
              <div style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOC: ARCHITECTURE VIEW
// ═══════════════════════════════════════════════════════════════
function DocArchView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Documentation</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>System Architecture</h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>Hybrid SaaS + Client Agent — Dual System (ECC + BTP)</p>

      {/* Main diagram */}
      <Box style={{ background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.surface} 100%)`, padding: 20, marginBottom: 16 }}>
        {/* Developer → AI Agent */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <ArchNode icon="👤" title="Developer" sub="Claude Code / VS Code / Custom UI" color={C.blue} />
          <div style={{ display: "flex", alignItems: "center", color: C.dim }}>
            <div style={{ width: 40, height: 1, background: C.border }} />
            <span style={{ fontFamily: F.mono, fontSize: 9, padding: "0 6px", color: C.dim }}>MCP</span>
            <div style={{ width: 40, height: 1, background: C.border }} />
          </div>
          <ArchNode icon="🤖" title="AI Agent" sub="Prompt + Context Management" color={C.teal} />
        </div>

        {/* Cloud Platform */}
        <div style={{ border: `1px dashed ${C.blue}30`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 2, color: C.blue, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            ☁ DEIN CLOUD PRODUKT (SaaS) <Badge color={C.blue}>Deine Infrastruktur</Badge>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { n: "Web UI", c: C.blue }, { n: "AI Orchestration", c: C.teal }, { n: "Workflow Engine", c: C.purple },
              { n: "Metadata Store", c: C.yellow }, { n: "Git Integration", c: C.green }, { n: "Audit & Analytics", c: C.orange },
            ].map((t, i) => (
              <div key={i} style={{ flex: "1 1 100px", padding: "8px 10px", background: C.bg, borderRadius: 5, border: `1px solid ${C.border}` }}>
                <Dot color={t.c} size={5} /> <span style={{ fontFamily: F.mono, fontSize: 10, color: t.c, marginLeft: 4 }}>{t.n}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 9, color: C.dim, marginTop: 8, padding: "4px 10px", background: C.bg, borderRadius: 4, display: "inline-block" }}>
            ✓ Keine SAP-Daten · ✓ Keine Credentials · ✓ Nur Metadaten + Diffs
          </div>
        </div>

        {/* Connection line */}
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 10, color: C.yellow, margin: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 60, height: 1, background: C.yellow + "40" }} />
          WebSocket / SSE (TLS 1.3)
          <div style={{ width: 60, height: 1, background: C.yellow + "40" }} />
        </div>

        {/* Client Agent */}
        <div style={{ border: `1px dashed ${C.orange}30`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 2, color: C.orange, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            ⬡ KUNDEN-INFRASTRUKTUR (Client Agent) <Badge color={C.orange}>Beim Kunden installiert</Badge>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { n: "MCP Server (lokal)", c: C.orange }, { n: "ADT Client", c: C.blue }, { n: "RFC Client (PyRFC)", c: C.orange },
              { n: "Transport Mgmt", c: C.yellow }, { n: "ATC + Unit Tests", c: C.green }, { n: "abapGit Sync", c: C.purple },
            ].map((t, i) => (
              <div key={i} style={{ flex: "1 1 100px", padding: "8px 10px", background: C.bg, borderRadius: 5, border: `1px solid ${C.border}` }}>
                <Dot color={t.c} size={5} /> <span style={{ fontFamily: F.mono, fontSize: 10, color: t.c, marginLeft: 4 }}>{t.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Systems */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ArchBox title="SAP ECC 6.0" sub="ADT + RFC · Basic Auth" color={C.orange} items={["Reports", "Klassen", "FuBas", "BAPIs", "DDIC", "CDS"]} />
          <ArchBox title="BTP ABAP Cloud" sub="ADT + JWT · Principal Prop." color={C.green} items={["RAP Stack", "CDS Entity", "BDEF", "Service Def", "Classes"]} />
          <ArchBox title="SAP AI Core" sub="GenAI Hub · LLM Routing" color={C.teal} items={["SAP-ABAP-1", "Claude", "GPT-4", "Mistral"]} />
          <ArchBox title="Git Repository" sub="GitHub/GitLab · abapGit" color={C.purple} items={["Branches", "PRs", "CI/CD", "Audit"]} />
        </div>
      </Box>

      {/* Workflow */}
      <Lbl color={C.teal}>Development Workflow (4 Phasen)</Lbl>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { phase: "ANALYSE", color: C.blue, steps: ["Requirement beschreiben", "System durchsuchen (sap_search)", "Abhängigkeiten analysieren"] },
          { phase: "GENERIERUNG", color: C.purple, steps: ["Code generieren (SAP-ABAP-1)", "Syntax Check (ADT)", "Diff anzeigen"] },
          { phase: "DEPLOY", color: C.green, steps: ["Git Commit + Metadata", "SAP Write + Activate", "Transport + abapGit Push"] },
          { phase: "VALIDIERUNG", color: C.teal, steps: ["ATC + Unit Tests", "Code Review Gate", "Transport Release"] },
        ].map((p, i) => (
          <Box key={i} style={{ flex: "1 1 160px", borderLeft: `3px solid ${p.color}` }}>
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2, fontWeight: 600, color: p.color }}>{p.phase}</span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              {p.steps.map((s, si) => (
                <div key={si} style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.8, display: "flex", gap: 6 }}>
                  <span style={{ color: p.color }}>{si + 1}</span> {s}
                </div>
              ))}
            </div>
          </Box>
        ))}
      </div>

      {/* Object Types Comparison */}
      <Lbl color={C.yellow}>Unterstützte Objekttypen</Lbl>
      <Box style={{ marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 9, letterSpacing: 1 }}>OBJECT TYPE</th>
                <th style={{ textAlign: "center", padding: "8px 10px", color: C.orange, borderBottom: `1px solid ${C.border}`, fontSize: 9, letterSpacing: 1 }}>ECC 6.0</th>
                <th style={{ textAlign: "center", padding: "8px 10px", color: C.green, borderBottom: `1px solid ${C.border}`, fontSize: 9, letterSpacing: 1 }}>BTP CLOUD</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Reports / Programs", "✓", "✓"], ["Classes / Interfaces", "✓", "✓"], ["Function Modules", "✓", "✗"],
                ["BAPIs", "✓", "✗"], ["CDS Views", "✓ (≥7.40)", "✓"], ["RAP (BDEF/Svc)", "✗", "✓"],
                ["BADIs", "✓", "✓"], ["Data Elements / Domains", "✓", "✓"], ["Tables / Structures", "✓", "✓"],
              ].map(([obj, ecc, btp], i) => (
                <tr key={i}>
                  <td style={{ padding: "5px 10px", color: C.bright, fontFamily: F.sans, fontSize: 12 }}>{obj}</td>
                  <td style={{ padding: "5px 10px", textAlign: "center", color: ecc.includes("✓") ? C.green : C.red }}>{ecc}</td>
                  <td style={{ padding: "5px 10px", textAlign: "center", color: btp.includes("✓") ? C.green : C.red }}>{btp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      {/* Data Flow */}
      <Lbl color={C.purple}>Datenfluss — Was geht wohin?</Lbl>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Box style={{ flex: 1, minWidth: 240, borderLeft: `3px solid ${C.blue}` }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.blue }}>☁ Zur Cloud</span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {["System-Metadaten (Namen, Typen)", "AI Prompts & Responses", "Code Diffs (nicht volle Source)", "Pipeline Status", "Audit Trail"].map((d, i) => (
              <div key={i} style={{ fontFamily: F.mono, fontSize: 10, color: C.green, lineHeight: 1.8 }}>✓ {d}</div>
            ))}
          </div>
        </Box>
        <Box style={{ flex: 1, minWidth: 240, borderLeft: `3px solid ${C.orange}` }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.orange }}>⬡ Bleibt beim Kunden</span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {["SAP Credentials & Tokens", "Vollständiger Quellcode", "Geschäftsdaten", "Transport Requests", "AI Core Verbindung"].map((d, i) => (
              <div key={i} style={{ fontFamily: F.mono, fontSize: 10, color: C.orange, lineHeight: 1.8 }}>⬡ {d}</div>
            ))}
          </div>
        </Box>
        <Box style={{ flex: 1, minWidth: 240, borderLeft: `3px solid ${C.red}` }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.red }}>✗ Geht NIE zur Cloud</span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {["SAP Passwörter / JWT Tokens", "Vollständige Source Files", "Tabelleninhalte", "Produktivdaten", "Kunden-AI-Core Keys"].map((d, i) => (
              <div key={i} style={{ fontFamily: F.mono, fontSize: 10, color: C.red, lineHeight: 1.8 }}>✗ {d}</div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
}

function ArchNode({ icon, title, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 18px", background: C.bg, borderRadius: 8, border: `1px solid ${color}20`, minWidth: 140 }}>
      <div style={{ fontSize: 20, marginBottom: 3 }}>{icon}</div>
      <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: C.bright }}>{title}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function ArchBox({ title, sub, color, items }) {
  return (
    <div style={{ flex: "1 1 140px", background: C.bg, borderRadius: 6, border: `1px solid ${color}20`, padding: "10px 12px" }}>
      <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color }}>{title}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginBottom: 6 }}>{sub}</div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {items.map((it, i) => <Badge key={i} color={color}>{it}</Badge>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOC: HOW TO CONNECT
// ═══════════════════════════════════════════════════════════════
function DocConnectView() {
  const systems = [
    {
      name: "SAP ECC 6.0", color: C.orange, icon: "◆",
      method: "ADT REST APIs + RFC (PyRFC)",
      steps: [
        { title: "1. ADT Services aktivieren", desc: "Transaktion SICF → /sap/bc/adt/* aktivieren. Basis-Team muss die ICF-Knoten freischalten.", visual: "SICF → /sap/bc/adt → Rechtsklick → Dienst aktivieren" },
        { title: "2. Benutzer anlegen", desc: "Technischer User oder Entwickler-Account mit S_DEVELOP, S_RFC Berechtigung. Empfehlung: eigenes Berechtigungsprofil für MCP.", visual: "SU01 → Rollen: Z_MCP_DEVELOPER" },
        { title: "3. Agent installieren", desc: "Docker Container oder Python-Package auf einem Server mit Netzwerkzugriff zum SAP System.", visual: "docker run -d --name agent -e SAP_ECC_HOST=10.0.1.50 abap-studio/agent" },
        { title: "4. Verbindung konfigurieren", desc: "System in der Cloud-UI registrieren. Agent Token eingeben. ECC-Credentials lokal auf dem Agent speichern.", visual: "agent.yaml → ecc_prod: { host, client: 100, auth: basic }" },
        { title: "5. RFC Fallback (optional)", desc: "Für FuBa-Aufrufe und Tabelleninhalte: PyRFC mit SAP NW RFC SDK installieren.", visual: "pip install pyrfc → sysnr: 00, ashost: 10.0.1.50" },
      ],
      config: `# Agent Konfiguration für ECC
systems:
  ecc_production:
    type: ecc
    url: https://ecc-prod.company.com:8443
    client: "100"
    auth:
      method: basic
      vault_path: secret/sap/ecc-prod
    connection:
      primary: adt
      fallback: rfc
    rfc:
      sysnr: "00"
      ashost: 10.0.1.50`
    },
    {
      name: "BTP ABAP Cloud", color: C.green, icon: "◇",
      method: "ADT REST APIs + JWT/XSUAA",
      steps: [
        { title: "1. Service Key erstellen", desc: "BTP Cockpit → ABAP Environment → Service Key generieren. Enthält Client-ID, Secret, XSUAA URL.", visual: "BTP Cockpit → Instances → Create Service Key" },
        { title: "2. Agent Token generieren", desc: "In der Cloud-UI: neues System anlegen, Agent Token kopieren.", visual: "Cloud UI → Systems → + BTP System → Copy Token" },
        { title: "3. Agent konfigurieren", desc: "Service Key JSON dem Agent bereitstellen. Agent extrahiert automatisch JWT-Konfiguration.", visual: "btp_env_generator.py --service-key key.json" },
        { title: "4. Principal Propagation", desc: "Optional: XSUAA Trust Konfiguration für User-Identity-Propagation statt technischem User.", visual: "BTP → Trust Config → Custom IdP → SAML Bearer" },
        { title: "5. Verbindung testen", desc: "Agent prüft automatisch die Verbindung und meldet Status an die Cloud.", visual: "abap-studio-agent test --system btp_dev" },
      ],
      config: `# Agent Konfiguration für BTP
systems:
  btp_dev:
    type: btp_abap_cloud
    url: https://dev.abap.eu10.hana.ondemand.com
    auth:
      method: jwt_xsuaa
      xsuaa_url: https://dev.authentication.eu10.hana.ondemand.com
      client_id_vault: secret/sap/btp-dev/clientid
      client_secret_vault: secret/sap/btp-dev/secret
      principal_propagation: true`
    },
    {
      name: "SAP AI Core", color: C.teal, icon: "🧠",
      method: "GenAI Hub SDK + Service Key",
      steps: [
        { title: "1. AI Core Instanz erstellen", desc: "BTP Cockpit → AI Core Service → Instanz + Service Key erstellen.", visual: "BTP → AI Core → Create Instance" },
        { title: "2. Modelle deployen", desc: "SAP-ABAP-1 und/oder Claude/GPT im GenAI Hub aktivieren.", visual: "AI Launchpad → Generative AI Hub → Deploy Model" },
        { title: "3. Agent konfigurieren", desc: "AI Core Service Key dem Agent bereitstellen. SDK nutzt automatisch die Endpoints.", visual: "agent.yaml → ai_core: { service_key: /secrets/aicore.json }" },
        { title: "4. Model Routing", desc: "In der Cloud-UI festlegen welches Modell für welche Aufgabe genutzt wird.", visual: "Cloud UI → AI Settings → Code: SAP-ABAP-1, Reasoning: Claude" },
      ],
      config: `# AI Core Konfiguration
ai:
  provider: sap_ai_core
  service_key: /secrets/aicore-key.json
  models:
    code_generation: sap-abap-1
    reasoning: claude-opus-4-6
    quick_tasks: claude-sonnet-4-5`
    },
    {
      name: "Git Repository", color: C.purple, icon: "⑂",
      method: "GitHub/GitLab + abapGit",
      steps: [
        { title: "1. Repository erstellen", desc: "GitHub/GitLab Repo für ABAP-Objekte. Branch Protection auf main aktivieren.", visual: "github.com/org/abap-objects → Settings → Branch Rules" },
        { title: "2. abapGit installieren", desc: "ECC: abapGit als lokaler Report. BTP: gCTS oder abapGit Plugin.", visual: "ECC: ZABAPGIT Report | BTP: Manage Software Components" },
        { title: "3. SSH/HTTPS Key", desc: "Deploy Key oder Personal Access Token für Git-Zugriff vom Agent.", visual: "agent.yaml → git: { token_vault: secret/github/pat }" },
        { title: "4. Webhooks", desc: "Optional: Webhook für PR-Events an die Cloud-UI für Echtzeit-Updates.", visual: "GitHub → Webhooks → https://api.abap-studio.de/webhook" },
      ],
      config: `# Git Konfiguration
git:
  provider: github
  repo: org/abap-objects
  default_branch: main
  token_vault: secret/github/pat
  abapgit:
    ecc: true
    btp: gcts`
    },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>How-To Guide</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>Systeme verbinden</h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>Schritt-für-Schritt Anleitung für jede System-Anbindung</p>

      {systems.map((sys, si) => (
        <Box key={si} style={{ marginBottom: 16, borderLeft: `3px solid ${sys.color}` }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{sys.icon}</span>
            <span style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: sys.color }}>{sys.name}</span>
            <Badge color={sys.color}>{sys.method}</Badge>
          </div>

          {/* Steps as visual flow */}
          <div style={{ padding: "12px 14px" }}>
            {sys.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: sys.color + "20", border: `1.5px solid ${sys.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: sys.color }}>{i + 1}</div>
                  {i < sys.steps.length - 1 && <div style={{ width: 1, flex: 1, background: sys.color + "20", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.bright }}>{step.title}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 2 }}>{step.desc}</div>
                  <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 10, color: sys.color, padding: "5px 10px", background: C.bg, borderRadius: 4, border: `1px solid ${sys.color}15`, display: "inline-block" }}>
                    {step.visual}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Config snippet */}
          <div style={{ padding: "0 14px 12px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.dim, marginBottom: 4 }}>KONFIGURATION</div>
            <pre style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.7, margin: 0, padding: "10px 12px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`, whiteSpace: "pre-wrap", overflowX: "auto" }}>{sys.config}</pre>
          </div>
        </Box>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOC: HOSTING GUIDE
// ═══════════════════════════════════════════════════════════════
function DocHostingView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Hosting Guide</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>Deployment & Hosting</h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>Wo und wie jede Komponente gehostet wird</p>

      {/* Overview diagram */}
      <Box style={{ padding: 16, marginBottom: 16, background: `linear-gradient(135deg, ${C.bg2}, ${C.surface})` }}>
        <Lbl color={C.yellow}>Deployment Übersicht</Lbl>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { name: "Cloud Frontend", host: "CDN (Cloudflare / Vercel)", tech: "React SPA", color: C.blue, icon: "🌐" },
            { name: "Cloud Backend", host: "AWS ECS / Azure AKS / Hetzner", tech: "Python FastAPI + WebSocket", color: C.purple, icon: "⚙" },
            { name: "Datenbank", host: "PostgreSQL (RDS / Managed)", tech: "Nur Metadaten, kein SAP-Code", color: C.yellow, icon: "🗄" },
            { name: "Client Agent", host: "Beim Kunden (Docker/Python)", tech: "FastMCP + ADT + PyRFC", color: C.orange, icon: "⬡" },
            { name: "AI Models", host: "Kunden AI Core / Cloud LLM", tech: "SAP-ABAP-1, Claude, GPT", color: C.teal, icon: "🧠" },
            { name: "Git Platform", host: "GitHub / GitLab (SaaS)", tech: "Repos, PRs, CI/CD", color: C.green, icon: "⑂" },
          ].map((c, i) => (
            <div key={i} style={{ flex: "1 1 200px", padding: "12px", background: C.bg, borderRadius: 8, border: `1px solid ${c.color}18` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{c.icon}</span>
                <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: c.color }}>{c.name}</span>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.6 }}>{c.tech}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginTop: 4, padding: "3px 6px", background: C.surface, borderRadius: 3, display: "inline-block" }}>{c.host}</div>
            </div>
          ))}
        </div>
      </Box>

      {/* Cloud hosting options */}
      <Lbl color={C.blue}>Cloud Backend Hosting Optionen</Lbl>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          {
            name: "AWS", color: C.orange, fit: "Bester Allrounder",
            services: [
              { n: "ECS/Fargate", d: "Backend Container" }, { n: "RDS PostgreSQL", d: "Metadaten DB" },
              { n: "CloudFront + S3", d: "Frontend CDN" }, { n: "API Gateway + ALB", d: "WebSocket + REST" },
              { n: "Secrets Manager", d: "Tenant Secrets" }, { n: "CloudWatch", d: "Monitoring" },
            ],
            cost: "~$200-600/mo (Start)"
          },
          {
            name: "Azure", color: C.blue, fit: "SAP-Kunden oft auf Azure",
            services: [
              { n: "AKS", d: "Kubernetes Cluster" }, { n: "Azure DB for PG", d: "Managed Postgres" },
              { n: "Front Door", d: "CDN + WAF" }, { n: "App Service", d: "WebSocket Support" },
              { n: "Key Vault", d: "Secrets" }, { n: "Application Insights", d: "Monitoring" },
            ],
            cost: "~$250-700/mo (Start)"
          },
          {
            name: "Hetzner + EU", color: C.green, fit: "DSGVO, günstig zum Start",
            services: [
              { n: "Dedicated/Cloud", d: "VPS oder Bare Metal" }, { n: "PostgreSQL", d: "Self-managed" },
              { n: "Caddy / Traefik", d: "Reverse Proxy + TLS" }, { n: "Docker Compose", d: "All-in-one" },
              { n: "Vault (self)", d: "HashiCorp Vault" }, { n: "Grafana + Loki", d: "Monitoring" },
            ],
            cost: "~$50-150/mo (Start)"
          },
        ].map((h, i) => (
          <Box key={i} style={{ flex: "1 1 220px", borderTop: `3px solid ${h.color}` }}>
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: h.color }}>{h.name}</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: h.color }}>{h.fit}</span>
            </div>
            <div style={{ padding: "8px 12px" }}>
              {h.services.map((s, si) => (
                <div key={si} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: si < h.services.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.bright }}>{s.n}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{s.d}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: h.color }}>{h.cost}</div>
            </div>
          </Box>
        ))}
      </div>

      {/* Client Agent Deployment */}
      <Lbl color={C.orange}>Client Agent Deployment</Lbl>
      <Box style={{ marginBottom: 16 }}>
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { method: "Docker (empfohlen)", cmd: "docker run -d --name abap-agent\n  -e CLOUD_URL=wss://api.abap-studio.de\n  -e AGENT_TOKEN=<token>\n  -v /opt/config:/config\n  abap-studio/agent:latest", color: C.blue },
              { method: "Python Package", cmd: "pip install abap-studio-agent\nabap-studio-agent init --token <token>\nabap-studio-agent start", color: C.green },
              { method: "Windows Service", cmd: "abap-studio-agent.exe install\n  --service\n  --token <token>\n# Für SAP GUI Scripting Support", color: C.orange },
            ].map((d, i) => (
              <div key={i} style={{ flex: "1 1 200px" }}>
                <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: d.color, marginBottom: 6 }}>{d.method}</div>
                <pre style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.7, margin: 0, padding: "10px", background: C.bg, borderRadius: 6, border: `1px solid ${d.color}15`, whiteSpace: "pre-wrap" }}>{d.cmd}</pre>
              </div>
            ))}
          </div>
        </div>
      </Box>

      {/* DB Schema */}
      <Lbl color={C.yellow}>Datenbank Schema (nur Metadaten)</Lbl>
      <Box>
        <div style={{ padding: 14 }}>
          <pre style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{`tenants          (id, name, plan, created_at)
sap_systems      (id, tenant_id, name, type, host_label, agent_id, last_seen)
abap_objects     (id, system_id, type, name, package, ai_generated, review_status)
ai_sessions      (id, tenant_id, prompt, model, confidence, objects_modified[])
audit_log        (id, tenant_id, action, object_ref, git_sha, transport_nr, ts)
users            (id, tenant_id, email, role, sso_id)`}</pre>
        </div>
      </Box>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRICING VIEW
// ═══════════════════════════════════════════════════════════════
function PricingView() {
  const plans = [
    { name: "Starter", price: "€499", sub: "/Monat", color: C.blue, features: ["1 SAP System", "3 Entwickler", "Cloud AI (Claude/GPT)", "Basic Review Workflow", "5.000 AI Generations/mo", "Community Support"] },
    { name: "Professional", price: "€1.499", sub: "/Monat", color: C.green, badge: "POPULAR", features: ["5 SAP Systeme (ECC + BTP)", "15 Entwickler", "Cloud AI + Kunden AI Core", "Full Review + Pipeline", "25.000 AI Generations/mo", "Git Integration", "Priority Support"] },
    { name: "Enterprise", price: "Custom", sub: "", color: C.purple, features: ["Unlimited Systeme", "Unlimited Entwickler", "Air-Gapped (nur Client AI)", "Custom Workflows + SSO", "On-Premise Cloud Option", "SLA + Dedicated Support", "SOC 2 Compliance"] },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Lbl>Pricing</Lbl>
        <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright }}>Pricing Tiers</h2>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {plans.map((p, i) => (
          <Box key={i} style={{ flex: "1 1 200px", borderTop: `3px solid ${p.color}` }}>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: F.sans, fontSize: 16, fontWeight: 700, color: p.color }}>{p.name}</span>
                {p.badge && <Badge color={p.color} filled>{p.badge}</Badge>}
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.bright }}>{p.price}</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.dim }}>{p.sub}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                {p.features.map((f, fi) => (
                  <div key={fi} style={{ fontFamily: F.mono, fontSize: 11, color: C.text, lineHeight: 2 }}>
                    <span style={{ color: p.color }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </Box>
        ))}
      </div>

      {/* Revenue Streams */}
      <Lbl color={C.teal}>Revenue Streams</Lbl>
      <Box>
        <div style={{ padding: 14 }}>
          {[
            { stream: "SaaS Subscription", pct: 70, color: C.blue },
            { stream: "AI Token Usage", pct: 15, color: C.teal },
            { stream: "Professional Services", pct: 10, color: C.purple },
            { stream: "Enterprise Add-Ons", pct: 5, color: C.orange },
          ].map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.bright }}>{r.stream}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: r.color }}>{r.pct}%</span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: 6, width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECURITY VIEW
// ═══════════════════════════════════════════════════════════════
function SecurityView() {
  const sections = [
    { title: "Zero Trust für SAP-Daten", color: C.green, icon: "🛡", items: [
      "Cloud speichert keine SAP-Credentials", "Quellcode verlässt nie das Kundennetzwerk",
      "Agent-Token tenant-spezifisch & rotierbar", "TLS 1.3 + Certificate Pinning", "IP-Whitelist für Agent"
    ]},
    { title: "Tenant Isolation", color: C.blue, icon: "🏢", items: [
      "Strikte Datentrennung pro Tenant", "Kein Cross-Tenant Zugriff",
      "Tenant-Admin verwaltet User & Systeme", "Audit Log pro Tenant, exportierbar"
    ]},
    { title: "DSGVO / Compliance", color: C.purple, icon: "📋", items: [
      "Nur Usernamen + E-Mail gespeichert", "DPA (Data Processing Agreement) verfügbar",
      "Option B eliminiert PII-Transfer komplett", "EU Hosting (Hetzner/Azure Germany)", "SOC 2 Type II als Ziel"
    ]},
    { title: "SAP Authorization", color: C.orange, icon: "🔑", items: [
      "Agent respektiert S_DEVELOP, S_RFC", "Kein Bypass von SAP Auth Checks",
      "Transport-Release nur nach Review", "ATC Security Checks lokal im SAP", "AI-Code bekommt immer Review-Pflicht"
    ]},
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Security & Compliance</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 16px" }}>Sicherheitsarchitektur</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {sections.map((s, i) => (
          <Box key={i} style={{ flex: "1 1 300px", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{s.icon}</span>
              <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: s.color }}>{s.title}</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {s.items.map((item, j) => (
                <div key={j} style={{ fontFamily: F.mono, fontSize: 11, color: C.text, lineHeight: 1.9, display: "flex", gap: 6 }}>
                  <span style={{ color: s.color }}>•</span> {item}
                </div>
              ))}
            </div>
          </Box>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function ABAPCodeStudio() {
  const [active, setActive] = useState("chat");
  const [collapsed, setCollapsed] = useState(false);

  const views = {
    chat: ChatView, explorer: ExplorerView, diff: DiffView, git: GitView, pipeline: PipelineView,
    "doc-arch": DocArchView, "doc-connect": DocConnectView, "doc-hosting": DocHostingView,
    pricing: PricingView, security: SecurityView,
  };
  const ActiveView = views[active];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: F.sans, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${C.borderLight}}
        *{box-sizing:border-box}
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 40, borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${C.orange}, ${C.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>A</div>
        <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: C.bright }}>ABAP Code Studio</span>
        <Badge color={C.yellow}>DUAL-SYSTEM</Badge>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot color={C.orange} /><span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>ECC</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot color={C.green} /><span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>BTP</span></div>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>|</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>⑂ feature/ai-margin-field</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.dim }}>|</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.yellow }}>DEVK900123</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <nav style={{ width: collapsed ? 44 : 180, borderRight: `1px solid ${C.border}`, background: C.surface, overflowY: "auto", flexShrink: 0, transition: "width 0.2s" }}>
          <div style={{ padding: "8px 6px" }}>
            <button onClick={() => setCollapsed(!collapsed)} style={{ width: "100%", fontFamily: F.mono, fontSize: 10, padding: "4px 6px", background: "transparent", border: "none", color: C.dim, cursor: "pointer", textAlign: "left" }}>
              {collapsed ? "»" : "« Collapse"}
            </button>
          </div>
          {NAV.map((section, si) => (
            <div key={si}>
              {!collapsed && <div style={{ padding: "8px 10px 4px", fontFamily: F.mono, fontSize: 8, letterSpacing: 2, color: C.dim }}>{section.section}</div>}
              {section.items.map((item) => (
                <button key={item.id} onClick={() => setActive(item.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: collapsed ? "7px 0" : "7px 10px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  fontFamily: F.mono, fontSize: 11, border: "none", cursor: "pointer",
                  background: active === item.id ? C.green + "12" : "transparent",
                  color: active === item.id ? C.greenBright : C.text,
                  borderLeft: active === item.id ? `2px solid ${C.green}` : "2px solid transparent",
                  transition: "all 0.1s",
                }}>
                  <span style={{ fontSize: 12, width: 18, textAlign: "center" }}>{item.icon}</span>
                  {!collapsed && item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ActiveView />
        </main>
      </div>

      {/* Status Bar */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", height: 22, background: C.greenDim, flexShrink: 0, fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.75)" }}>
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
    </div>
  );
}
