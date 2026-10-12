-- Foto de perfil de cada usuario
ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

CREATE TABLE "UserAvatar" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
