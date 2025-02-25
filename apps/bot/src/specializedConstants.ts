import { durationToSeconds } from "./util/duration";

export const GUILD_IDS = {
  Piwnica: "342022299957854220",
  StrataCzasu: "211261411119202305",
  StrataCzasuSupportTeam: "1198978337150881812",
  Homik: "1110671571384803350",
} as const;

export const USER_IDS = {
  Defous: "211260587038998528",
  hkg: "503299438757019659",
  Daste: "195935967440404480",
} as const;

export const STRATA_CZASU_CURRENCY = {
  name: "Punkty",
  symbol: "$",
  defaultWalletName: "Portfel",
} as const;

export const STRATA_CZASU_BROCHURE_ROLES = {
  female: "412324847423717378", // @Kobieta
  male: "427454159747547136", // @Facet
  rdn: "1320194743774347335", // @RDN
} as const;

export const STRATA_CZASU = {
  GUILD_ID: GUILD_IDS.StrataCzasu,
  ULTIMATUM_ROLE: "452888858934378497",
  ULTIMATUM_DURATION: durationToSeconds({ days: 60 }),
  MOD_LOG_CHANNEL_ID: "1285004804602593301",
  DM_FORWARD_CHANNEL_ID: "1240038565275238430",
  COMPLAINT_CHANNEL_ID: "1285336622380093492",
  TICKETS_CHANNEL_ID: "1213901611836117052",
  VERIFICATION_DURATION: durationToSeconds({ hours: 72 }),
  BAN_APPEAL_URL: "https://bit.ly/unban_na_stracie",
} as const;

// Used for seeding log settings for development
export const DEFAULT_LOG_CHANNELS = {
  [GUILD_IDS.Piwnica]: {
    MESSAGE: "1284518749315006536",
    MEMBER: "1284522529393873080",
    ROLE: "1326668142415708213",
    MODERATION: "1284518677726761002",
    PROFILE: "1284518733594759239",
    ECONOMY: "1323293360936714240",
  },
} as const;
