-- CreateTable
CREATE TABLE "Birthday2026Config" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventStartAt" TIMESTAMP(6) NOT NULL,
    "eventEndAt" TIMESTAMP(6) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Birthday2026Config_pkey" PRIMARY KEY ("id"),
    -- Manually added: Prisma schema does not express this cross-column check.
    CONSTRAINT "Birthday2026Config_event_window_valid" CHECK ("eventEndAt" > "eventStartAt"),
    -- Manually added: reject empty or whitespace-only IANA timezone values.
    CONSTRAINT "Birthday2026Config_timezone_nonempty" CHECK (length(trim("timezone")) > 0)
);

-- CreateTable
CREATE TABLE "Birthday2026TeamConfig" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "captainUserId" TEXT,

    CONSTRAINT "Birthday2026TeamConfig_pkey" PRIMARY KEY ("id"),
    -- Manually added: constrain Discord colors to the 24-bit RGB range.
    CONSTRAINT "Birthday2026TeamConfig_color_valid" CHECK ("color" BETWEEN 0 AND 16777215)
);

-- CreateTable
CREATE TABLE "Birthday2026MemberState" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "teamConfigId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Birthday2026MemberState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026Config_guildId_key" ON "Birthday2026Config"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamConfig_teamId_key" ON "Birthday2026TeamConfig"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamConfig_roleId_key" ON "Birthday2026TeamConfig"("roleId");

-- CreateIndex
CREATE INDEX "Birthday2026TeamConfig_configId_idx" ON "Birthday2026TeamConfig"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamConfig_id_configId_key" ON "Birthday2026TeamConfig"("id", "configId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026TeamConfig_configId_captainUserId_key" ON "Birthday2026TeamConfig"("configId", "captainUserId");

-- CreateIndex
CREATE INDEX "Birthday2026MemberState_teamConfigId_configId_idx" ON "Birthday2026MemberState"("teamConfigId", "configId");

-- CreateIndex
CREATE INDEX "Birthday2026MemberState_userId_idx" ON "Birthday2026MemberState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Birthday2026MemberState_configId_userId_key" ON "Birthday2026MemberState"("configId", "userId");

-- AddForeignKey
ALTER TABLE "Birthday2026Config" ADD CONSTRAINT "Birthday2026Config_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamConfig" ADD CONSTRAINT "Birthday2026TeamConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Birthday2026Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamConfig" ADD CONSTRAINT "Birthday2026TeamConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026TeamConfig" ADD CONSTRAINT "Birthday2026TeamConfig_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026MemberState" ADD CONSTRAINT "Birthday2026MemberState_teamConfigId_configId_fkey" FOREIGN KEY ("teamConfigId", "configId") REFERENCES "Birthday2026TeamConfig"("id", "configId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Birthday2026MemberState" ADD CONSTRAINT "Birthday2026MemberState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
