import type * as cheerio from "cheerio";
import sharp from "sharp";

/**
 * Profile image builder for generating user profile images.
 *
 * Figma export options:
 * - Format: SVG
 * - Ignore overlapping export layers
 * - Include "id" attribute
 */
export class ProfileImageBuilder {
  #svg: cheerio.CheerioAPI;

  constructor(svg: cheerio.CheerioAPI) {
    this.#svg = svg;
  }

  public nickname(value: string) {
    this.#svg("text[id='Nickname Value'] > tspan").text(value);
    return this;
  }

  public title(value: string) {
    this.#svg("text[id='Title Value'] > tspan").text(value);
    return this;
  }

  public balance(value: string) {
    this.#svg("text[id='Stats Caps Value'] > tspan").text(value);
    return this;
  }

  public avatarImage(value: string) {
    this.#svg("image[data-name='discordyellow.png']").attr("href", value);
    return this;
  }

  public marriageImage(value: string) {
    this.#svg("image[data-name='a831eb63836997d89e8e670b147f6a19.jpg']").attr(
      "href",
      value,
    );
    return this;
  }

  public marriageOpacity(value: number) {
    this.#svg("g[id='Marriage']").attr("opacity", value.toString());
    return this;
  }

  /**
   * Set the opacity of a showcase badge.
   * Incorrect row or column values will be ignored.
   * @param row Row index (1-3)
   * @param col Column index (1-5)
   * @param value Opacity value (0-1)
   */
  public showcaseBadgeOpacity(row: number, col: number, value: number) {
    const elementId = `Showcase Badge ${row}:${col}`;
    this.showcaseBadgeContainer()
      .children(`circle[id='${elementId}']`)
      .attr("opacity", value.toString());
    return this;
  }

  /**
   * Set the opacity of all showcase badges.
   * This will override individual badge opacities.
   * @param value Opacity value (0-1)
   */
  public allShowcaseBadgesOpacity(value: number) {
    this.showcaseBadgeContainer().children("circle").attr("opacity", value.toString());
    return this;
  }

  private showcaseBadgeContainer() {
    return this.#svg("g[id='Showcase Badges']");
  }

  public result() {
    return this.#svg
      .html()
      .replace("<html>", "")
      .replace("</html>", "")
      .replace("<body>", "")
      .replace("</body>", "")
      .replace("<head>", "")
      .replace("</head>", "");
  }

  public toSharp() {
    return sharp(Buffer.from(this.result()));
  }
}
