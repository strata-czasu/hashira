/** @jsxImportSource @hashira/jsx */
import { addSeconds, type Duration } from "date-fns";
import {
  type APIContainerComponent,
  AttachmentBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  time,
} from "discord.js";
import { round, shuffle } from "es-toolkit";

import { Hashira } from "@hashira/core";
import type { GiveawayParticipant } from "@hashira/db";
import {
  ActionRow,
  Button,
  Container,
  MediaGallery,
  MediaGalleryItem,
  render,
  Separator,
  TextDisplay,
} from "@hashira/jsx";

import { base } from "../base";
import { STRATA_CZASU } from "../specializedConstants";
import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { waitForButtonClick } from "../util/singleUseButton";
import { handleGiveawayJoinButton } from "./handlers/joinHandler";
import { canDistributeType, handleGiveawayRewardButton } from "./handlers/rewardHandler";
import { analyzeRewards, formatRewardPreview, toPersistedReward } from "./rewardAnalyzer";
import {
  distributeGiveawayEconomyRewards,
  distributeGiveawayMutes,
  getPendingGiveawayRewards,
} from "./rewardHandout";
import {
  autocompleteGiveawayId,
  autocompleteGiveawayIdForStaff,
  formatBanner,
  getStaticBanner,
  GiveawayBannerRatio,
  giveawayFooter,
  type ParsedReward,
  parseRewards,
  selectAndSaveWinners,
  updateGiveaway,
} from "./util";

