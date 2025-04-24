import { describe, expect, it } from "bun:test";

import * as cheerio from "cheerio";
import sharp from "sharp";
import { ProfileImageBuilder } from "../src/profile/imageBuilder";

const templateSVG = Bun.file(`${__dirname}/../src/profile/res/profile.svg`);

async function getImageBuilder() {
  const svg = cheerio.load(await templateSVG.text());
  return new ProfileImageBuilder(svg);
}

async function getDummyImage() {
  return await sharp({
    create: { width: 8, height: 8, channels: 4, background: "#0000" },
  })
    .raw()
    .toBuffer();
}

describe("imageBuilder", () => {
  it("constructs from profile template", async () => {
    expect(await getImageBuilder()).toBeInstanceOf(ProfileImageBuilder);
  });

  it("returns an SVG string", async () => {
    const image = await getImageBuilder();
    const result = image.result();
    expect(result).toStartWith("<svg");
    expect(result).toEndWith("</svg>");
  });

  it("converts to a Sharp object", async () => {
    const image = await getImageBuilder();
    const sharpImage = image.toSharp();
    expect(sharpImage).toBeInstanceOf(sharp);
  });

  describe("tint color", () => {
    const tintColor = "#aabbcc";

    it("changes nick and title background fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const backgroundFill = res("path[id='Nick + Title Background']").attr("fill");
      expect(backgroundFill).toBe(tintColor);
    });

    it("changes exp bar and icons fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);

      const res = cheerio.load(image.result());
      const statsBarFill = res("rect[id='Stats Bar']").attr("fill");
      const capsIconFill = res("path[id='Stats Caps Icon']").attr("fill");
      const itemsIconFill = res("path[id='Stats Items Icon']").attr("fill");

      expect(statsBarFill).toBe(tintColor);
      expect(capsIconFill).toBe(tintColor);
      expect(itemsIconFill).toBe(tintColor);
    });

    it("changes voice and text activity icons fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const voiceFill = res("g[id='Activity Voice Icon'] path").attr("fill");
      const textFill = res("g[id='Activity Text Icon'] path").attr("fill");
      expect(voiceFill).toBe(tintColor);
      expect(textFill).toBe(tintColor);
    });

    it("changes marriage status text fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const tintableTspans = res("g[id='Marriage Status Text'] tspan[fill='#3C3E43']");
      for (const tspan of tintableTspans) {
        // biome-ignore lint/complexity/useLiteralKeys: Because why not
        const fill = tspan.attribs["fill"];
        expect(fill).toBe(tintColor);
      }
    });

    it("changes guild join and account creation date value text fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const joinDateFill = res("text[id='Guild Join Value']").attr("fill");
      const creationDateFill = res("text[id='Account Creation Value']").attr("fill");

      expect(joinDateFill).toBe(tintColor);
      expect(creationDateFill).toBe(tintColor);
    });

    it("changes exp value, icon and text fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);

      const res = cheerio.load(image.result());
      const valueFill = res("text[id='Exp Value']").attr("fill");
      const iconFill = res("path[id='Exp Icon']").attr("fill");
      const textFill = res("text[id='Exp Text']").attr("fill");

      expect(valueFill).toBe(tintColor);
      expect(iconFill).toBe(tintColor);
      expect(textFill).toBe(tintColor);
    });

    it("changes level background wave fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const waveElements = [
        res("path[id='Level Background Wave 1 Level']"),
        res("path[id='Level Background Wave 1 Mask']"),
        res("path[id='Level Background Wave 2 Level']"),
        res("path[id='Level Background Wave 2 Mask']"),
      ];
      for (const waveElement of waveElements) {
        const fill = waveElement.attr("fill");
        expect(fill).toBe(tintColor);
      }
    });

    it("changes showcase header background fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const fill = res("rect[id='Showcase Header Background']").attr("fill");
      expect(fill).toBe(tintColor);
    });
  });

  it("changes nickname text", async () => {
    const image = await getImageBuilder();
    image.nickname("Test Nickname");
    const res = cheerio.load(image.result());
    const nickname = res("text[id='Nickname Value']").text();
    expect(nickname).toBe("Test Nickname");
  });

  it("changes title text", async () => {
    const image = await getImageBuilder();
    image.title("Test Title");
    const res = cheerio.load(image.result());
    const title = res("text[id='Title Value']").text();
    expect(title).toBe("Test Title");
  });

  it("changes guild join date", async () => {
    const image = await getImageBuilder();
    image.guildJoinDate(new Date("2023-01-01T00:00:00Z"));
    const res = cheerio.load(image.result());
    const guildJoinDate = res("text[id='Guild Join Value']").text();
    expect(guildJoinDate).toBe("01.01.2023");
  });

  it("changes account creation date", async () => {
    const image = await getImageBuilder();
    image.accountCreationDate(new Date("2023-01-01T00:00:00Z"));
    const res = cheerio.load(image.result());
    const accountCreationDate = res("text[id='Account Creation Value']").text();
    expect(accountCreationDate).toBe("01.01.2023");
  });

  describe("economy stats", () => {
    it("changes balance amount", async () => {
      const image = await getImageBuilder();
      image.balance(100);
      const res = cheerio.load(image.result());
      const balance = res("text[id='Stats Caps Value']").text();
      expect(balance).toBe("100");
    });

    it("changes reputation amount", async () => {
      const image = await getImageBuilder();
      image.rep(100);
      const res = cheerio.load(image.result());
      const reputation = res("text[id='Stats Rep Value']").text();
      expect(reputation).toBe("100 rep");
    });

    it("changes item count", async () => {
      const image = await getImageBuilder();
      image.items(10);
      const res = cheerio.load(image.result());
      const items = res("text[id='Stats Items Value']").text();
      expect(items).toBe("10");
    });
  });

  describe("activity stats", () => {
    it("changes voice activity amount", async () => {
      const image = await getImageBuilder();
      image.voiceActivity(100);
      const res = cheerio.load(image.result());
      const voiceActivity = res("g[id='Activity Voice Value'] > text").text();
      expect(voiceActivity).toBe("100h");
    });

    it("changes text activity amount", async () => {
      const image = await getImageBuilder();
      image.textActivity(100);
      const res = cheerio.load(image.result());
      const textActivity = res("g[id='Activity Text Value'] > text").text();
      expect(textActivity).toBe("100 wiad.");
    });
  });

  describe("marriage status", () => {
    it("changes days amount in marriage status", async () => {
      const image = await getImageBuilder();
      image.marriageStatusDays(100);
      const res = cheerio.load(image.result());
      const days = res("g[id='Marriage Status Text Top'] > text").text();
      expect(days).toBe("Od 100 dni w związku");
    });

    it("pluralizes days amount in marriage status", async () => {
      const image = await getImageBuilder();
      image.marriageStatusDays(1);
      const res = cheerio.load(image.result());
      const days = res("g[id='Marriage Status Text Top'] > text").text();
      expect(days).toBe("Od 1 dnia w związku");
    });

    it("changes spouse nickname in marriage status", async () => {
      const image = await getImageBuilder();
      image.marriageStatusUsername("Test Spouse");
      const res = cheerio.load(image.result());
      const status = res("g[id='Marriage Status Text Bottom'] > text").text();
      expect(status).toBe("z Test Spouse");
    });

    it("changes marriage status opacity", async () => {
      const image = await getImageBuilder();
      image.marriageStatusOpacity(0);
      const res = cheerio.load(image.result());
      const textOpacity = res("g[id='Marriage Status Text']").attr("opacity");
      const iconOpacity = res("path[id='Marriage Status Icon']").attr("opacity");
      expect(textOpacity).toBe("0");
      expect(iconOpacity).toBe("0");
    });
  });

  describe("marriage avatar", () => {
    it("changes spouse avatar image", async () => {
      const image = await getImageBuilder();
      const avatarImage = await getDummyImage();
      image.marriageAvatarImage(avatarImage);
      const res = cheerio.load(image.result());
      const imageHref = res(
        "image[data-name='a831eb63836997d89e8e670b147f6a19.jpg']",
      ).attr("href");
      expect(imageHref).toContain(avatarImage.toString("base64"));
    });

    it("changes spouse avatar opacity", async () => {
      const image = await getImageBuilder();
      image.marriageAvatarOpacity(0);
      const res = cheerio.load(image.result());
      const avatarOpacity = res("g[id='Marriage']").attr("opacity");
      expect(avatarOpacity).toBe("0");
    });
  });

  it("changes avatar image", async () => {
    const image = await getImageBuilder();
    const avatarImage = await getDummyImage();
    image.avatarImage(avatarImage);
    const res = cheerio.load(image.result());
    const imageHref = res("image[data-name='discordyellow.png']").attr("href");
    expect(imageHref).toContain(avatarImage.toString("base64"));
  });

  describe("exp and level stats", () => {
    it("changes exp text", async () => {
      const image = await getImageBuilder();
      image.exp(100, 200);
      const res = cheerio.load(image.result());
      const exp = res("text[id='Exp Value']").text();
      expect(exp).toBe("100/200");
    });

    it("changes level text", async () => {
      const image = await getImageBuilder();
      image.level(10);
      const res = cheerio.load(image.result());
      const level = res("text[id='Level Value']").text();
      expect(level).toBe("10");
    });
  });

  describe("showcase badges", () => {
    it("changes showcase badge image", async () => {
      const image = await getImageBuilder();
      const badgeImage = await getDummyImage();
      image.showcaseBadgeImage(1, 1, badgeImage);

      const res = cheerio.load(image.result());
      const badgeFill = res("circle[id='Showcase Badge 1:1']").first().attr("fill");
      const fillUrl = badgeFill?.replace("url(#", "").replace(")", "");
      const pattern = res(`defs > pattern[id='${fillUrl}']`).first();
      const imageId = pattern.children("use").first().attr("href")?.replace("#", "");
      const imageHref = res(`defs > image[id='${imageId}']`).attr("href");

      expect(imageHref).toContain(badgeImage.toString("base64"));
    });

    it("changes showcase badge opacity", async () => {
      const image = await getImageBuilder();
      image.showcaseBadgeOpacity(2, 2, 0);
      const res = cheerio.load(image.result());
      const badge = res("circle[id='Showcase Badge 2:2']");
      const opacity = badge.attr("opacity");
      expect(opacity).toBe("0");
    });

    it("changes all showcase badges opacity", async () => {
      const image = await getImageBuilder();
      image.allShowcaseBadgesOpacity(0);
      const res = cheerio.load(image.result());
      const badges = res("g[id='Showcase Badges']").children("circle");
      badges.each((_, badge) => {
        const opacity = badge.attributes.find((attr) => attr.name === "opacity");
        expect(opacity?.value).toBe("0");
      });
    });

    it("changes showcase badge background stroke width", async () => {
      const image = await getImageBuilder();
      image.showcaseBadgeBackgroundStrokeWidth(1, 3, 0.5);
      const res = cheerio.load(image.result());
      const badgeBackground = res("circle[id='Showcase Badge Background 1:3']");
      const strokeWidth = badgeBackground.attr("stroke-width");
      expect(strokeWidth).toBe("0.5");
    });
  });

  it("changes the background image", async () => {
    const image = await getImageBuilder();
    const backgroundImage = await getDummyImage();
    image.backgroundImage(backgroundImage);
    const res = cheerio.load(image.result());
    const imageHref = res("image[data-name='background.png']").attr("href");
    expect(imageHref).toContain(backgroundImage.toString("base64"));
  });
});
