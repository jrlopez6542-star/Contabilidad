"use client";

import { useState } from "react";
import { createUserAction } from "@/actions/users";
import { Button, Input, Select } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export function UserCreateForm({
  assignableRoles,
}: {
  assignableRoles: Role[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const formData = new FormData(form);
      const res = await createUserAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setMsg("Usuario creado.");
      form.reset();
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo crear el usuario. Si ya existe ese correo, edítelo abajo o use otro."
      );
    } finally {
      setPending(false);
    }
  }

  const defaultRole = assignableRoles.includes("vendedor")
    ? "vendedor"
    : assignableRoles[0];

  if (assignableRoles.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-brand-100">
        Su rol no puede crear usuarios. Inicie sesión como superusuario
        (Jhonathan) para gestionar cuentas.
      </p>
    );
  }

  return (
    <form id="create-user-form" onSubmit={onSubmit} className="space-y-3">
      <Input label="Nombre" name="name" required />
      <Input
        label="Correo"
        name="email"
        type="email"
        required
        autoComplete="off"
      />
      <Select label="Rol" name="role" defaultValue={defaultRole} required>
        {assignableRoles.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <PasswordInput
        label="Contraseña"
        name="password"
        required
        minLength={6}
        autoComplete="new-password"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-brand-100">
        <input type="checkbox" name="active" value="true" defaultChecked />
        Activo
      </label>
      {error && (
        <p className="rounded-lg bg-jam-50 px-3 py-2 text-sm text-jam">{error}</p>
      )}
      {msg && <p className="text-sm text-brand">{msg}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}
