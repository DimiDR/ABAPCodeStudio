"use client";

import { useState } from "react";
import { C, F } from "@/lib/theme";
import { Badge, Dot } from "@/components/ui";

interface Message {
  role: "system" | "user" | "assistant";
  text: string;
  thinking?: string[];
}

export default function ChatView() {
  const [msgs] = useState<Message[]>([
    {
      role: "system",
      text: "ABAP Code Studio v1.0 bereit. Verbunden mit ECC Prod + BTP Dev.",
    },
    {
      role: "user",
      text: "Füge ein Feld MARGIN zum CDS View Z_SALES hinzu",
    },
    {
      role: "assistant",
      thinking: [
        "sap_search → Z_SALES gefunden (DDLS, Paket Z_SD)",
        "sap_read → CDS View Source geladen (42 Zeilen)",
        "sap_read → Basis-Tabelle ZSALES_DATA analysiert",
        "ai_generate → SAP-ABAP-1 Model, Confidence: 0.94",
      ],
      text: "Ich habe den CDS View `Z_SALES` analysiert und ein neues kalkuliertes Feld `Margin` hinzugefügt:\n\n```sql\n@EndUserText.label: 'Margin'\nkey SalesOrder,\n    Revenue,\n    Cost,\n    Revenue - Cost as Margin\n```\n\nÄnderungen:\n• Z_SALES (CDS View) — 1 Feld hinzugefügt\n• ZCL_SALES_CALC — neue Methode CALC_MARGIN\n\nTransport: DEVK900123 | Git: feature/ai-margin-field\nBereit für Review → Code Diff Tab",
    },
  ]);
  const [input, setInput] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Chat messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              ...(m.role === "system" ? { justifyContent: "center" } : {}),
            }}
          >
            {m.role === "system" ? (
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.dim,
                  padding: "6px 14px",
                  background: C.surface,
                  borderRadius: 20,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Dot color={C.green} size={5} /> {m.text}
              </div>
            ) : m.role === "user" ? (
              <div style={{ marginLeft: "auto", maxWidth: "70%" }}>
                <div
                  style={{
                    background: C.blue + "18",
                    border: `1px solid ${C.blue}25`,
                    borderRadius: "14px 14px 4px 14px",
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 13,
                      color: C.bright,
                      lineHeight: 1.6,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 9,
                    color: C.dim,
                    textAlign: "right",
                    marginTop: 3,
                  }}
                >
                  Du · gerade eben
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: "80%" }}>
                {m.thinking && (
                  <div
                    style={{
                      marginBottom: 8,
                      padding: "8px 10px",
                      background: C.bg2,
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: F.mono,
                        fontSize: 9,
                        color: C.dim,
                        letterSpacing: 1,
                        marginBottom: 4,
                      }}
                    >
                      AI THINKING
                    </div>
                    {m.thinking.map((t, ti) => (
                      <div
                        key={ti}
                        style={{
                          fontFamily: F.mono,
                          fontSize: 10,
                          color: C.teal,
                          lineHeight: 1.8,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <span style={{ color: C.dim }}>→</span> {t}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "4px 14px 14px 14px",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 13,
                      color: C.text,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 9,
                    color: C.dim,
                    marginTop: 3,
                  }}
                >
                  Claude · SAP-ABAP-1 + Claude Opus
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div
        style={{ padding: "6px 20px", display: "flex", gap: 6, flexWrap: "wrap" }}
      >
        {[
          "Analyse Objekt",
          "Generiere RAP Stack",
          "Syntax Check",
          "ATC ausführen",
          "Transport erstellen",
        ].map((a, i) => (
          <button
            key={i}
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              padding: "4px 10px",
              background: C.surfaceAlt,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.text,
              cursor: "pointer",
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 20px 14px",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreibe deine Anforderung..."
            style={{
              flex: 1,
              fontFamily: F.sans,
              fontSize: 13,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.bright,
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <Badge color={C.orange}>ECC</Badge>
            <Badge color={C.green}>BTP</Badge>
          </div>
          <button
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              padding: "5px 14px",
              background: C.green,
              border: "none",
              borderRadius: 5,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
