"use client";

import { C, F } from "@/lib/theme";
import { NAV } from "@/lib/nav";

interface SidebarProps {
  active: string;
  collapsed: boolean;
  onNavigate: (id: string) => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  active,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <nav
      style={{
        width: collapsed ? 44 : 180,
        borderRight: `1px solid ${C.border}`,
        background: C.surface,
        overflowY: "auto",
        flexShrink: 0,
        transition: "width 0.2s",
      }}
    >
      <div style={{ padding: "8px 6px" }}>
        <button
          onClick={onToggleCollapse}
          style={{
            width: "100%",
            fontFamily: F.mono,
            fontSize: 10,
            padding: "4px 6px",
            background: "transparent",
            border: "none",
            color: C.dim,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </div>
      {NAV.map((section, si) => (
        <div key={si}>
          {!collapsed && (
            <div
              style={{
                padding: "8px 10px 4px",
                fontFamily: F.mono,
                fontSize: 8,
                letterSpacing: 2,
                color: C.dim,
              }}
            >
              {section.section}
            </div>
          )}
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: collapsed ? "7px 0" : "7px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                fontFamily: F.mono,
                fontSize: 11,
                border: "none",
                cursor: "pointer",
                background:
                  active === item.id ? C.green + "12" : "transparent",
                color: active === item.id ? C.greenBright : C.text,
                borderLeft:
                  active === item.id
                    ? `2px solid ${C.green}`
                    : "2px solid transparent",
                transition: "all 0.1s",
              }}
            >
              <span style={{ fontSize: 12, width: 18, textAlign: "center" }}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
