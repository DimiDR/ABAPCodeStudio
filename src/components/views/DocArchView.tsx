"use client";

import { C, F } from "@/lib/theme";
import { Badge, Box, Dot, Lbl } from "@/components/ui";

function ArchNode({
  icon,
  title,
  sub,
  color,
}: {
  icon: string;
  title: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 18px",
        background: C.bg,
        borderRadius: 8,
        border: `1px solid ${color}20`,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 3 }}>{icon}</div>
      <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: C.bright }}>
        {title}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function ArchBox({
  title,
  sub,
  color,
  items,
}: {
  title: string;
  sub: string;
  color: string;
  items: string[];
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        background: C.bg,
        borderRadius: 6,
        border: `1px solid ${color}20`,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color }}>{title}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.dim, marginBottom: 6 }}>{sub}</div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {items.map((it, i) => (
          <Badge key={i} color={color}>
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function DocArchView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Documentation</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>
        System Architecture
      </h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>
        Hybrid SaaS + Client Agent — Dual System (ECC + BTP)
      </p>

      {/* Main diagram */}
      <Box
        style={{
          background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.surface} 100%)`,
          padding: 20,
          marginBottom: 16,
        }}
      >
        {/* Developer → AI Agent */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <ArchNode icon="👤" title="Developer" sub="Claude Code / VS Code / Custom UI" color={C.blue} />
          <div style={{ display: "flex", alignItems: "center", color: C.dim }}>
            <div style={{ width: 40, height: 1, background: C.border }} />
            <span style={{ fontFamily: F.mono, fontSize: 9, padding: "0 6px", color: C.dim }}>
              MCP
            </span>
            <div style={{ width: 40, height: 1, background: C.border }} />
          </div>
          <ArchNode icon="🤖" title="AI Agent" sub="Prompt + Context Management" color={C.teal} />
        </div>

        {/* Cloud Platform */}
        <div
          style={{
            border: `1px dashed ${C.blue}30`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 9,
              letterSpacing: 2,
              color: C.blue,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ☁ DEIN CLOUD PRODUKT (SaaS) <Badge color={C.blue}>Deine Infrastruktur</Badge>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { n: "Web UI", c: C.blue },
              { n: "AI Orchestration", c: C.teal },
              { n: "Workflow Engine", c: C.purple },
              { n: "Metadata Store", c: C.yellow },
              { n: "Git Integration", c: C.green },
              { n: "Audit & Analytics", c: C.orange },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 100px",
                  padding: "8px 10px",
                  background: C.bg,
                  borderRadius: 5,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Dot color={t.c} size={5} />{" "}
                <span style={{ fontFamily: F.mono, fontSize: 10, color: t.c, marginLeft: 4 }}>
                  {t.n}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: F.mono,
              fontSize: 9,
              color: C.dim,
              marginTop: 8,
              padding: "4px 10px",
              background: C.bg,
              borderRadius: 4,
              display: "inline-block",
            }}
          >
            ✓ Keine SAP-Daten · ✓ Keine Credentials · ✓ Nur Metadaten + Diffs
          </div>
        </div>

        {/* Connection line */}
        <div
          style={{
            textAlign: "center",
            fontFamily: F.mono,
            fontSize: 10,
            color: C.yellow,
            margin: "6px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 60, height: 1, background: C.yellow + "40" }} />
          WebSocket / SSE (TLS 1.3)
          <div style={{ width: 60, height: 1, background: C.yellow + "40" }} />
        </div>

        {/* Client Agent */}
        <div
          style={{
            border: `1px dashed ${C.orange}30`,
            borderRadius: 10,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 9,
              letterSpacing: 2,
              color: C.orange,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ⬡ KUNDEN-INFRASTRUKTUR (Client Agent){" "}
            <Badge color={C.orange}>Beim Kunden installiert</Badge>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { n: "MCP Server (lokal)", c: C.orange },
              { n: "ADT Client", c: C.blue },
              { n: "RFC Client (PyRFC)", c: C.orange },
              { n: "Transport Mgmt", c: C.yellow },
              { n: "ATC + Unit Tests", c: C.green },
              { n: "abapGit Sync", c: C.purple },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 100px",
                  padding: "8px 10px",
                  background: C.bg,
                  borderRadius: 5,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Dot color={t.c} size={5} />{" "}
                <span style={{ fontFamily: F.mono, fontSize: 10, color: t.c, marginLeft: 4 }}>
                  {t.n}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Systems */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ArchBox
            title="SAP ECC 6.0"
            sub="ADT + RFC · Basic Auth"
            color={C.orange}
            items={["Reports", "Klassen", "FuBas", "BAPIs", "DDIC", "CDS"]}
          />
          <ArchBox
            title="BTP ABAP Cloud"
            sub="ADT + JWT · Principal Prop."
            color={C.green}
            items={["RAP Stack", "CDS Entity", "BDEF", "Service Def", "Classes"]}
          />
          <ArchBox
            title="SAP AI Core"
            sub="GenAI Hub · LLM Routing"
            color={C.teal}
            items={["SAP-ABAP-1", "Claude", "GPT-4", "Mistral"]}
          />
          <ArchBox
            title="Git Repository"
            sub="GitHub/GitLab · abapGit"
            color={C.purple}
            items={["Branches", "PRs", "CI/CD", "Audit"]}
          />
        </div>
      </Box>

      {/* Workflow */}
      <Lbl color={C.teal}>Development Workflow (4 Phasen)</Lbl>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          {
            phase: "ANALYSE",
            color: C.blue,
            steps: [
              "Requirement beschreiben",
              "System durchsuchen (sap_search)",
              "Abhängigkeiten analysieren",
            ],
          },
          {
            phase: "GENERIERUNG",
            color: C.purple,
            steps: [
              "Code generieren (SAP-ABAP-1)",
              "Syntax Check (ADT)",
              "Diff anzeigen",
            ],
          },
          {
            phase: "DEPLOY",
            color: C.green,
            steps: [
              "Git Commit + Metadata",
              "SAP Write + Activate",
              "Transport + abapGit Push",
            ],
          },
          {
            phase: "VALIDIERUNG",
            color: C.teal,
            steps: [
              "ATC + Unit Tests",
              "Code Review Gate",
              "Transport Release",
            ],
          },
        ].map((p, i) => (
          <Box key={i} style={{ flex: "1 1 160px", borderLeft: `3px solid ${p.color}` }}>
            <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: 600,
                  color: p.color,
                }}
              >
                {p.phase}
              </span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              {p.steps.map((s, si) => (
                <div
                  key={si}
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: C.text,
                    lineHeight: 1.8,
                    display: "flex",
                    gap: 6,
                  }}
                >
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
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: F.mono,
              fontSize: 11,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    color: C.dim,
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 9,
                    letterSpacing: 1,
                  }}
                >
                  OBJECT TYPE
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px 10px",
                    color: C.orange,
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 9,
                    letterSpacing: 1,
                  }}
                >
                  ECC 6.0
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px 10px",
                    color: C.green,
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 9,
                    letterSpacing: 1,
                  }}
                >
                  BTP CLOUD
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Reports / Programs", "✓", "✓"],
                ["Classes / Interfaces", "✓", "✓"],
                ["Function Modules", "✓", "✗"],
                ["BAPIs", "✓", "✗"],
                ["CDS Views", "✓ (≥7.40)", "✓"],
                ["RAP (BDEF/Svc)", "✗", "✓"],
                ["BADIs", "✓", "✓"],
                ["Data Elements / Domains", "✓", "✓"],
                ["Tables / Structures", "✓", "✓"],
              ].map(([obj, ecc, btp], i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: "5px 10px",
                      color: C.bright,
                      fontFamily: F.sans,
                      fontSize: 12,
                    }}
                  >
                    {obj}
                  </td>
                  <td
                    style={{
                      padding: "5px 10px",
                      textAlign: "center",
                      color: ecc.includes("✓") ? C.green : C.red,
                    }}
                  >
                    {ecc}
                  </td>
                  <td
                    style={{
                      padding: "5px 10px",
                      textAlign: "center",
                      color: btp.includes("✓") ? C.green : C.red,
                    }}
                  >
                    {btp}
                  </td>
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
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.blue }}>
              ☁ Zur Cloud
            </span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {[
              "System-Metadaten (Namen, Typen)",
              "AI Prompts & Responses",
              "Code Diffs (nicht volle Source)",
              "Pipeline Status",
              "Audit Trail",
            ].map((d, i) => (
              <div
                key={i}
                style={{ fontFamily: F.mono, fontSize: 10, color: C.green, lineHeight: 1.8 }}
              >
                ✓ {d}
              </div>
            ))}
          </div>
        </Box>
        <Box style={{ flex: 1, minWidth: 240, borderLeft: `3px solid ${C.orange}` }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.orange }}>
              ⬡ Bleibt beim Kunden
            </span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {[
              "SAP Credentials & Tokens",
              "Vollständiger Quellcode",
              "Geschäftsdaten",
              "Transport Requests",
              "AI Core Verbindung",
            ].map((d, i) => (
              <div
                key={i}
                style={{ fontFamily: F.mono, fontSize: 10, color: C.orange, lineHeight: 1.8 }}
              >
                ⬡ {d}
              </div>
            ))}
          </div>
        </Box>
        <Box style={{ flex: 1, minWidth: 240, borderLeft: `3px solid ${C.red}` }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, color: C.red }}>
              ✗ Geht NIE zur Cloud
            </span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {[
              "SAP Passwörter / JWT Tokens",
              "Vollständige Source Files",
              "Tabelleninhalte",
              "Produktivdaten",
              "Kunden-AI-Core Keys",
            ].map((d, i) => (
              <div
                key={i}
                style={{ fontFamily: F.mono, fontSize: 10, color: C.red, lineHeight: 1.8 }}
              >
                ✗ {d}
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
}
