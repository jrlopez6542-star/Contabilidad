export const ROLES = ["admin", "vendedor", "contador"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  contador: "Contador",
};

export type Permission =
  | "users:manage"
  | "company:read"
  | "company:write"
  | "products:read"
  | "products:write"
  | "customers:read"
  | "customers:write"
  | "invoices:read"
  | "invoices:write"
  | "quotes:read"
  | "quotes:write"
  | "payments:read"
  | "payments:write"
  | "expenses:read"
  | "expenses:write"
  | "reports:read"
  | "backup:export"
  | "dashboard:read";

const ALL_PERMISSIONS: Permission[] = [
  "users:manage",
  "company:read",
  "company:write",
  "products:read",
  "products:write",
  "customers:read",
  "customers:write",
  "invoices:read",
  "invoices:write",
  "quotes:read",
  "quotes:write",
  "payments:read",
  "payments:write",
  "expenses:read",
  "expenses:write",
  "reports:read",
  "backup:export",
  "dashboard:read",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  vendedor: [
    "products:read",
    "customers:read",
    "customers:write",
    "invoices:read",
    "invoices:write",
    "quotes:read",
    "quotes:write",
    "payments:read",
    "payments:write",
    "dashboard:read",
  ],
  contador: [
    "company:read",
    "products:read",
    "customers:read",
    "invoices:read",
    "quotes:read",
    "payments:read",
    "payments:write",
    "expenses:read",
    "expenses:write",
    "reports:read",
    "dashboard:read",
  ],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Nav links filtered by role. "Mi perfil" is always included for any logged-in user. */
export function navLinksForRole(role: Role) {
  const links: { href: string; label: string; permission?: Permission }[] = [
    { href: "/dashboard", label: "Panel", permission: "dashboard:read" },
    { href: "/quotes", label: "Cotizaciones", permission: "quotes:read" },
    { href: "/invoices", label: "Facturas", permission: "invoices:read" },
    { href: "/payments", label: "Pagos", permission: "payments:read" },
    { href: "/customers", label: "Clientes", permission: "customers:read" },
    { href: "/products", label: "Productos", permission: "products:read" },
    { href: "/expenses", label: "Gastos", permission: "expenses:read" },
    { href: "/reports", label: "Reportes", permission: "reports:read" },
    { href: "/backup", label: "Respaldo", permission: "backup:export" },
    { href: "/company", label: "Empresa", permission: "company:read" },
    { href: "/users", label: "Usuarios", permission: "users:manage" },
    { href: "/profile", label: "Mi perfil" },
  ];
  return links.filter((l) => !l.permission || can(role, l.permission));
}

/** Map path prefixes to required permission for page access */
export function permissionForPath(pathname: string): Permission | null {
  if (pathname.startsWith("/users")) return "users:manage";
  if (pathname.startsWith("/company")) return "company:read";
  if (pathname.startsWith("/expenses")) return "expenses:read";
  if (pathname.startsWith("/products")) return "products:read";
  if (pathname.startsWith("/customers")) return "customers:read";
  if (pathname.startsWith("/quotes/new")) return "quotes:write";
  if (pathname.startsWith("/quotes")) return "quotes:read";
  if (pathname.startsWith("/invoices/new")) return "invoices:write";
  if (pathname.startsWith("/invoices")) return "invoices:read";
  if (pathname.startsWith("/payments")) return "payments:read";
  if (pathname.startsWith("/reports")) return "reports:read";
  if (pathname.startsWith("/backup")) return "backup:export";
  if (pathname.startsWith("/dashboard")) return "dashboard:read";
  // /profile: any authenticated user
  return null;
}
