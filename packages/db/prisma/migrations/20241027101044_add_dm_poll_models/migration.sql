-- CreateTable
CREATE TABLE "DmPoll" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "DmPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmPollOption" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "option" TEXT NOT NULL,

    CONSTRAINT "DmPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmPollParticipant" (
    "pollId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT,

    CONSTRAINT "DmPollParticipant_pkey" PRIMARY KEY ("pollId","userId")
);

-- CreateTable
CREATE TABLE "DmPollVote" (
    "userId" TEXT NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "DmPollVote_pkey" PRIMARY KEY ("userId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DmPollParticipant_pollId_userId_key" ON "DmPollParticipant"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DmPollVote_userId_optionId_key" ON "DmPollVote"("userId", "optionId");

-- AddForeignKey
ALTER TABLE "DmPoll" ADD CONSTRAINT "DmPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollOption" ADD CONSTRAINT "DmPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DmPoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollParticipant" ADD CONSTRAINT "DmPollParticipant_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "DmPoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollParticipant" ADD CONSTRAINT "DmPollParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollVote" ADD CONSTRAINT "DmPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmPollVote" ADD CONSTRAINT "DmPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "DmPollOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
