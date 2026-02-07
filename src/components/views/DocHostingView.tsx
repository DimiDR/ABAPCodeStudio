"use client";

import { C, F } from "@/lib/theme";
import { Box, Lbl } from "@/components/ui";

export default function DocHostingView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>Hosting Guide</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>
        Deployment & Hosting
      </h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>
        Wo und wie jede Komponente gehostet wird
      </p>

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
            <div
              key={i}
              style={{
                flex: "1 1 200px",
                padding: "12px",
                background: C.bg,
                borderRadius: 8,
                border: `1px solid ${c.color}18`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{c.icon}</span>
                <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: c.color }}>
                  {c.name}
                </span>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.text, lineHeight: 1.6 }}>
                {c.tech}
              </div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 9,
                  color: C.dim,
                  marginTop: 4,
                  padding: "3px 6px",
                  background: C.surface,
                  borderRadius: 3,
                  display: "inline-block",
                }}
              >
                {c.host}
              </div>
            </div>
          ))}
        </div>
      </Box>

      {/* Cloud hosting options */}
      <Lbl color={C.blue}>Cloud Backend Hosting Optionen</Lbl>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          {
            name: "AWS",
            color: C.orange,
            fit: "Bester Allrounder",
            services: [
              { n: "ECS/Fargate", d: "Backend Container" },
              { n: "RDS PostgreSQL", d: "Metadaten DB" },
              { n: "CloudFront + S3", d: "Frontend CDN" },
              { n: "API Gateway + ALB", d: "WebSocket + REST" },
              { n: "Secrets Manager", d: "Tenant Secrets" },
              { n: "CloudWatch", d: "Monitoring" },
            ],
            cost: "~$200-600/mo (Start)",
          },
          {
            name: "Azure",
            color: C.blue,
            fit: "SAP-Kunden oft auf Azure",
            services: [
              { n: "AKS", d: "Kubernetes Cluster" },
              { n: "Azure DB for PG", d: "Managed Postgres" },
              { n: "Front Door", d: "CDN + WAF" },
              { n: "App Service", d: "WebSocket Support" },
              { n: "Key Vault", d: "Secrets" },
              { n: "Application Insights", d: "Monitoring" },
            ],
            cost: "~$250-700/mo (Start)",
          },
          {
            name: "Hetzner + EU",
            color: C.green,
            fit: "DSGVO, günstig zum Start",
            services: [
              { n: "Dedicated/Cloud", d: "VPS oder Bare Metal" },
              { n: "PostgreSQL", d: "Self-managed" },
              { n: "Caddy / Traefik", d: "Reverse Proxy + TLS" },
              { n: "Docker Compose", d: "All-in-one" },
              { n: "Vault (self)", d: "HashiCorp Vault" },
              { n: "Grafana + Loki", d: "Monitoring" },
            ],
            cost: "~$50-150/mo (Start)",
          },
        ].map((h, i) => (
          <Box key={i} style={{ flex: "1 1 220px", borderTop: `3px solid ${h.color}` }}>
            <div
              style={{
                padding: "10px 12px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: h.color }}>
                {h.name}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: h.color }}>{h.fit}</span>
            </div>
            <div style={{ padding: "8px 12px" }}>
              {h.services.map((s, si) => (
                <div
                  key={si}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    borderBottom:
                      si < h.services.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.bright }}>{s.n}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.dim }}>{s.d}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: h.color }}>
                {h.cost}
              </div>
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
              {
                method: "Docker (empfohlen)",
                cmd: 'docker run -d --name abap-agent\n  -e CLOUD_URL=wss://api.abap-studio.de\n  -e AGENT_TOKEN=<token>\n  -v /opt/config:/config\n  abap-studio/agent:latest',
                color: C.blue,
              },
              {
                method: "Python Package",
                cmd: "pip install abap-studio-agent\nabap-studio-agent init --token <token>\nabap-studio-agent start",
                color: C.green,
              },
              {
                method: "Windows Service",
                cmd: "abap-studio-agent.exe install\n  --service\n  --token <token>\n# Für SAP GUI Scripting Support",
                color: C.orange,
              },
            ].map((d, i) => (
              <div key={i} style={{ flex: "1 1 200px" }}>
                <div style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: d.color, marginBottom: 6 }}>
                  {d.method}
                </div>
                <pre
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: C.text,
                    lineHeight: 1.7,
                    margin: 0,
                    padding: "10px",
                    background: C.bg,
                    borderRadius: 6,
                    border: `1px solid ${d.color}15`,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {d.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </Box>

      {/* DB Schema */}
      <Lbl color={C.yellow}>Datenbank Schema (nur Metadaten)</Lbl>
      <Box>
        <div style={{ padding: 14 }}>
          <pre
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.text,
              lineHeight: 1.7,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {`tenants          (id, name, plan, created_at)
sap_systems      (id, tenant_id, name, type, host_label, agent_id, last_seen)
abap_objects     (id, system_id, type, name, package, ai_generated, review_status)
ai_sessions      (id, tenant_id, prompt, model, confidence, objects_modified[])
audit_log        (id, tenant_id, action, object_ref, git_sha, transport_nr, ts)
users            (id, tenant_id, email, role, sso_id)`}
          </pre>
        </div>
      </Box>
    </div>
  );
}
