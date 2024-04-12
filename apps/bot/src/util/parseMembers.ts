const mentionRegex = /^<@!?(\d{15,20})>$/;
const idRegex = /^\d{15,20}$/;

const getFromIdOrMention = (idOrMention: string) => {
  const match = idOrMention.match(mentionRegex);
  if (match) return match[1] ?? null;
  return idRegex.test(idOrMention) ? idOrMention : null;
};

export const parseUserMentions = (content: string) =>
  content
    .split(/\s+/)
    .map(getFromIdOrMention)
    .filter((id): id is string => !!id);
