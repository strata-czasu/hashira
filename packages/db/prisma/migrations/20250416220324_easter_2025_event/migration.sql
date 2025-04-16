-- CreateTable
CREATE TABLE "Easter2025Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "statusChannelId" TEXT NOT NULL,
    "color" INTEGER NOT NULL,
    "statusLastMessageId" TEXT,

    CONSTRAINT "Easter2025Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Easter2025TeamMember" (
    "teamId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Easter2025TeamMember_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Easter2025Stage" (
    "neededPoints" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "teamId" INTEGER NOT NULL,
    "linkedImageUrl" TEXT NOT NULL,

    CONSTRAINT "Easter2025Stage_pkey" PRIMARY KEY ("teamId","neededPoints")
);

-- CreateTable
CREATE TABLE "Easter2025DisabledChannels" (
    "channelId" TEXT NOT NULL,

    CONSTRAINT "Easter2025DisabledChannels_pkey" PRIMARY KEY ("channelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Easter2025Team_name_key" ON "Easter2025Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Easter2025Team_roleId_key" ON "Easter2025Team"("roleId");

-- AddForeignKey
ALTER TABLE "Easter2025TeamMember" ADD CONSTRAINT "Easter2025TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2025TeamMember" ADD CONSTRAINT "Easter2025TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Easter2025Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Easter2025Stage" ADD CONSTRAINT "Easter2025Stage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Easter2025Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
