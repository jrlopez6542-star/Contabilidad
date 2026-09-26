import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import {
  ROLE_LABELS,
  assignableRoles,
  canManageTargetRole,
  canUsePin,
  isRole,
  type Role,
} from "@/lib/roles";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { UserCreateForm } from "./create-form";
import { UserEditForm } from "./edit-form";

export default async function UsersPage() {
  const session = await requirePermission("users:manage");
  const rolesForActor = assignableRoles(session.role);
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      pinHash: true,
      pinLockedAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Solo el superusuario puede crear y editar cuentas. Si el correo ya existe, edite el usuario en lugar de crearlo de nuevo."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">Nuevo usuario</h2>
          <UserCreateForm assignableRoles={rolesForActor} />
        </Card>
        <div className="lg:col-span-2 space-y-4">
          {users.length === 0 ? (
            <EmptyState message="No hay usuarios." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Correo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {ROLE_LABELS[u.role as Role] || u.role}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          u.active
                            ? "bg-brand-100 text-brand"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {u.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {users.map((u) => {
            const targetRole = isRole(u.role) ? u.role : ("vendedor" as Role);
            return (
              <Card key={`edit-${u.id}`}>
                <h3 className="mb-3 text-sm font-semibold">
                  Editar: {u.name}
                </h3>
                <UserEditForm
                  user={{
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: targetRole,
                    active: u.active,
                  }}
                  pin={
                    canUsePin(u.role)
                      ? {
                          hasPin: !!u.pinHash,
                          locked: !!u.pinLockedAt,
                        }
                      : null
                  }
                  assignableRoles={rolesForActor}
                  canManage={
                    isRole(u.role) &&
                    canManageTargetRole(session.role, u.role)
                  }
                />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
