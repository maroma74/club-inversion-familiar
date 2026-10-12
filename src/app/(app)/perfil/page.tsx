import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/monthly";
import { firstName } from "@/lib/names";
import { PageHeader } from "@/components/ui";
import { AvatarForm } from "./AvatarForm";

export default async function PerfilPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader kicker="Club" title="Mi perfil" subtitle="Tu foto aparece junto a tu nombre en el menú, el ranking y las listas de miembros de tu familia." />

      <div className="card mb-6 max-w-3xl">
        <h2 className="font-semibold mb-3">Foto de perfil</h2>
        <AvatarForm id={user.id} name={user.name} updatedAt={user.avatarUpdatedAt ? user.avatarUpdatedAt.toISOString() : null} />
      </div>

      <div className="card max-w-3xl text-sm">
        <h2 className="font-semibold mb-2">Tu cuenta</h2>
        <dl className="grid gap-x-6 gap-y-1" style={{ gridTemplateColumns: "auto 1fr" }}>
          <dt className="text-neutral-700">Nombre</dt><dd className="m-0 font-medium">{firstName(user.name)}</dd>
          <dt className="text-neutral-700">Email</dt><dd className="m-0 font-medium break-all">{user.email}</dd>
          <dt className="text-neutral-700">Familia</dt><dd className="m-0 font-medium">{user.family.name}</dd>
          <dt className="text-neutral-700">Rol</dt><dd className="m-0 font-medium">{roleLabel(user.realRole)}</dd>
        </dl>
      </div>
    </>
  );
}
