-- CreateTable
CREATE TABLE "LastFishing" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LastFishing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LastFishing" ADD CONSTRAINT "LastFishing_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastFishing" ADD CONSTRAINT "LastFishing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
