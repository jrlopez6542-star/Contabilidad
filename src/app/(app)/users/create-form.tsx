"use client";

import { useState } from "react";
import { createUserAction } from "@/actions/users";
import { Button, Input, Select } from "@/components/ui";

export function UserCreateForm() {
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

  return (
    <form id="create-user-form" action={onSubmit} className="space-y-3">
      <Input label="Nombre" name="name" required />
      <Input label="Correo" name="email" type="email" required />
      <Select label="Rol" name="role" defaultValue="vendedor" required>
        <option value="admin">Administrador</option>
        <option value="vendedor">Vendedor</option>
        <option value="contador">Contador</option>
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit">Crear usuario</Button>
    </form>
  );
}
