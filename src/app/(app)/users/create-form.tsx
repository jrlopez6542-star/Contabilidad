"use client";

import { useState } from "react";
import { createUserAction } from "@/actions/users";
import { Button, Input, Select } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export function UserCreateForm({
  assignableRoles,
}: {
  assignableRoles: Role[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setMsg(null);
    const res = await createUserAction(formData);
    if (res?.error) setError(res.error);
    else {
      setMsg("Usuario creado.");
      (document.getElementById("create-user-form") as HTMLFormElement)?.reset();
    }
  }

  const defaultRole = assignableRoles.includes("vendedor")
    ? "vendedor"
    : assignableRoles[0];

  return (
    <form id="create-user-form" action={onSubmit} className="space-y-3">
      <Input label="Nombre" name="name" required />
      <Input label="Correo" name="email" type="email" required />
      <Select label="Rol" name="role" defaultValue={defaultRole} required>
        {assignableRoles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <Input
        label="Contraseña"
        name="password"
        type="password"
        required
        minLength={6}
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" value="true" defaultChecked />
        Activo
      </label>
      {error && <p className="text-sm text-jam">{error}</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
      <Button type="submit">Crear usuario</Button>
    </form>
  );
}
