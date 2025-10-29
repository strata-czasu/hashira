import { Hashira } from "@hashira/core";
import { VerificationStatus } from "@hashira/db";
import { MessageQueue, PrismaMessageQueuePersistence } from "@hashira/yotei";
import { sleep } from "bun";
import { type Duration, formatDuration } from "date-fns";
import {
  type ActionRow,
  ActionRowBuilder,
  type ButtonBuilder,
  type ButtonComponent,
  type Client,
  ContainerBuilder,
  type ContainerComponent,
  DiscordjsErrorCodes,
  inlineCode,
  MessageFlags,
  type PublicThreadChannel,
  RESTJSONErrorCodes,
  TextDisplayBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import { database } from "./db";
import type { TurnSnapshot } from "./events/halloween2025/combatLog";
import { PrismaCombatRepository } from "./events/halloween2025/combatRepository";
import { CombatService } from "./events/halloween2025/combatService";
import { endGiveaway } from "./giveaway/util";
import { loggingBase } from "./logging/base";
import { composeChannelRestrictionRestoreMessage } from "./moderation/accessUtil";
import {
  formatBanReason,
  formatUserWithId,
  sendVerificationFailedMessage,
} from "./moderation/util";
import { STRATA_CZASU } from "./specializedConstants";
import { discordTry } from "./util/discordTry";
import { fetchGuildMember } from "./util/fetchGuildMember";
import { sendDirectMessage } from "./util/sendDirectMessage";

// TODO: how to enable migrations of this data?
type MuteEndData = {
  muteId: number;
  guildId: string;
  userId: string;
};

// TODO: how to enable migrations of this data?
type VerificationEndData = {
  verificationId: number;
};

// TODO: how to enable migrations of this data?
type VerificationReminderData = {
  verificationId: number;
  elapsed: Duration;
  remaining: Duration;
};

type UltimatumEndData = {
  userId: string;
  guildId: string;
};

type ReminderData = {
  userId: string;
  guildId: string;
  text: string;
};

type GiveawayData = {
  giveawayId: number;
};

type ChannelRestrictionEndData = {
  restrictionId: number;
};

type ModeratorLeaveStartData = {
  leaveId: number;
  userId: string;
  guildId: string;
};

type ModeratorLeaveEndData = {
  leaveId: number;
  userId: string;
  guildId: string;
};
type Halloween2025EndSpawnData = {
  spawnId: number;
};

const createTurnDisplayComponent = (turnSnapshot: TurnSnapshot) => {
  const combatantHpLines = turnSnapshot.combatants.map(
    (combatant) => `- **${combatant.name}**: ${combatant.hp}/${combatant.maxHp} HP`,
  );

  const turnHeader = `## Tura ${turnSnapshot.turnNumber}`;
  const hpStatus = combatantHpLines.join("\n");
  const events = turnSnapshot.events
    .map((event) =>
      event.type === "turn_start" ? `\n${event.message}` : event.message,
    )
    .join("\n");

  return new ContainerBuilder().addTextDisplayComponents((td) =>
    td.setContent(`${turnHeader}\n\n${hpStatus}\n\n${events}`),
  );
};

export const messageQueueBase = new Hashira({ name: "messageQueueBase" })
  .use(database)
  .use(loggingBase)
  .const((ctx) => {
    const prisma = ctx.prisma;
    return {
      ...ctx,
      messageQueue: new MessageQueue(new PrismaMessageQueuePersistence(ctx.prisma))
        .addArg<"client", Client>()
        .addHandler(
          "ultimatumEnd",
          async ({ client }, { userId, guildId }: UltimatumEndData) => {
            const currentUltimatum = await prisma.ultimatum.findFirst({
              where: { userId, guildId, endedAt: null },
            });
            if (!currentUltimatum) return;

            const updatedUltimatum = await prisma.ultimatum.update({
              where: { id: currentUltimatum.id },
              data: { endedAt: new Date() },
            });

            const member = await fetchGuildMember(client, guildId, userId);
            if (!member) return;

            await member.roles.remove(STRATA_CZASU.ULTIMATUM_ROLE, "Koniec ultimatum");

            await sendDirectMessage(
              member.user,
              "Hej, to znowu ja! Twoje ultimatum dobiegło końca!",
            );

            ctx.strataCzasuLog.push("ultimatumEnd", member.guild, {
              user: member.user,
              createdAt: updatedUltimatum.createdAt,
              // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here because the ultimatum has just ended
              endedAt: updatedUltimatum.endedAt!,
              reason: updatedUltimatum.reason,
            });
          },
        )
        .addHandler(
          "muteEnd",
          async ({ client }, { muteId, guildId, userId }: MuteEndData) => {
            // Don't remove the mute role if the user has a verification in progress
            const verificationInProgress = await prisma.verification.findFirst({
              where: { userId, guildId, status: VerificationStatus.in_progress },
            });

            if (verificationInProgress) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId },
            });

            if (!settings || !settings.muteRoleId) return;
            const muteRoleId = settings.muteRoleId;

            const member = await fetchGuildMember(client, guildId, userId);
            if (!member) return;

            await discordTry(
              async () => {
                await member.roles.remove(muteRoleId, `Koniec wyciszenia [${muteId}]`);
              },
              [RESTJSONErrorCodes.MissingPermissions],
              async () => {
                console.warn(
                  `Missing permissions to remove mute role ${settings.muteRoleId} from member ${userId} on guild ${guildId}`,
                );
              },
            );

            // NOTE: We could mention the user on the server if sending the DM fails
            await sendDirectMessage(
              member.user,
              `To znowu ja ${userMention(
                member.id,
              )}. Dostałem informację, że Twoje wyciszenie dobiegło końca. Do zobaczenia na czatach!`,
            );
          },
        )
        .addHandler(
          "verificationEnd",
          async ({ client }, { verificationId }: VerificationEndData) => {
            const verification = await prisma.verification.findFirst({
              where: { id: verificationId },
            });
            if (!verification) return;

            const moderator = await discordTry(
              async () => client.users.fetch(verification.moderatorId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );
            if (!moderator) return;

            // Automatically reject the verification and ban the user
            const rejectedAt = new Date();

            await prisma.verification.update({
              where: { id: verificationId },
              data: { status: VerificationStatus.rejected, rejectedAt },
            });

            const user = await client.users.fetch(verification.userId);
            const guild = await client.guilds.fetch(verification.guildId);
            const sentMessage = await sendVerificationFailedMessage(user);
            const banned = await discordTry(
              async () => {
                const reason = formatBanReason(
                  `Nieudana weryfikacja 16+ [${verificationId}]`,
                  moderator,
                  rejectedAt,
                );
                await guild.bans.create(user, { reason });
                return true;
              },
              [RESTJSONErrorCodes.MissingPermissions],
              () => false,
            );

            // Notify the moderator about the verification end
            let directMessageContent = `Weryfikacja 16+ ${formatUserWithId(
              user,
            )} [${inlineCode(verificationId.toString())}] dobiegła końca.`;
            if (banned) {
              directMessageContent += " Użytkownik został zbanowany.";
            } else {
              directMessageContent +=
                " Nie udało się zbanować użytkownika. Sprawdź permisje i zbanuj go ręcznie.";
              console.warn(
                `Missing permissions to ban user ${user.id} (failed 16+ verification).`,
              );
            }
            if (!sentMessage) {
              directMessageContent +=
                " Nie udało się powiadomić użytkownika o nieudanej weryfikacji.";
            }
            await sendDirectMessage(moderator, directMessageContent);
          },
        )
        .addHandler(
          "verificationReminder",
          async (
            { client },
            { verificationId, elapsed, remaining }: VerificationReminderData,
          ) => {
            const verification = await prisma.verification.findFirst({
              where: { id: verificationId, status: VerificationStatus.in_progress },
            });

            if (!verification) return;

            const user = await discordTry(
              async () => client.users.fetch(verification.userId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );
            const moderator = await discordTry(
              async () => client.users.fetch(verification.moderatorId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );

            if (!moderator || !user) return;

            await sendDirectMessage(
              moderator,
              `Weryfikacja 16+ ${formatUserWithId(user)} [${inlineCode(
                verificationId.toString(),
              )}] trwa już ${formatDuration(
                elapsed,
              )}. Pozostało ${formatDuration(remaining)}. Nie zapomnij o niej!`,
            );
          },
        )
        .addHandler(
          "reminder",
          async ({ client }, { userId, guildId, text }: ReminderData) => {
            const member = await fetchGuildMember(client, guildId, userId);
            if (!member) return;

            await sendDirectMessage(member.user, text);
          },
        )
        .addHandler(
          "channelRestrictionEnd",
          async ({ client }, { restrictionId }: ChannelRestrictionEndData) => {
            const restriction = await prisma.channelRestriction.findFirst({
              where: { id: restrictionId, deletedAt: null },
            });

            if (!restriction) return;

            const guild = await discordTry(
              async () => client.guilds.fetch(restriction.guildId),
              [RESTJSONErrorCodes.UnknownGuild],
              async () => null,
            );

            if (!guild) return;

            const channel = await discordTry(
              async () => guild.channels.fetch(restriction.channelId),
              [RESTJSONErrorCodes.UnknownChannel],
              async () => null,
            );

            if (!channel) return;

            if (channel.isThread() || !channel.isTextBased()) {
              console.warn(
                `Channel restriction end for non-text channel or thread: ${restrictionId}`,
              );
              return;
            }

            const user = await discordTry(
              async () => client.users.fetch(restriction.userId),
              [RESTJSONErrorCodes.UnknownUser],
              async () => null,
            );

            await discordTry(
              () =>
                channel.permissionOverwrites.delete(
                  restriction.userId,
                  `Koniec blokady dostępu [${restrictionId}]`,
                ),
              [RESTJSONErrorCodes.MissingPermissions],
              async () => null,
            );

            await prisma.channelRestriction.update({
              where: { id: restrictionId },
              data: { deletedAt: new Date() },
            });

            if (user) {
              await sendDirectMessage(
                user,
                composeChannelRestrictionRestoreMessage(
                  user,
                  restriction.channelId,
                  null,
                ),
              );
            }
          },
        )
        .addHandler("giveawayEnd", async ({ client }, { giveawayId }: GiveawayData) => {
          const giveaway = await prisma.giveaway.findFirst({
            where: { id: giveawayId },
          });

          if (!giveaway) return;

          const guild = await discordTry(
            async () => client.guilds.fetch(giveaway.guildId),
            [RESTJSONErrorCodes.UnknownGuild],
            async () => null,
          );

          if (!guild) return;

          const channel = await discordTry(
            async () => guild.channels.fetch(giveaway.channelId),
            [RESTJSONErrorCodes.UnknownChannel],
            async () => null,
          );

          if (!channel?.isTextBased()) return;

          const message = await discordTry(
            async () => channel.messages.fetch(giveaway.messageId),
            [RESTJSONErrorCodes.UnknownChannel],
            async () => null,
          );

          if (!message) return;

          endGiveaway(message, prisma);
        })
        .addHandler(
          "moderatorLeaveStart",
          async ({ client }, { leaveId, userId, guildId }: ModeratorLeaveStartData) => {
            const leave = await prisma.moderatorLeave.findFirst({
              where: { id: leaveId, deletedAt: null },
            });
            if (!leave) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId },
            });

            const member = await fetchGuildMember(client, guildId, userId);
            if (!member) return;

            const moderatorLeaveRoleId = settings?.moderatorLeaveRoleId;
            if (leave.addRole && moderatorLeaveRoleId) {
              await discordTry(
                async () => {
                  await member.roles.add(
                    moderatorLeaveRoleId,
                    `Rozpoczęcie urlopu [${leaveId}]`,
                  );
                  return true;
                },
                [RESTJSONErrorCodes.MissingPermissions],
                async () => {
                  console.warn(
                    `Missing permissions to add moderator leave role ${moderatorLeaveRoleId} to member ${userId} in guild ${guildId}`,
                  );
                  return false;
                },
              );
            }

            await sendDirectMessage(
              member.user,
              `Hej, właśnie zaczął się Twój urlop! Skończy się ${time(leave.endsAt, TimestampStyles.RelativeTime)} (${time(leave.endsAt, TimestampStyles.ShortDateTime)}).`,
            );

            const moderatorLeaveManagerId = settings?.moderatorLeaveManagerId;
            if (moderatorLeaveManagerId) {
              const leaveManager = await fetchGuildMember(
                client,
                guildId,
                moderatorLeaveManagerId,
              );
              if (leaveManager) {
                await sendDirectMessage(
                  leaveManager,
                  `${userMention(member.id)} (${member.user.tag}) właśnie rozpoczął urlop do ${time(leave.endsAt, TimestampStyles.ShortDateTime)} (${time(leave.endsAt, TimestampStyles.RelativeTime)}).`,
                );
              }
            }
          },
        )
        .addHandler(
          "moderatorLeaveEnd",
          async ({ client }, { leaveId, userId, guildId }: ModeratorLeaveEndData) => {
            const leave = await prisma.moderatorLeave.findFirst({
              where: { id: leaveId },
            });
            if (!leave) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId },
            });

            const member = await fetchGuildMember(client, guildId, userId);
            if (!member) return;

            const moderatorLeaveRoleId = settings?.moderatorLeaveRoleId;
            if (leave.addRole && moderatorLeaveRoleId) {
              await discordTry(
                async () => {
                  await member.roles.remove(
                    moderatorLeaveRoleId,
                    `Koniec urlopu [${leaveId}]`,
                  );
                  return true;
                },
                [RESTJSONErrorCodes.MissingPermissions],
                async () => {
                  console.warn(
                    `Missing permissions to remove moderator leave role ${moderatorLeaveRoleId} from member ${userId} in guild ${guildId}`,
                  );
                  return false;
                },
              );
            }

            await sendDirectMessage(
              member.user,
              "Hej, właśnie skończył się Twój urlop!",
            );
          },
        )
        .addHandler(
          "halloween2025endSpawn",
          async ({ client }, { spawnId }: Halloween2025EndSpawnData) => {
            const spawn = await prisma.halloween2025MonsterSpawn.findUnique({
              where: { id: spawnId },
              select: {
                catchAttempts: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        Halloween2025Spawn: {
                          select: { guildId: true, monsterId: true },
                        },
                      },
                    },
                  },
                },
                guildId: true,
                channelId: true,
                messageId: true,
                expiresAt: true,
              },
            });

            if (!spawn) {
              console.warn(`Spawn not found for id ${spawnId}`);
              return;
            }

            const guild = await discordTry(
              () => client.guilds.fetch(spawn.guildId),
              [RESTJSONErrorCodes.UnknownGuild],
              () => null,
            );

            if (!guild) {
              console.warn(`Guild not found for id ${spawn.guildId}`);
              return;
            }

            const channel = await discordTry(
              () => guild.channels.fetch(spawn.channelId),
              [RESTJSONErrorCodes.UnknownChannel],
              () => null,
            );

            if (!channel?.isTextBased()) {
              console.warn(
                `Channel not found or not text-based for id ${spawn.channelId}`,
              );
              return;
            }

            const message = await discordTry(
              () => channel.messages.fetch(spawn.messageId),
              [RESTJSONErrorCodes.UnknownMessage],
              () => null,
            );

            if (!message) {
              console.warn(`Message not found for id ${spawn.messageId}`);
              return;
            }

            const container = message.components[0] as ContainerComponent;

            if (!container) {
              console.warn(`Container not found in message ${message.id}`);
              return;
            }

            const newContainer = new ContainerBuilder(
              container.toJSON(),
            ).spliceComponents(
              -1,
              1,
              new TextDisplayBuilder().setContent(
                `Polowanie zakończone o ${time(spawn.expiresAt, TimestampStyles.ShortTime)}`,
              ),
            );

            const actionRow = message.components[1] as ActionRow<ButtonComponent>;

            if (!actionRow) {
              console.warn(`Action row not found in message ${message.id}`);
              return;
            }

            const newActionRow = new ActionRowBuilder<ButtonBuilder>(
              actionRow.toJSON(),
            );
            newActionRow.components.at(0)?.setDisabled(true);

            await message.edit({ components: [newContainer, newActionRow] });

            const thread = await discordTry(
              () => message.startThread({ name: "Combat Log" }),
              [DiscordjsErrorCodes.MessageExistingThread],
              () => message.thread as PublicThreadChannel<false>,
            );

            const repository = new PrismaCombatRepository(prisma);
            const combatService = new CombatService(repository, Math.random);
            const userNameMap = new Map<string, string>([["monster", "Potwór"]]);
            for (const { user } of spawn.catchAttempts) {
              userNameMap.set(user.id, userMention(user.id));
            }

            const fight = await combatService.executeCombat(spawnId, 50, userNameMap);

            if (!fight) {
              await thread.send("Nie było uczestników, więc potwór uciekł.");
              return;
            }

            for (const turnSnapshot of fight.state.turnSnapshots) {
              const turnComponent = createTurnDisplayComponent(turnSnapshot);

              await thread.send({
                components: [turnComponent],
                flags: MessageFlags.IsComponentsV2,
              });

              await sleep(5000);
            }
          },
        ),
    };
  });
