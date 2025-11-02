-- CreateTable
CREATE TABLE "public"."Halloween2025MonsterSpawnNotifications" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "spawnId" INTEGER NOT NULL,

    CONSTRAINT "Halloween2025MonsterSpawnNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025MonsterSpawnNotifications_messageId_key" ON "public"."Halloween2025MonsterSpawnNotifications"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Halloween2025MonsterSpawnNotifications_channelId_spawnId_key" ON "public"."Halloween2025MonsterSpawnNotifications"("channelId", "spawnId");

-- AddForeignKey
ALTER TABLE "public"."Halloween2025MonsterSpawnNotifications" ADD CONSTRAINT "Halloween2025MonsterSpawnNotifications_spawnId_fkey" FOREIGN KEY ("spawnId") REFERENCES "public"."Halloween2025MonsterSpawn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
