import { describe, expect, it, test } from "bun:test";
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

    it("changes main header background fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const backgroundFill = res("path[id='Main Header Background']").attr("fill");
      expect(backgroundFill).toBe(tintColor);
    });

    it("changes exp bar and icons fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);

      const res = cheerio.load(image.result());
      const statsBarFill = res("rect[id='Stats Bar']").attr("fill");
      const capsIconFill = res("path[id='Stats Caps Icon']").attr("fill");
      const repIconFill = res("path[id='Stats Rep Icon']").attr("fill");
      const itemsIconFill = res("path[id='Stats Items Icon']").attr("fill");

      expect(statsBarFill).toBe(tintColor);
      expect(capsIconFill).toBe(tintColor);
      expect(repIconFill).toBe(tintColor);
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

    it("changes marriage status text and icon fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const iconFill = res("path[id='Marriage Status Icon']").attr("fill");
      expect(iconFill).toBe(tintColor);
      const tintableTspans = res("g[id='Marriage Status Text'] tspan[fill='#3C3E43']");
      for (const tspan of tintableTspans) {
        // Because why not
        const fill = tspan.attribs["fill"];
        expect(fill).toBe(tintColor);
      }
    });

    it("changes guild join date value text fill", async () => {
      const image = await getImageBuilder();
      image.tintColor(tintColor);
      const res = cheerio.load(image.result());
      const joinDateFill = res("text[id='Guild Join Value']").attr("fill");

      expect(joinDateFill).toBe(tintColor);
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

  it("changes guild join date", async () => {
    const image = await getImageBuilder();
    image.guildJoinDate(new Date("2023-01-01T00:00:00Z"));
    const res = cheerio.load(image.result());
    const guildJoinDate = res("text[id='Guild Join Value']").text();
    expect(guildJoinDate).toBe("01.01.2023");
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
      const voiceActivity = res("text[id='Activity Voice Value']").text();
      expect(voiceActivity).toBe("100");
    });

    it("changes text activity amount", async () => {
      const image = await getImageBuilder();
      image.textActivity(100);
      const res = cheerio.load(image.result());
      const textActivity = res("text[id='Activity Text Value']").text();
      expect(textActivity).toBe("100");
    });
  });

  describe("marriage status", () => {
    it("changes days amount in marriage status", async () => {
      const image = await getImageBuilder();
      image.marriageStatusDays(100);
      const res = cheerio.load(image.result());
      const days = res("g[id='Marriage Status Text Top'] > text").text();
      expect(days).toBe("100 dni w związku");
    });

    it("pluralizes days amount in marriage status", async () => {
      const image = await getImageBuilder();
      image.marriageStatusDays(1);
      const res = cheerio.load(image.result());
      const days = res("g[id='Marriage Status Text Top'] > text").text();
      expect(days).toBe("1 dzień w związku");
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
      const imageHref = res("image[data-name='a831eb63836997d89e8e670b147f6a19.jpg']").attr("href");
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

  describe("achievements", () => {
    const rows = [1, 2, 3, 4];

    test.each(rows)("changes achievement %d title", async (row) => {
      const image = await getImageBuilder();
      image.achievementTitle(row, "Test Title");
      const res = cheerio.load(image.result());
      const title = res(`g[id='Showcase Achievement ${row}'] > text`).text();
      expect(title).toBe("Test Title");
    });

    test.each(rows)("hides all stars for achievement %d", async (row) => {
      const image = await getImageBuilder();
      image.achievementStars(row, 0);
      const res = cheerio.load(image.result());
      const elements = res(`g[id='Showcase Achievement ${row}']`)
        .children(`g[id^='Achievement Stars'][id$='${row}']`)
        .children("path[opacity='1']");
      expect(elements).toHaveLength(0);
    });

    test.each(rows.flatMap((row) => [1, 2, 3].map((stars) => ({ row, stars }))))(
      "sets visible stars for achievement %d to %d",
      async ({ row, stars }) => {
        const image = await getImageBuilder();
        image.achievementStars(row, stars);
        const res = cheerio.load(image.result());
        const elements = res(`g[id='Showcase Achievement ${row}']`)
          .children(`g[id^='Achievement Stars'][id$='${row}']`)
          .children("path[opacity='1']");
        expect(elements).toHaveLength(stars * 2); // 1 for each side
      },
    );

    test.each(rows)("changes achievement %d opacity", async (row) => {
      const image = await getImageBuilder();
      image.achievementOpacity(row, 0);
      const res = cheerio.load(image.result());
      const element = res(`g[id='Showcase Achievement ${row}']`).first();
      const opacity = element.attr("opacity");
      expect(opacity).toBe("0");
    });

    test.each([0, 1])("changes all achievement opacities to %d", async (opacity) => {
      const image = await getImageBuilder();
      image.allAchievementsOpacity(opacity);
      const res = cheerio.load(image.result());
      const elements = res("g[id='Showcase Achievements']").children(`g[opacity='${opacity}']`);
      expect(elements).toHaveLength(4);
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
