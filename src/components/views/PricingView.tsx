"use client";

import { C, F } from "@/lib/theme";
import { Badge, Box, Lbl } from "@/components/ui";

const plans = [
  {
    name: "Starter",
    price: "€499",
    sub: "/Monat",
    color: C.blue,
    features: [
      "1 SAP System",
      "3 Entwickler",
      "Cloud AI (Claude/GPT)",
      "Basic Review Workflow",
      "5.000 AI Generations/mo",
      "Community Support",
    ],
  },
  {
    name: "Professional",
    price: "€1.499",
    sub: "/Monat",
    color: C.green,
    badge: "POPULAR",
    features: [
      "5 SAP Systeme (ECC + BTP)",
      "15 Entwickler",
      "Cloud AI + Kunden AI Core",
      "Full Review + Pipeline",
      "25.000 AI Generations/mo",
      "Git Integration",
      "Priority Support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "",
    color: C.purple,
    features: [
      "Unlimited Systeme",
      "Unlimited Entwickler",
      "Air-Gapped (nur Client AI)",
      "Custom Workflows + SSO",
      "On-Premise Cloud Option",
      "SLA + Dedicated Support",
      "SOC 2 Compliance",
    ],
  },
];

export default function PricingView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Lbl>Pricing</Lbl>
        <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright }}>
          Pricing Tiers
        </h2>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {plans.map((p, i) => (
          <Box key={i} style={{ flex: "1 1 200px", borderTop: `3px solid ${p.color}` }}>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: F.sans, fontSize: 16, fontWeight: 700, color: p.color }}>
                  {p.name}
                </span>
                {p.badge && (
                  <Badge color={p.color} filled>
                    {p.badge}
                  </Badge>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.bright }}>
                  {p.price}
                </span>
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
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: r.color }}>
                  {r.pct}%
                </span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: 6,
                    width: `${r.pct}%`,
                    background: r.color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