export const giveaway = new Hashira({ name: "giveaway" })
  .use(base)
  .group("givek", (group) =>
    group
      .setDescription("Komendy do givków.")
      .setDMPermission(false)
      .addCommand("create", (command) =>
        command
          .setDescription("Tworzenie giveawayów z różnymi nagrodami")
          .addString("nagrody", (rewards) =>
            rewards.setDescription(
              "Nagrody do rozdania, oddzielone przecinkami, gdy nagród jest więcej to piszemy np. 2x200 punktów",
            ),
          )
          .addString("czas-trwania", (duration) =>
            duration.setDescription("Czas trwania givka, np. 1d (1 dzień) lub 2h (2 godziny)"),
          )
          .addString("tytul", (tytul) =>
            tytul.setDescription("Tytuł giveawaya, domyślnie 'Giveaway'").setRequired(false),
          )
          .addAttachment("baner", (baner) =>
            baner
              .setDescription(
                "Baner wyświetlany na górze giveawaya. Domyślny można wyłączyć ustawiając format na brak.",
              )
              .setRequired(false),
          )
          .addNumber("format-baneru", (format) =>
            format
              .setDescription(
                "Konwertuje baner do wybranego współczynnika proporcji, domyślnie 'Bez zmian'.",
              )
              .setRequired(false)
              .addChoices(
                { name: "Brak baneru", value: GiveawayBannerRatio.None },
                { name: "Bez zmian", value: GiveawayBannerRatio.Auto },
                { name: "Szeroki (3:1)", value: GiveawayBannerRatio.Landscape },
                { name: "Wysoki (2:3)", value: GiveawayBannerRatio.Portrait },
              ),
          )
          .addRole("wymagana-rola", (whitelist) =>
            whitelist.setDescription("Wymagana rola do wzięcia udziału.").setRequired(false),
          )
          .addRole("zakazana-rola", (blacklist) =>
            blacklist.setDescription("Zakazana rola do wzięcia udziału.").setRequired(false),
          )
          .handle(
            async (
              { prisma, messageQueue },
              {
                nagrody: rewards,
                "czas-trwania": duration,
                tytul: title,
                baner: banner,
                "format-baneru": format,
                "wymagana-rola": whitelist,
                "zakazana-rola": blacklist,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              await itx.deferReply({ flags: MessageFlags.Ephemeral });

              await ensureUserExists(prisma, itx.user);

              const ratio = (format as GiveawayBannerRatio) ?? GiveawayBannerRatio.Auto;

              const files: AttachmentBuilder[] = [];
              let imageURL: string;

              if (banner && ratio !== GiveawayBannerRatio.None) {
                if (banner.size > 4_000_000) {
                  return await errorFollowUp(
                    itx,
                    `Baner jest za duży (>4MB). Aktualny rozmiar pliku: ${round(banner.size / 1_000_000, 1)} MB.`,
                  );
                }

                const [buffer, ext] = await formatBanner(banner, ratio);
                if (!buffer) {
                  return await errorFollowUp(
                    itx,
                    `Podano baner z nieprawidłowym rozszerzeniem lub ten typ nie obsługuje formatowania. (${banner.contentType})`,
                  );
                }

                const attachment = new AttachmentBuilder(buffer).setName(`banner.${ext}`);
                files.push(attachment);
                imageURL = `attachment://banner.${ext}`;
              } else {
                imageURL = getStaticBanner(title || "Giveaway");
              }

              const parsedRewards: ParsedReward[] = parseRewards(rewards);
              const analyzedRewards = await analyzeRewards(parsedRewards, prisma, itx.guildId);

              const parsedTime: Duration | null = parseDuration(duration);
              if (parsedTime === null) {
                return await errorFollowUp(itx, "Podano nieprawidłowy czas");
              }

              const durationSeconds = durationToSeconds(parsedTime);
              const endTime = addSeconds(itx.createdAt, durationSeconds);
              const totalRewards = parsedRewards.reduce((sum, r) => sum + r.amount, 0);

              const roleRestriction: string[] = [];
              if (whitelist || blacklist) roleRestriction.push("### Restrykcje:");
              if (whitelist) roleRestriction.push(`-# Wymagane role: ${whitelist}`);
              if (blacklist) roleRestriction.push(`-# Zakazane role: ${blacklist}`);

              const confirmationContent = (
                <Container accentColor={0x0099ff}>
                  {ratio !== GiveawayBannerRatio.None && (
                    <MediaGallery>
                      <MediaGalleryItem
                        url={imageURL}
                        description={`Banner for giveaway: ${title || "Giveaway"}`}
                      />
                    </MediaGallery>
                  )}
                  <TextDisplay content={`# ${title || "Giveaway"}`} />
                  <TextDisplay content={`-# Host: ${itx.user}\n${roleRestriction.join("\n")}`} />
                  <Separator spacing={SeparatorSpacingSize.Large} />
                  <TextDisplay
                    content={`${analyzedRewards.map(formatRewardPreview).join("\n")}\n`}
                  />
                  <TextDisplay content={`Koniec ${time(endTime, "R")}`} />
                  <Separator />
                  <TextDisplay
                    content={`-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards} | Id: ?`}
                  />
                  <TextDisplay content="Potwierdź jeśli wszystko się zgadza w giveawayu." />
                  <TextDisplay content="-# ✅ oznacza że nagroda zostanie nadana automatycznie po wpisaniu komendy `/givek-rozdaj-...`" />
                  <TextDisplay content="-# ❌ oznacza że nagroda nie została rozpoznana i nie zostanie automatycznie rozdana" />
                  <ActionRow>
                    <Button
                      customId="confirm"
                      label="Potwierdź poprawność"
                      style={ButtonStyle.Secondary}
                    />
                    <Button
                      customId="confirm-fixed"
                      label="Potwierdź z poprawkami"
                      style={ButtonStyle.Secondary}
                    />
                  </ActionRow>
                </Container>
              );

              const confirmationRender = render(confirmationContent);
              const responseConfirm = await itx.editReply({
                components: confirmationRender.components,
                files: [...confirmationRender.files, ...files],
                flags: confirmationRender.flags,
              });

              if (!responseConfirm) {
                throw new Error("Failed to receive response from interaction reply");
              }

              const confirmation = await waitForButtonClick(
                responseConfirm,
                ["confirm", "confirm-fixed"],
                { minutes: 1 },
                (interaction) => interaction.user.id === itx.user.id,
              );

              if (!confirmation.interaction) return;

              const useFixedText = confirmation.interaction.customId === "confirm-fixed";
              const paidRewards = analyzedRewards.map((reward) =>
                toPersistedReward(reward, useFixedText),
              );

              itx.deleteReply();

              const giveawayContent = (
                <Container accentColor={0x0099ff}>
                  {ratio !== GiveawayBannerRatio.None && (
                    <MediaGallery>
                      <MediaGalleryItem
                        url={imageURL}
                        description={`Banner for giveaway: ${title || "Giveaway"}`}
                      />
                    </MediaGallery>
                  )}
                  <TextDisplay content={`# ${title || "Giveaway"}`} />
                  <TextDisplay content={`-# Host: ${itx.user}\n${roleRestriction.join("\n")}`} />
                  <Separator spacing={SeparatorSpacingSize.Large} />
                  <TextDisplay
                    content={`${paidRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}\n`}
                  />
                  <TextDisplay content={`Koniec ${time(endTime, "R")}`} />
                  <Separator />
                  <TextDisplay
                    content={`-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards} | Id: ?`}
                  />
                  <ActionRow>
                    <Button
                      customId="giveaway-option:join"
                      label="Dołącz"
                      style={ButtonStyle.Primary}
                    />
                    <Button
                      customId="giveaway-option:list"
                      label="Lista uczestników"
                      style={ButtonStyle.Secondary}
                    />
                  </ActionRow>
                </Container>
              );

              const giveawayRender = render(giveawayContent);
              const response = await itx.followUp({
                components: giveawayRender.components,
                files: [...giveawayRender.files, ...files],
                withResponse: true,
                flags: giveawayRender.flags,
              });

              if (!response) {
                throw new Error("Failed to receive response from interaction reply");
              }

              const giveaway = await prisma.giveaway.create({
                data: {
                  authorId: itx.user.id,
                  messageId: response.id,
                  channelId: response.channelId,
                  guildId: response.guildId,
                  endAt: endTime,
                  roleWhitelist: whitelist ? [whitelist.id] : [],
                  roleBlacklist: blacklist ? [blacklist.id] : [],
                  participants: { create: [] },
                  rewards: {
                    create: paidRewards.map(({ amount, reward, type, ...payout }) => ({
                      amount,
                      reward,
                      type,
                      ...payout,
                    })),
                  },
                  totalRewards: totalRewards,
                },
              });

              await messageQueue.push(
                "giveawayEnd",
                { giveawayId: giveaway.id },
                Math.floor((endTime.valueOf() - response.createdAt.valueOf()) / 1000),
                giveaway.id.toString(),
              );

              updateGiveaway(response, giveaway, prisma);
            },
          ),
      )
      .addCommand("time-add", (command) =>
        command
          .setDescription("Dodawanie czasu do istniejącego giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .addString("czas", (czas) =>
            czas.setDescription("Czas do dodania (np. 1d, 2h, 5m).").setRequired(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma, messageQueue }, { id, czas }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway || giveaway.endAt < itx.createdAt)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje lub się zakończył!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do edycji tego giveawaya!");

            const channel = await itx.client.channels.fetch(giveaway.channelId);
            if (!channel || !channel.isSendable()) {
              throw new Error(`Channel ${channel} is not sendable or not found.`);
            }

            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message || !message.components[0]) {
              throw new Error(`Message ${message} or it's component not found.`);
            }

            const parsedTime: Duration | null = parseDuration(czas);

            if (parsedTime === null) {
              return await errorFollowUp(itx, "Podano nieprawidłowy czas");
            }

            const durationSeconds = durationToSeconds(parsedTime);
            const newEndTime = addSeconds(giveaway.endAt, durationSeconds);

            const container = new ContainerBuilder(
              message.components[0].toJSON() as APIContainerComponent,
            );

            const timeIndex = container.components.findIndex(
              (c) =>
                c.data?.type === ComponentType.TextDisplay &&
                typeof c.data?.content === "string" &&
                c.data.content.startsWith("Koniec "),
            );

            if (timeIndex === -1) return;

            container.components[timeIndex] = new TextDisplayBuilder().setContent(
              `Koniec ${time(newEndTime, "R")}`,
            );

            await message.edit({ components: [container] });

            await messageQueue.updateDelay("giveawayEnd", giveaway.id.toString(), newEndTime);

            await prisma.giveaway.update({
              where: {
                id: id,
              },
              data: {
                endAt: newEndTime,
              },
            });

            await itx.reply({
              content: `Pomyślnie dodano do czasu ${formatDuration(parsedTime)}, giveaway zakończy się ${time(newEndTime, "R")}.${giveawayFooter(giveaway)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("reroll", (command) =>
        command
          .setDescription("Losuje jednego użytkownika spośród tych którzy nie wygrali giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do rerollowania tego giveawaya!");

            const [participants, winners] = await prisma.$transaction([
              prisma.giveawayParticipant.findMany({
                where: { giveawayId: giveaway.id, isRemoved: false },
              }),
              prisma.giveawayWinner.findMany({
                where: { giveawayId: giveaway.id },
              }),
            ]);

            const filtered = participants.filter(
              (p) => !winners.some((w) => w.userId === p.userId),
            );

            const newWinner = filtered.length > 0 ? shuffle(filtered)[0] : null;

            if (!newWinner) {
              return await errorFollowUp(
                itx,
                `Brak dostępnych uczestników do rerollowania!${giveawayFooter(giveaway)}`,
              );
            }

            await itx.reply({
              content: `Wygrywa: <@${newWinner.userId}>${giveawayFooter(giveaway)}`,
              allowedMentions: { users: [newWinner.userId] },
            });
          }),
      )
      .addCommand("reroll-all", (command) =>
        command
          .setDescription("Losuje na nowo wszystkich zwycięzców giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
              include: {
                rewards: true,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do rerollowania tego giveawaya!");

            const [rewards, participants] = await prisma.$transaction([
              prisma.giveawayReward.findMany({
                where: { giveawayId: giveaway.id },
              }),
              prisma.giveawayParticipant.findMany({
                where: { giveawayId: giveaway.id, isRemoved: false },
              }),
            ]);

            if (participants.length === 0) {
              return await errorFollowUp(
                itx,
                `Brak uczestników w giveawayu!${giveawayFooter(giveaway)}`,
              );
            }

            await prisma.giveawayWinner.deleteMany({
              where: { giveawayId: giveaway.id },
            });

            const newWinners = await selectAndSaveWinners(
              giveaway.id,
              giveaway.rewards,
              participants,
              prisma,
            );

            const results = rewards.map(({ reward, id: rewardId }) => {
              const rewardWinners = newWinners.filter((w) => w.rewardId === rewardId);
              const mention =
                rewardWinners.length === 0
                  ? "nikt"
                  : rewardWinners.map((w) => `<@${w.userId}>`).join(" ");
              return `> ${reward} ${mention}`;
            });

            await itx.reply({
              ...render(
                <Container accentColor={0x00ff99}>
                  <TextDisplay content="# :tada: Nowi zwycięzcy:" />
                  <Separator spacing={SeparatorSpacingSize.Large} />
                  <TextDisplay content={results.join("\n")} />
                </Container>,
              ),
              allowedMentions: { users: participants.map((p) => p.userId) },
            });
          }),
      )
      .addCommand("list-users", (command) =>
        command
          .setDescription("Pokazuje liste użytkowników w giveawayu, w razie gdy się zakończy.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            const participants: GiveawayParticipant[] = await prisma.giveawayParticipant.findMany({
              where: { giveawayId: giveaway.id, isRemoved: false },
            });

            const fmtParticipants =
              participants.length > 0
                ? participants.map((user) => `<@${user.userId}>`).join(", ")
                : "Brak uczestników";

            await itx.reply({
              content: `Uczestnicy: ${fmtParticipants}${giveawayFooter(giveaway)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("remove-user", (command) =>
        command
          .setDescription("Usuwa użytkownika z giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .addUser("user", (user) =>
            user.setDescription("Użytkownik do usunięcia.").setRequired(true),
          )
          .handle(async ({ prisma }, { id, user: userToRemove }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do edytowania tego giveawaya!");

            const participant = await prisma.giveawayParticipant.findFirst({
              where: { giveawayId: giveaway.id, userId: userToRemove.id },
            });

            if (!participant)
              return await errorFollowUp(itx, "Ten użytkownik nie bierze udziału w giveawayu!");

            await prisma.giveawayParticipant.update({
              where: { id: participant.id },
              data: { forcefullyRemoved: true, isRemoved: true },
            });

            await itx.reply({
              content: `Pomyślnie usunięto ${userToRemove} z giveawaya!`,
            });

            const channel = await itx.client.channels.fetch(giveaway.channelId);
            if (!channel || !channel.isSendable()) {
              throw new Error(`Channel ${channel} is not sendable or not found.`);
            }

            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message) {
              throw new Error(`Message ${message} not found.`);
            }

            await updateGiveaway(message, giveaway, prisma);
          }),
      ),
  )
  .command("givek-rozdaj-punkty", (command) =>
    command
      .setDescription("Rozdaje zwycięzcom punkty z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, economyLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }

        const isModerator = itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers);
        const hasKadra = itx.member.roles.cache.has(STRATA_CZASU.KADRA_ROLE);
        const isAuthor = giveaway.authorId === itx.user.id;

        if (!canDistributeType("currency", isModerator, hasKadra, isAuthor)) {
          return await errorFollowUp(itx, "Nie masz uprawnień do rozdawania nagród z giveawayu.");
        }

        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyłonieni.",
          );
        }

        const pending = await getPendingGiveawayRewards(prisma, giveaway.id);
        if (pending.currency.length === 0) {
          await itx.editReply("Brak punktów do rozdania dla tego giveawaya.");
          return;
        }

        await distributeGiveawayEconomyRewards({
          prisma,
          economyLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          rewardTypes: ["currency"],
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .command("givek-rozdaj-itemy", (command) =>
    command
      .setDescription("Rozdaje zwycięzcom przedmioty z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, economyLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }
        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyłonieni.",
          );
        }

        const pending = await getPendingGiveawayRewards(prisma, giveaway.id);
        if (pending.items.length === 0) {
          await itx.editReply("Brak przedmiotów do rozdania dla tego giveawaya.");
          return;
        }

        await distributeGiveawayEconomyRewards({
          prisma,
          economyLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          rewardTypes: ["item"],
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .command("givek-rozdaj-mute", (command) =>
    command
      .setDescription("Nakłada na zwycięzców nagrody (mute) z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, messageQueue, moderationLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }
        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyznaczeni.",
          );
        }

        const pending = await getPendingGiveawayRewards(prisma, giveaway.id);
        if (pending.mutes.length === 0) {
          await itx.editReply("Brak nagród typu mute do rozdania dla tego giveawaya.");
          return;
        }

        await distributeGiveawayMutes({
          prisma,
          messageQueue,
          log: moderationLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .handle(
    "buttonInteractionCreate",
    async ({ prisma, economyLog, messageQueue, moderationLog }, itx) => {
      if (!itx.inCachedGuild()) return;

      if (itx.customId.startsWith("giveaway-reward")) {
        await handleGiveawayRewardButton({
          prisma,
          economyLog,
          messageQueue,
          moderationLog,
          itx,
        });
        return;
      }

      if (itx.customId.startsWith("giveaway-option:")) {
        await handleGiveawayJoinButton({ prisma, itx });
        return;
      }
    },
  );
