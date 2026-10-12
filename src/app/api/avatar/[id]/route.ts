import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Foto de perfil de un miembro. Solo la ven los miembros activos de su misma familia. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const avatar = await prisma.userAvatar.findFirst({ where: { userId: id, user: { familyId: user.familyId, status: "ACTIVE" } } });
  if (!avatar) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mime,
      // La URL lleva ?v=<fecha de subida>: al cambiar la foto cambia la URL, así que se puede cachear un día
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
