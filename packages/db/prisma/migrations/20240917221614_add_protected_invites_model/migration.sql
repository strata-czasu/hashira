-- CreateTable
CREATE TABLE "ProtectedInvite" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "ProtectedInvite_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProtectedInvite" ADD CONSTRAINT "ProtectedInvite_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
