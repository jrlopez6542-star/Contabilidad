"use client";

import { useState } from "react";
import {
  changeOwnPasswordAction,
  updateOwnProfileAction,
} from "@/actions/users";
import { Button, Input } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export function ProfileForm({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  async function onProfile(formData: FormData) {
    setProfileError(null);
    setProfileMsg(null);
    const res = await updateOwnProfileAction(formData);
    if (res?.error) setProfileError(res.error);
    else setProfileMsg("Perfil actualizado.");
  }

  async function onPassword(formData: FormData) {
    setPwdError(null);
    setPwdMsg(null);
    const res = await changeOwnPasswordAction(formData);
    if (res?.error) setPwdError(res.error);
    else {
      setPwdMsg("Contraseña actualizada.");
      (document.getElementById("password-form") as HTMLFormElement)?.reset();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Rol
        </p>
        <p className="text-sm text-slate-700">{ROLE_LABELS[role]}</p>
      </div>

      <form action={onProfile} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos personales</h2>
        <Input label="Nombre" name="name" required defaultValue={name} />
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          required
          defaultValue={email}
        />
        {profileError && <p className="text-sm text-jam">{profileError}</p>}
        {profileMsg && <p className="text-sm text-brand">{profileMsg}</p>}
        <Button type="submit">Guardar perfil</Button>
      </form>

      <form
        id="password-form"
        action={onPassword}
        className="space-y-4 border-t border-slate-200 pt-6"
      >
        <h2 className="text-sm font-semibold text-slate-900">Cambiar contraseña</h2>
        <Input
          label="Contraseña actual"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <Input
          label="Confirmar nueva contraseña"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
        {pwdError && <p className="text-sm text-jam">{pwdError}</p>}
        {pwdMsg && <p className="text-sm text-brand">{pwdMsg}</p>}
        <Button type="submit" variant="secondary">
          Actualizar contraseña
        </Button>
      </form>
    </div>
  );
}
