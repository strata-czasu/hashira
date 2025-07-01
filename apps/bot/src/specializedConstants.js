"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKET_REMINDER_SETTINGS = exports.DEFAULT_LOG_CHANNELS = exports.BROCHURE_ROLES = exports.STRATA_CZASU = exports.STRATA_CZASU_CURRENCY = exports.USER_IDS = exports.GUILD_IDS = void 0;
var duration_1 = require("./util/duration");
exports.GUILD_IDS = {
    Piwnica: "342022299957854220",
    StrataCzasu: "211261411119202305",
    StrataCzasuSupportTeam: "1198978337150881812",
    Homik: "1110671571384803350",
};
exports.USER_IDS = {
    Defous: "211260587038998528",
    hkg: "503299438757019659",
    Daste: "195935967440404480",
};
exports.STRATA_CZASU_CURRENCY = {
    name: "Punkty",
    symbol: "$",
    defaultWalletName: "Portfel",
};
exports.STRATA_CZASU = {
    GUILD_ID: exports.GUILD_IDS.StrataCzasu,
    ULTIMATUM_ROLE: "452888858934378497",
    ULTIMATUM_DURATION: (0, duration_1.durationToSeconds)({ days: 60 }),
    MOD_LOG_CHANNEL_ID: "1285004804602593301",
    DM_FORWARD_CHANNEL_ID: "1240038565275238430",
    COMPLAINT_CHANNEL_ID: "1285336622380093492",
    TICKETS_CHANNEL_ID: "1213901611836117052",
    VERIFICATION_DURATION: (0, duration_1.durationToSeconds)({ hours: 72 }),
    BAN_APPEAL_URL: "https://bit.ly/unban_na_stracie",
};
exports.BROCHURE_ROLES = (_a = {},
    _a[exports.GUILD_IDS.Piwnica] = {
        FEMALE: "1344071005319987312", // @k
        MALE: "1344071031681318942", // @f
    },
    _a[exports.GUILD_IDS.StrataCzasu] = {
        FEMALE: "412324847423717378", // @Kobieta
        MALE: "427454159747547136", // @Facet
    },
    _a);
// Used for seeding log settings for development
exports.DEFAULT_LOG_CHANNELS = (_b = {},
    _b[exports.GUILD_IDS.Piwnica] = {
        MESSAGE: "1284518749315006536",
        MEMBER: "1284522529393873080",
        ROLE: "1326668142415708213",
        MODERATION: "1284518677726761002",
        PROFILE: "1284518733594759239",
        ECONOMY: "1323293360936714240",
    },
    _b);
exports.TICKET_REMINDER_SETTINGS = (_c = {},
    _c[exports.GUILD_IDS.StrataCzasu] = {
        CATEGORY: "1217954727589970122",
        TICKET_PING: "1345122860049502388",
    },
    _c[exports.GUILD_IDS.Homik] = {
        CATEGORY: "1345124471870324736",
        TICKET_PING: "1231334409228255384",
    },
    _c);
