"use client";

import { C, F } from "@/lib/theme";
import { Box, Lbl } from "@/components/ui";

const sections = [
  {
    title: "Zero Trust für SAP-Daten",
    color: C.green,
    icon: "🛡",
    items: [
      "Cloud speichert keine SAP-Credentials",
      "Quellcode verlässt nie das Kundennetzwerk",
      "Agent-Token tenant-spezifisch & rotierbar",
      "TLS 1.3 + Certificate Pinning",
      "IP-Whitelist für Agent",
    ],
  },
  {
    title: "Tenant Isolation",
    color: C.blue,
    icon: "🏢",
    items: [
      "Strikte Datentrennung pro Tenant",
      "Kein Cross-Tenant Zugriff",
      "Tenant-Admin verwaltet User & Systeme",
      "Audit Log pro Tenant, exportierbar",
    ],
  },
  {
    title: "DSGVO / Compliance",
    color: C.purple,
    icon: "📋",
    items: [
      "Nur Usernamen + E-Mail gespeichert",
      "DPA (Data Processing Agreement) verfügbar",
      "Option B eliminiert PII-Transfer komplett",
      "EU Hosting (Hetzner/Azure Germany)",
      "SOC 2 Type II als Ziel",
    ],
  },
  {
    title: "SAP Authorization",
    color: C.orange,
    icon: "🔑",
    items: [
      "Agent respektiert S_DEVELOP, S_RFC",
      "Kein Bypass von SAP Auth Checks",
      "Transport-Release nur nach Review",
      "ATC Security Checks lokal im SAP",
      "AI-Code bekommt immer Review-Pflicht",
    ],
  },
];

export default function SecurityView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Security & Compliance</Lbl>
      <h2
        style={{
          fontFamily: F.sans,
          fontSize: 22,
          fontWeight: 700,
          color: C.bright,
          margin: "0 0 16px",
        }}
      >
        Sicherheitsarchitektur
      </h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {sections.map((s, i) => (
          <Box key={i} style={{ flex: "1 1 300px", borderLeft: `3px solid ${s.color}` }}>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{s.icon}</span>
              <span style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: s.color }}>
                {s.title}
              </span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {s.items.map((item, j) => (
                <div
                  key={j}
                  style={{
                    fontFamily: F.mono,
                    fontSize: 11,
                    color: C.text,
                    lineHeight: 1.9,
                    display: "flex",
                    gap: 6,
                  }}
                >
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
