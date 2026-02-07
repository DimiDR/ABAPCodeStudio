"use client";

import { useState } from "react";
import { C, F } from "@/lib/theme";
import { Header, Sidebar, StatusBar } from "@/components/layout";
import {
  ChatView,
  ExplorerView,
  DiffView,
  GitView,
  PipelineView,
  DocArchView,
  DocConnectView,
  DocHostingView,
  PricingView,
  SecurityView,
} from "@/components/views";

const views: Record<string, React.ComponentType> = {
  chat: ChatView,
  explorer: ExplorerView,
  diff: DiffView,
  git: GitView,
  pipeline: PipelineView,
  "doc-arch": DocArchView,
  "doc-connect": DocConnectView,
  "doc-hosting": DocHostingView,
  pricing: PricingView,
  security: SecurityView,
};

export default function Home() {
  const [active, setActive] = useState("chat");
  const [collapsed, setCollapsed] = useState(false);

  const ActiveView = views[active];

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.text,
        fontFamily: F.sans,
        overflow: "hidden",
      }}
    >
      <Header />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          active={active}
          collapsed={collapsed}
          onNavigate={setActive}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />

        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ActiveView />
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
