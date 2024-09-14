import { Hashira } from "@hashira/core";
import { type GuildMember, type PartialGuildMember, userMention } from "discord.js";
import { STRATA_CZASU_GENDER_ROLES } from "./specializedConstants";
import { sendDirectMessage } from "./util/sendDirectMessage";

const addedRole = (
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  roleId: string,
) => !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId);

const formatMessage = (
  member: GuildMember,
  imageUrl: string,
) => `## Hej ${userMention(member.id)}!
Mamy nadzieję, że nigdy do tego nie dojdzie, ale jeżeli będziesz kiedyś świadkiem lub ofiarą jakiejś nieprzyjemnej sytuacji opisanej na bannerze poniżej, to **zgłoś ją proszę do nas poprzez ten formularz: <https://bit.ly/nieprzyjemne>**.

Nie tolerujemy takich obrzydliwych zachowań na Stracie Czasu[.](${imageUrl}) Nie jesteśmy jednak w stanie monitorować każdego kanału tekstowego i głosowego na Stracie Czasu, a tym bardziej DMów na których często tego typu sytuacje mają miejsce.`;

export const brochure = new Hashira({ name: "brochure" }).handle(
  "guildMemberUpdate",
  async (_, oldMember, newMember) => {
    if (addedRole(oldMember, newMember, STRATA_CZASU_GENDER_ROLES.female)) {
      const message = formatMessage(newMember, "https://i.imgur.com/qETLkML.png");
      await sendDirectMessage(newMember.user, message);
    } else if (addedRole(oldMember, newMember, STRATA_CZASU_GENDER_ROLES.male)) {
      const message = formatMessage(newMember, "https://i.imgur.com/h97Vub1.png");
      await sendDirectMessage(newMember.user, message);
    }
  },
);
