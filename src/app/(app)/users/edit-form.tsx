"use client";

import { useState } from "react";
import {
  activateUserAction,
  deactivateUserAction,
  setUserPasswordAction,
  updateUserAction,
} from "@/actions/users";
import { Button, Input, Select } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { ROLE_LABELS, type Role } from "@/lib/roles";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export function UserEditForm({
  user,
  assignableRoles,
  canManage,
}: {
  user: User;
  assignableRoles: Role[];
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-slate-600">
        Solo un superusuario puede editar esta cuenta.
      </p>
    );
  }

  // Ensure current role appears even if somehow missing from list (defensive)
  const roleOptions = assignableRoles.includes(user.role)
    ? assignableRoles
    : [user.role, ...assignableRoles];

  async function onUpdate(formData: FormData) {
    setError(null);
    setMsg(null);
    formData.set("id", user.id);
    const res = await updateUserAction(formData);
    if (res?.error) setError(res.error);
    else setMsg("Usuario actualizado.");
  }

  async function onPassword(formData: FormData) {
    setError(null);
    setMsg(null);
    formData.set("id", user.id);
    const res = await setUserPasswordAction(formData);
    if (res?.error) setError(res.error);
    else setMsg("Contraseña actualizada.");
  }

  return (
    <div className="space-y-4">
      <form action={onUpdate} className="grid gap-3 sm:grid-cols-2">
        <Input label="Nombre" name="name" required defaultValue={user.name} />
        <Input
          label="Correo"
          name="email"
          type="email"
          required
          defaultValue={user.email}
        />
        <Select label="Rol" name="role" defaultValue={user.role} required>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={user.active}
          />
          Activo
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>

      <form action={onPassword} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <PasswordInput
            label="Nueva contraseña"
            name="password"
            required
            minLength={6}
          />
        </div>
        <Button type="submit" variant="secondary">
          Restablecer contraseña
        </Button>
      </form>

      <div className="flex gap-2">
        {user.active ? (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              setError(null);
              setMsg(null);
              const res = await deactivateUserAction(user.id);
              if (res?.error) setError(res.error);
              else setMsg("Usuario desactivado.");
            }}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              setError(null);
              setMsg(null);
              const res = await activateUserAction(user.id);
              if (res?.error) setError(res.error);
              else setMsg("Usuario reactivado.");
            }}
          >
            Reactivar
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-jam">{error}</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
    </div>
  );
}
