import { WORDLE_WORD_LENGTH } from "@/constants";
import { prisma } from "@/db";
import env from "env";

const isProduction = process.env.NODE_ENV === "production";

const GUILDS = {
  StrataCzasu: { guildId: "211261411119202305", ownerId: "211260587038998528" },
  Piwnica: { guildId: "342022299957854220", ownerId: "195935967440404480" },
  Homik: { guildId: "1110671571384803350", ownerId: "503299438757019659" },
} as const;

async function loadWordList(): Promise<string[] | null> {
  const wordsFile = Bun.file(env.WORDLE_AVAILABLE_WORDS_FILE ?? "words.json");
  let parsedWords: string[];
  try {
    parsedWords = await wordsFile.json();
  } catch (error) {
    console.error("Failed to load words.json:", error);
    return null;
  }

  if (
    !Array.isArray(parsedWords) ||
    !parsedWords.every((word) => typeof word === "string")
  ) {
    throw new Error("Invalid wordlist format. Expected an array of strings.");
  }
  if (!parsedWords.every((word) => word.length === WORDLE_WORD_LENGTH)) {
    throw new Error(`All words must be exactly ${WORDLE_WORD_LENGTH} characters long.`);
  }

  return parsedWords;
}

async function createAvailableWords(guildId: string, ownerId: string) {
  const wordList = await loadWordList();
  if (wordList === null) {
    console.log(
      "No words found in the word list. Skipping creation of available words.",
    );
    return;
  }

  const allWords = new Set(wordList.map((w) => w.toLowerCase()));
  const existingWords = await prisma.availableWord.findMany({
    where: { guildId },
    select: { word: true },
  });
  for (const { word } of existingWords) allWords.delete(word);

  const wordsToCreate = Array.from(allWords);
  const createdWords = await prisma.availableWord.createManyAndReturn({
    data: wordsToCreate.map((word) => ({
      guildId,
      createdBy: ownerId,
      word: word.toLowerCase(),
    })),
  });
  console.log(
    `Created ${createdWords.length} available words for guild ${guildId}. ${existingWords.length} already existed.`,
  );
}

if (isProduction) {
  await createAvailableWords(GUILDS.StrataCzasu.guildId, GUILDS.StrataCzasu.ownerId);
} else {
  for (const { guildId, ownerId } of Object.values(GUILDS)) {
    await createAvailableWords(guildId, ownerId);
  }
}

await prisma.$disconnect();
