const mentionRegex = /^<@!?(\d{17,20})>$/;
const idRegex = /^\d{17,20}$/;

const getFromIdOrMention = (idOrMention: string) => {
  const match = idOrMention.match(mentionRegex);
  if (match) return match[1] ?? null;
  return idRegex.test(idOrMention) ? idOrMention : null;
};

export const parseUserMentions = (content: string) =>
  content
    .replaceAll("<", " <")
    .split(/\s+/)
    .map(getFromIdOrMention)
    .filter((id): id is string => !!id);
