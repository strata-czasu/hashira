import { WORDLE_WORD_LENGTH } from "@/constants";
import { prisma } from "@/db";

const isProduction = process.env.NODE_ENV === "production";

const TESTING_GUILDS = [
  { guildId: "342022299957854220", ownerId: "195935967440404480" },
  { guildId: "1110671571384803350", ownerId: "503299438757019659" },
];

async function loadWordList(): Promise<string[]> {
  const wordsFile = Bun.file("words.json");
  const parsedWords = await wordsFile.json();
  if (
    !Array.isArray(parsedWords) ||
    !parsedWords.every((word) => typeof word === "string")
  ) {
    throw new Error("Invalid words.json format. Expected an array of strings.");
  }
  if (!parsedWords.every((word) => word.length === WORDLE_WORD_LENGTH)) {
    throw new Error(`All words must be exactly ${WORDLE_WORD_LENGTH} characters long.`);
  }
  return parsedWords;
}

async function createAvailableWords(guildId: string, ownerId: string) {
  const allWords = new Set(await loadWordList());
  const existingWords = await prisma.availableWord.findMany({
    where: { guildId },
    select: { word: true },
  });
  for (const { word } of existingWords) allWords.delete(word);

  const wordsToCreate = Array.from(allWords);
  const createdWords = await prisma.availableWord.createManyAndReturn({
    data: wordsToCreate.map((word) => ({ guildId, createdBy: ownerId, word })),
  });
  console.log(
    `Created ${createdWords.length} available words for guild ${guildId}. ${existingWords.length} already existed.`,
  );
}

if (!isProduction) {
  for (const { guildId, ownerId } of TESTING_GUILDS) {
    await createAvailableWords(guildId, ownerId);
  }
}

await prisma.$disconnect();
