import type { Prisma } from "@hashira/db";
import * as v from "valibot";

const GuildSettingsMetaV1 = v.object({
  propositionsChannelId: v.optional(v.string()),
  complaintsChannelId: v.optional(v.string()),
  questionsChannelId: v.optional(v.string()),
  propositionsEmojis: v.optional(v.array(v.string())),
  version: v.literal(1),
});

const AnyVersionGuildSettingsMeta = v.union([GuildSettingsMetaV1]);
type AnyVersionGuildSettingsMeta = v.InferOutput<typeof AnyVersionGuildSettingsMeta>;

// This always satisfies the latest version of the meta object.
export type GuildSettingsMeta = v.InferOutput<typeof GuildSettingsMetaV1>;

const DEFAULT = { version: 1 } satisfies GuildSettingsMeta;

const tryUpdateMeta = (meta: AnyVersionGuildSettingsMeta): GuildSettingsMeta => {
  return meta;
};

export const getGuildSettingsMeta = async (
  prisma: Prisma.TransactionClient,
  guildId: string,
) => {
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId, meta: DEFAULT },
    update: {},
  });

  v.assert(AnyVersionGuildSettingsMeta, settings.meta);

  const update = await prisma.guildSettings.update({
    where: { guildId },
    data: { meta: tryUpdateMeta(settings.meta) },
  });

  return update.meta as GuildSettingsMeta;
};

export type GuildSettingsMetaUpdates = Partial<Omit<GuildSettingsMeta, "version">>;

export const updateGuildSettingsMeta = async (
  prisma: Prisma.TransactionClient,
  guildId: string,
  metaUpdates: GuildSettingsMetaUpdates,
) => {
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId, meta: DEFAULT },
    update: {},
  });

  v.assert(AnyVersionGuildSettingsMeta, settings.meta);

  const meta = tryUpdateMeta(settings.meta);
  Object.assign(meta, metaUpdates);

  await prisma.guildSettings.update({ where: { guildId }, data: { meta } });
};
