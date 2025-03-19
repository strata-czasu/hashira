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

    // Combine 'Activity Voice Value' into a single <text> element
    this.combineTextElements("g[id='Activity Voice Value'] > text");

    // Combine 'Activity Voice Value' into a single <text> element
    this.combineTextElements("g[id='Activity Text Value'] > text");
  }

  /**
   * Combine text elements matching a selector into a single element
   * with multiple <tspan> children.
   *
   * Move the `x` and `y` attributes from the first matched <text> element,
   * but remove them from all <tspan> elements afterwards.
   *
   * Move the value of `font-size` to individual <tspan> elements and remove
   * it from the <text> element.
   *
   * @param selector Selector for <text> elements which should be combined
   */
  private combineTextElements(selector: string) {
    // First <text> element - all <tspan> elements will be moved here
    const firstTextElement = this.#svg(selector).first();

    // First <tspan> element - we keep its position
    const firstTspan = firstTextElement.children("tspan").first();

    // Copy the position from <tspan> to <text>
    const x = firstTspan.attr("x");
    const y = firstTspan.attr("y");
    firstTextElement.attr("x", x).attr("y", y);

    const allTspanElements = this.#svg(selector).children("tspan");

    // Copy the `font-size` attr to individual <tspan> elements
    for (const element of allTspanElements) {
      const tspan = this.#svg(element);
      const fontSize = tspan.parent().attr("font-size");
      tspan.attr("font-size", fontSize);
    }

    // Remove `font-size` from <text> elements
    this.#svg(selector).removeAttr("font-size");

    // Remove the inline x and y attributes from the <tspan> element
    allTspanElements.removeAttr("x").removeAttr("y");

    // Move all <tspan> elements to the first <text> element
    allTspanElements.appendTo(firstTextElement);

    // Remove all other <text> elements
    this.#svg(selector).slice(1).remove();
  }

  /**
   * Apply a tint color to all elements that support tinting.
   *
   * @param value Color value in a SVG-supported format (e.g. `#ff0000`)
   */
  public tintColor(value: string) {
    const elements = [
      // Left
      this.#svg('path[id="Nick + Title Background"]'),
      this.#svg('rect[id="Stats Bar"]'),
      this.#svg('path[id="Stats Caps Icon"]'),
      this.#svg('path[id="Stats Items Icon"]'),
      this.#svg('g[id="Activity Voice Icon"] > path'), // Voice icon has multiple paths
      this.#svg('path[id="Activity Text Icon"]'),
      // TODO: Clean up marriage text
      this.#svg('g[id="Marriage Status Text"]:nth-child(1)'),
      this.#svg('g[id="Marriage Status Text"]:nth-child(2)'),
      this.#svg('text[id="Account Creation Value"]'),
      this.#svg('text[id="Guild Join Value"]'),
      // Middle
      this.#svg('text[id="Exp Value"]'),
      this.#svg('path[id="Exp Icon"]'),
      this.#svg('text[id="Exp Text"]'),
      this.#svg('path[id="Level Background Wave 1 Level"]'),
      this.#svg('path[id="Level Background Wave 1 Mask"]'),
      this.#svg('path[id="Level Background Wave 2 Level"]'),
      this.#svg('path[id="Level Background Wave 2 Mask"]'),
      // Right
      this.#svg('rect[id="Showcase Header Background"]'),
    ];

    for (const element of elements) {
      element.attr("fill", value);
    }
    return this;
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

  public rep(value: string) {
    this.#svg("text[id='Stats Rep Value'] > tspan").text(value);
    return this;
  }

  public items(value: string) {
    this.#svg("text[id='Stats Items Value'] > tspan").text(value);
    return this;
  }

  public voiceActivity(value: number) {
    const group = "g[id='Activity Voice Value']";
    this.#svg(`${group} > text > tspan:nth(0)`).text(value.toString());
    return this;
  }

  public textActivity(value: number) {
    const group = "g[id='Activity Text Value']";
    this.#svg(`${group} > text > tspan:nth(0)`).text(value.toString());
    return this;
  }

  public guildJoinDate(value: string) {
    this.#svg("text[id='Guild Join Value'] > tspan").text(value);
    return this;
  }

  public accountCreationDate(value: string) {
    this.#svg("text[id='Account Creation Value'] > tspan").text(value);
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

  public exp(value: string) {
    this.#svg("text[id='Exp Value'] > tspan").text(value);
    return this;
  }

  public level(value: number) {
    this.#svg("text[id='Level Value'] > tspan").text(value.toString());
    return this;
  }

  public backgroundImage(value: string) {
    this.#svg("image[data-name='background.png']").attr("href", value);
    return this;
  }

  /**
   * Set the image of a showcase badge and make it visible.
   *
   * Incorrect row or column values will be ignored.
   *
   * This is a convenience shortcut for
   * `showcaseBadgeImage(row, col, value)` and `showcaseBadgeOpacity(row, col, 1)`.
   *
   * @param row Row index (1-3)
   * @param col Column index (1-5)
   * @param value Image data URL
   */
  public showcaseBadge(row: number, col: number, value: string) {
    return this.showcaseBadgeImage(row, col, value).showcaseBadgeOpacity(row, col, 1);
  }

  /**
   * Set the image of a showcase badge.
   *
   * Incorrect row or column values will be ignored.
   *
   * WARN: Calling this multiple times on the same row and column
   * is undefined behavior and may not work as expected.
   *
   * @param row Row index (1-3)
   * @param col Column index (1-5)
   * @param value Image data URL
   */
  public showcaseBadgeImage(row: number, col: number, value: string) {
    const elementId = `Showcase Badge ${row}:${col}`;

    // <circle id="${elementId}" fill="url(#...)"/>
    const fill = this.showcaseBadgeContainer()
      .children(`circle[id='${elementId}']`)
      .first()
      .attr("fill");
    if (!fill) {
      console.error(`\`fill\` attribute not found for badge '${elementId}'`);
      return this;
    }

    // `url(#...)` -> `...`
    const fillUrl = fill.replace("url(#", "").replace(")", "");
    // <pattern id="${fillUrl}>
    const patternElement = this.#svg(`defs > pattern[id='${fillUrl}']`).first();
    if (!patternElement) {
      console.error(`Pattern fill element not found for badge '${elementId}'`);
      return this;
    }

    // <use xlink:href="..."/>
    const imageHref = patternElement.children("use").first().attr("href");
    if (!imageHref) {
      console.error(`Image href not found for badge '${elementId}'`);
      return this;
    }
    const imageId = imageHref.replace("#", "");

    const defs = this.#svg("defs").first();
    // Find the placeholder image element
    const image = defs.children(`image[id='${imageId}']`).first();

    const newImageId = `badge_image_${row}_${col}`;
    // Clone the placeholder image with a new ID and href
    image.clone().attr("id", newImageId).attr("href", value).appendTo(defs);
    // Update the pattern to use the new image
    patternElement.children("use").first().attr("href", `#${newImageId}`);

    return this;
  }

  /**
   * Set the opacity of a showcase badge.
   *
   * Incorrect row or column values will be ignored.
   *
   * @param row Row index (1-3)
   * @param col Column index (1-5)
   * @param value Opacity value (0-1)
   */
  public showcaseBadgeOpacity(row: number, col: number, value: number) {
    const elementId = `Showcase Badge ${row}:${col}`;
    this.showcaseBadgeContainer()
      .children(`circle[id='${elementId}']`)
      .first()
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
    // Fix text alignment for 'Exp Value'
    const expValueX = 402.5; // From Figma: 'Exp Value' -> Position -> X
    const expValueWidth = 270; // From Figma: 'Exp Value' -> Layout -> Width
    // Create a bounding box and center the text
    this.#svg("text[id='Exp Value']")
      .attr("x", (expValueX + expValueWidth / 2).toString())
      .attr("width", expValueWidth.toString())
      .attr("text-anchor", "middle");
    // Remove absolute x position from the tspan
    this.#svg("text[id='Exp Value'] > tspan").removeAttr("x");

    // Fix text alignment for 'Level Value'
    const levelValueX = 408; // From Figma: 'Level Value' -> Position -> X
    const levelValueWidth = 259; // From Figma: 'Level Value' -> Layout -> Width
    // Create a bounding box and center the text
    this.#svg("text[id='Level Value']")
      .attr("x", (levelValueX + levelValueWidth / 2).toString())
      .attr("width", levelValueWidth.toString())
      .attr("text-anchor", "middle");
    // Remove absolute x position from the tspan
    this.#svg("text[id='Level Value'] > tspan").removeAttr("x");

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
