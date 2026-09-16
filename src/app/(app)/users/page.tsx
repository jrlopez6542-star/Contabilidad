import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { UserCreateForm } from "./create-form";
import { UserEditForm } from "./edit-form";

export default async function UsersPage() {
  await requirePermission("users:manage");
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Administración de cuentas y roles (admin / vendedor / contador)"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">Nuevo usuario</h2>
          <UserCreateForm />
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
                            ? "bg-emerald-100 text-emerald-800"
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
          {users.map((u) => (
            <Card key={`edit-${u.id}`}>
              <h3 className="mb-3 text-sm font-semibold">
                Editar: {u.name}
              </h3>
              <UserEditForm
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role as Role,
                  active: u.active,
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
