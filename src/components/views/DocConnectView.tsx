"use client";

import { C, F } from "@/lib/theme";
import { Badge, Box, Lbl } from "@/components/ui";

interface SystemConfig {
  name: string;
  color: string;
  icon: string;
  method: string;
  steps: { title: string; desc: string; visual: string }[];
  config: string;
}

const systems: SystemConfig[] = [
  {
    name: "SAP ECC 6.0",
    color: C.orange,
    icon: "◆",
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
      ashost: 10.0.1.50`,
  },
  {
    name: "BTP ABAP Cloud",
    color: C.green,
    icon: "◇",
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
      principal_propagation: true`,
  },
  {
    name: "SAP AI Core",
    color: C.teal,
    icon: "🧠",
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
    quick_tasks: claude-sonnet-4-5`,
  },
  {
    name: "Git Repository",
    color: C.purple,
    icon: "⑂",
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
    btp: gcts`,
  },
];

export default function DocConnectView() {
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 24px" }}>
      <Lbl>How-To Guide</Lbl>
      <h2 style={{ fontFamily: F.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: "0 0 6px" }}>
        Systeme verbinden
      </h2>
      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.dim, marginBottom: 20 }}>
        Schritt-für-Schritt Anleitung für jede System-Anbindung
      </p>

      {systems.map((sys, si) => (
        <Box key={si} style={{ marginBottom: 16, borderLeft: `3px solid ${sys.color}` }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>{sys.icon}</span>
            <span style={{ fontFamily: F.sans, fontSize: 15, fontWeight: 700, color: sys.color }}>
              {sys.name}
            </span>
            <Badge color={sys.color}>{sys.method}</Badge>
          </div>

          {/* Steps as visual flow */}
          <div style={{ padding: "12px 14px" }}>
            {sys.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: sys.color + "20",
                      border: `1.5px solid ${sys.color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: F.mono,
                      fontSize: 10,
                      fontWeight: 700,
                      color: sys.color,
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < sys.steps.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: sys.color + "20",
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.bright }}>
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 12,
                      color: C.text,
                      lineHeight: 1.6,
                      marginTop: 2,
                    }}
                  >
                    {step.desc}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: F.mono,
                      fontSize: 10,
                      color: sys.color,
                      padding: "5px 10px",
                      background: C.bg,
                      borderRadius: 4,
                      border: `1px solid ${sys.color}15`,
                      display: "inline-block",
                    }}
                  >
                    {step.visual}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Config snippet */}
          <div style={{ padding: "0 14px 12px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.dim, marginBottom: 4 }}>
              KONFIGURATION
            </div>
            <pre
              style={{
                fontFamily: F.mono,
                fontSize: 10,
                color: C.text,
                lineHeight: 1.7,
                margin: 0,
                padding: "10px 12px",
                background: C.bg,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {sys.config}
            </pre>
          </div>
        </Box>
      ))}
    </div>
  );
}
