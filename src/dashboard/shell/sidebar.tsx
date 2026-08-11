/** OWNER: UI · Navigation. Order matches the demo flow. */
export const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/agents", label: "Agents" },
  { href: "/transactions", label: "Transactions" },
  { href: "/approvals", label: "Approvals" },
  { href: "/merchants", label: "Merchants" },
  { href: "/audit", label: "Audit log" },
  { href: "/simulator", label: "Simulator" },
];

export function Sidebar() {
  return <nav aria-label="Main">{/* TODO: render NAV */}</nav>;
}

