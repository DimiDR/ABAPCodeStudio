export interface NavItem {
  id: string;
  icon: string;
  label: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    section: "WORKSPACE",
    items: [
      { id: "chat", icon: "\u{1F4AC}", label: "AI Chat" },
      { id: "explorer", icon: "\u{1F4C2}", label: "SAP Explorer" },
      { id: "diff", icon: "\u00B1", label: "Code Diff" },
      { id: "git", icon: "\u2442", label: "Git History" },
      { id: "pipeline", icon: "\u25B6", label: "Pipeline" },
    ],
  },
  {
    section: "DOCUMENTATION",
    items: [
      { id: "doc-arch", icon: "\u25CE", label: "Architecture" },
      { id: "doc-connect", icon: "\u{1F50C}", label: "How to Connect" },
      { id: "doc-hosting", icon: "\u2601", label: "Hosting Guide" },
    ],
  },
  {
    section: "BUSINESS",
    items: [
      { id: "pricing", icon: "\u20AC", label: "Pricing" },
      { id: "security", icon: "\u{1F512}", label: "Security" },
    ],
  },
];
