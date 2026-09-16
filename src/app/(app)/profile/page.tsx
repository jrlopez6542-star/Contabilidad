import { requireSession } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ProfileForm } from "./form";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <div>
      <PageHeader
        title="Mi perfil"
        subtitle="Actualice su nombre, correo y contraseña"
      />
      <Card className="max-w-xl">
        <ProfileForm
          name={session.name}
          email={session.email}
          role={session.role}
        />
      </Card>
    </div>
  );
}
