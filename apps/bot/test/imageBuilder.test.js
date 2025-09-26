"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var cheerio = require("cheerio");
var sharp_1 = require("sharp");
var imageBuilder_1 = require("../src/profile/imageBuilder");
var templateSVG = Bun.file("".concat(__dirname, "/../src/profile/res/profile.svg"));
function getImageBuilder() {
    return __awaiter(this, void 0, void 0, function () {
        var svg, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = cheerio).load;
                    return [4 /*yield*/, templateSVG.text()];
                case 1:
                    svg = _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/, new imageBuilder_1.ProfileImageBuilder(svg)];
            }
        });
    });
}
function getDummyImage() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, sharp_1.default)({
                        create: { width: 8, height: 8, channels: 4, background: "#0000" },
                    })
                        .raw()
                        .toBuffer()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
(0, bun_test_1.describe)("imageBuilder", function () {
    (0, bun_test_1.it)("constructs from profile template", function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = bun_test_1.expect;
                    return [4 /*yield*/, getImageBuilder()];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBeInstanceOf(imageBuilder_1.ProfileImageBuilder);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.it)("returns an SVG string", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    result = image.result();
                    (0, bun_test_1.expect)(result).toStartWith("<svg");
                    (0, bun_test_1.expect)(result).toEndWith("</svg>");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.it)("converts to a Sharp object", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, sharpImage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    sharpImage = image.toSharp();
                    (0, bun_test_1.expect)(sharpImage).toBeInstanceOf(sharp_1.default);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.describe)("tint color", function () {
        var tintColor = "#aabbcc";
        (0, bun_test_1.it)("changes nick and title background fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, backgroundFill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        backgroundFill = res("path[id='Nick + Title Background']").attr("fill");
                        (0, bun_test_1.expect)(backgroundFill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes exp bar and icons fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, statsBarFill, capsIconFill, itemsIconFill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        statsBarFill = res("rect[id='Stats Bar']").attr("fill");
                        capsIconFill = res("path[id='Stats Caps Icon']").attr("fill");
                        itemsIconFill = res("path[id='Stats Items Icon']").attr("fill");
                        (0, bun_test_1.expect)(statsBarFill).toBe(tintColor);
                        (0, bun_test_1.expect)(capsIconFill).toBe(tintColor);
                        (0, bun_test_1.expect)(itemsIconFill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes voice and text activity icons fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, voiceFill, textFill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        voiceFill = res("g[id='Activity Voice Icon'] path").attr("fill");
                        textFill = res("g[id='Activity Text Icon'] path").attr("fill");
                        (0, bun_test_1.expect)(voiceFill).toBe(tintColor);
                        (0, bun_test_1.expect)(textFill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes marriage status text fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, tintableTspans, _i, tintableTspans_1, tspan, fill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        tintableTspans = res("g[id='Marriage Status Text'] tspan[fill='#3C3E43']");
                        for (_i = 0, tintableTspans_1 = tintableTspans; _i < tintableTspans_1.length; _i++) {
                            tspan = tintableTspans_1[_i];
                            fill = tspan.attribs["fill"];
                            (0, bun_test_1.expect)(fill).toBe(tintColor);
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes guild join and account creation date value text fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, joinDateFill, creationDateFill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        joinDateFill = res("text[id='Guild Join Value']").attr("fill");
                        creationDateFill = res("text[id='Account Creation Value']").attr("fill");
                        (0, bun_test_1.expect)(joinDateFill).toBe(tintColor);
                        (0, bun_test_1.expect)(creationDateFill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes exp value, icon and text fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, valueFill, iconFill, textFill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        valueFill = res("text[id='Exp Value']").attr("fill");
                        iconFill = res("path[id='Exp Icon']").attr("fill");
                        textFill = res("text[id='Exp Text']").attr("fill");
                        (0, bun_test_1.expect)(valueFill).toBe(tintColor);
                        (0, bun_test_1.expect)(iconFill).toBe(tintColor);
                        (0, bun_test_1.expect)(textFill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes level background wave fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, waveElements, _i, waveElements_1, waveElement, fill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        waveElements = [
                            res("path[id='Level Background Wave 1 Level']"),
                            res("path[id='Level Background Wave 1 Mask']"),
                            res("path[id='Level Background Wave 2 Level']"),
                            res("path[id='Level Background Wave 2 Mask']"),
                        ];
                        for (_i = 0, waveElements_1 = waveElements; _i < waveElements_1.length; _i++) {
                            waveElement = waveElements_1[_i];
                            fill = waveElement.attr("fill");
                            (0, bun_test_1.expect)(fill).toBe(tintColor);
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes showcase header background fill", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, fill;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.tintColor(tintColor);
                        res = cheerio.load(image.result());
                        fill = res("rect[id='Showcase Header Background']").attr("fill");
                        (0, bun_test_1.expect)(fill).toBe(tintColor);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.it)("changes nickname text", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, res, nickname;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    image.nickname("Test Nickname");
                    res = cheerio.load(image.result());
                    nickname = res("text[id='Nickname Value']").text();
                    (0, bun_test_1.expect)(nickname).toBe("Test Nickname");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.it)("changes title text", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, res, title;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    image.title("Test Title");
                    res = cheerio.load(image.result());
                    title = res("text[id='Title Value']").text();
                    (0, bun_test_1.expect)(title).toBe("Test Title");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.it)("changes guild join date", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, res, guildJoinDate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    image.guildJoinDate(new Date("2023-01-01T00:00:00Z"));
                    res = cheerio.load(image.result());
                    guildJoinDate = res("text[id='Guild Join Value']").text();
                    (0, bun_test_1.expect)(guildJoinDate).toBe("01.01.2023");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.it)("changes account creation date", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, res, accountCreationDate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    image.accountCreationDate(new Date("2023-01-01T00:00:00Z"));
                    res = cheerio.load(image.result());
                    accountCreationDate = res("text[id='Account Creation Value']").text();
                    (0, bun_test_1.expect)(accountCreationDate).toBe("01.01.2023");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.describe)("economy stats", function () {
        (0, bun_test_1.it)("changes balance amount", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.balance(100);
                        res = cheerio.load(image.result());
                        balance = res("text[id='Stats Caps Value']").text();
                        (0, bun_test_1.expect)(balance).toBe("100");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes reputation amount", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, reputation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.rep(100);
                        res = cheerio.load(image.result());
                        reputation = res("text[id='Stats Rep Value']").text();
                        (0, bun_test_1.expect)(reputation).toBe("100 rep");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes item count", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.items(10);
                        res = cheerio.load(image.result());
                        items = res("text[id='Stats Items Value']").text();
                        (0, bun_test_1.expect)(items).toBe("10");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)("activity stats", function () {
        (0, bun_test_1.it)("changes voice activity amount", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, voiceActivity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.voiceActivity(100);
                        res = cheerio.load(image.result());
                        voiceActivity = res("g[id='Activity Voice Value'] > text").text();
                        (0, bun_test_1.expect)(voiceActivity).toBe("100h");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes text activity amount", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, textActivity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.textActivity(100);
                        res = cheerio.load(image.result());
                        textActivity = res("g[id='Activity Text Value'] > text").text();
                        (0, bun_test_1.expect)(textActivity).toBe("100 wiad.");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)("marriage status", function () {
        (0, bun_test_1.it)("changes days amount in marriage status", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, days;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.marriageStatusDays(100);
                        res = cheerio.load(image.result());
                        days = res("g[id='Marriage Status Text Top'] > text").text();
                        (0, bun_test_1.expect)(days).toBe("Od 100 dni w związku");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("pluralizes days amount in marriage status", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, days;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.marriageStatusDays(1);
                        res = cheerio.load(image.result());
                        days = res("g[id='Marriage Status Text Top'] > text").text();
                        (0, bun_test_1.expect)(days).toBe("Od 1 dnia w związku");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes spouse nickname in marriage status", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.marriageStatusUsername("Test Spouse");
                        res = cheerio.load(image.result());
                        status = res("g[id='Marriage Status Text Bottom'] > text").text();
                        (0, bun_test_1.expect)(status).toBe("z Test Spouse");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes marriage status opacity", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, textOpacity, iconOpacity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.marriageStatusOpacity(0);
                        res = cheerio.load(image.result());
                        textOpacity = res("g[id='Marriage Status Text']").attr("opacity");
                        iconOpacity = res("path[id='Marriage Status Icon']").attr("opacity");
                        (0, bun_test_1.expect)(textOpacity).toBe("0");
                        (0, bun_test_1.expect)(iconOpacity).toBe("0");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)("marriage avatar", function () {
        (0, bun_test_1.it)("changes spouse avatar image", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, avatarImage, res, imageHref;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        return [4 /*yield*/, getDummyImage()];
                    case 2:
                        avatarImage = _a.sent();
                        image.marriageAvatarImage(avatarImage);
                        res = cheerio.load(image.result());
                        imageHref = res("image[data-name='a831eb63836997d89e8e670b147f6a19.jpg']").attr("href");
                        (0, bun_test_1.expect)(imageHref).toContain(avatarImage.toString("base64"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes spouse avatar opacity", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, avatarOpacity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.marriageAvatarOpacity(0);
                        res = cheerio.load(image.result());
                        avatarOpacity = res("g[id='Marriage']").attr("opacity");
                        (0, bun_test_1.expect)(avatarOpacity).toBe("0");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.it)("changes avatar image", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, avatarImage, res, imageHref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    return [4 /*yield*/, getDummyImage()];
                case 2:
                    avatarImage = _a.sent();
                    image.avatarImage(avatarImage);
                    res = cheerio.load(image.result());
                    imageHref = res("image[data-name='discordyellow.png']").attr("href");
                    (0, bun_test_1.expect)(imageHref).toContain(avatarImage.toString("base64"));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.describe)("exp and level stats", function () {
        (0, bun_test_1.it)("changes exp text", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, exp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.exp(100, 200);
                        res = cheerio.load(image.result());
                        exp = res("text[id='Exp Value']").text();
                        (0, bun_test_1.expect)(exp).toBe("100/200");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes level text", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, level;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.level(10);
                        res = cheerio.load(image.result());
                        level = res("text[id='Level Value']").text();
                        (0, bun_test_1.expect)(level).toBe("10");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)("showcase badges", function () {
        (0, bun_test_1.it)("changes showcase badge image", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, badgeImage, res, badgeFill, fillUrl, pattern, imageId, imageHref;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _b.sent();
                        return [4 /*yield*/, getDummyImage()];
                    case 2:
                        badgeImage = _b.sent();
                        image.showcaseBadgeImage(1, 1, badgeImage);
                        res = cheerio.load(image.result());
                        badgeFill = res("circle[id='Showcase Badge 1:1']").first().attr("fill");
                        fillUrl = badgeFill === null || badgeFill === void 0 ? void 0 : badgeFill.replace("url(#", "").replace(")", "");
                        pattern = res("defs > pattern[id='".concat(fillUrl, "']")).first();
                        imageId = (_a = pattern.children("use").first().attr("href")) === null || _a === void 0 ? void 0 : _a.replace("#", "");
                        imageHref = res("defs > image[id='".concat(imageId, "']")).attr("href");
                        (0, bun_test_1.expect)(imageHref).toContain(badgeImage.toString("base64"));
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes showcase badge opacity", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, badge, opacity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.showcaseBadgeOpacity(2, 2, 0);
                        res = cheerio.load(image.result());
                        badge = res("circle[id='Showcase Badge 2:2']");
                        opacity = badge.attr("opacity");
                        (0, bun_test_1.expect)(opacity).toBe("0");
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes all showcase badges opacity", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, badges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.allShowcaseBadgesOpacity(0);
                        res = cheerio.load(image.result());
                        badges = res("g[id='Showcase Badges']").children("circle");
                        badges.each(function (_, badge) {
                            var opacity = badge.attributes.find(function (attr) { return attr.name === "opacity"; });
                            (0, bun_test_1.expect)(opacity === null || opacity === void 0 ? void 0 : opacity.value).toBe("0");
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)("changes showcase badge background stroke width", function () { return __awaiter(void 0, void 0, void 0, function () {
            var image, res, badgeBackground, strokeWidth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageBuilder()];
                    case 1:
                        image = _a.sent();
                        image.showcaseBadgeBackgroundStrokeWidth(1, 3, 0.5);
                        res = cheerio.load(image.result());
                        badgeBackground = res("circle[id='Showcase Badge Background 1:3']");
                        strokeWidth = badgeBackground.attr("stroke-width");
                        (0, bun_test_1.expect)(strokeWidth).toBe("0.5");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.it)("changes the background image", function () { return __awaiter(void 0, void 0, void 0, function () {
        var image, backgroundImage, res, imageHref;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getImageBuilder()];
                case 1:
                    image = _a.sent();
                    return [4 /*yield*/, getDummyImage()];
                case 2:
                    backgroundImage = _a.sent();
                    image.backgroundImage(backgroundImage);
                    res = cheerio.load(image.result());
                    imageHref = res("image[data-name='background.png']").attr("href");
                    (0, bun_test_1.expect)(imageHref).toContain(backgroundImage.toString("base64"));
                    return [2 /*return*/];
            }
        });
    }); });
});
