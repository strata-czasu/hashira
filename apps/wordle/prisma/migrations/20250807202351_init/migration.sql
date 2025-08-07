-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'inProgress',
    "solution" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Guess" (
    "gameId" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "letters" TEXT NOT NULL,
    "correct" JSONB NOT NULL,
    "present" JSONB NOT NULL,
    "absent" JSONB NOT NULL,

    PRIMARY KEY ("gameId", "index"),
    CONSTRAINT "Guess_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AvailableWord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "guildId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "word" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AvailableWord_guildId_word_key" ON "AvailableWord"("guildId", "word");
