"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ProfileImageBuilder_svg;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileImageBuilder = void 0;
var date_fns_1 = require("date-fns");
var sharp_1 = require("sharp");
var pluralize_1 = require("../util/pluralize");
var PROFILE_DATE_FORMAT = "dd.MM.yyyy";
/**
 * Formats balance as a locale string with a space
 * instead of a non-breaking space.
 * &nbsp; doesn't seem to work in SVG <tspan> elements,
 * so we're using a regular space.
 */
function formatBalance(balance) {
    var nbspRe = new RegExp(String.fromCharCode(160), "g");
    return balance.toLocaleString("pl-PL").replace(nbspRe, " ");
}
/**
 * Formats a PNG image buffer into a base64 data URL.
 *
 * @param data Buffer containing PNG data
 */
function pngBufferToDataURL(data) {
    var encodedData = data.toString("base64");
    return "data:image/png;base64,".concat(encodedData);
}
/**
 * Profile image builder for generating user profile images.
 *
 * Figma export options:
 * - Format: SVG
 * - Ignore overlapping export layers
 * - Include "id" attribute
 */
var ProfileImageBuilder = /** @class */ (function () {
    function ProfileImageBuilder(svg) {
        _ProfileImageBuilder_svg.set(this, void 0);
        __classPrivateFieldSet(this, _ProfileImageBuilder_svg, svg, "f");
        // Combine 'Activity Voice Value' into a single <text> element
        this.combineTextElements("g[id='Activity Voice Value'] > text");
        // Combine 'Activity Voice Value' into a single <text> element
        this.combineTextElements("g[id='Activity Text Value'] > text");
        this.combineTextElements("g[id='Marriage Status Text Top'] > text", {
            sortTspanElements: true,
        });
        this.combineTextElements("g[id='Marriage Status Text Bottom'] > text");
        // HACK)) Should this whitespace even be there?
        // FIXME)) If possible, fix in Figma and remove this hack
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Marriage Status Text Bottom'] > text > tspan:nth(1)").remove();
        // Fix text alignment for 'Exp Value'
        this.createTextBoundingBox("text[id='Exp Value']", 402.5, // From Figma: 'Exp Value' -> Position -> X
        270);
        // Fix text alignment for 'Level Value'
        this.createTextBoundingBox("text[id='Level Value']", 408, // From Figma: 'Level Value' -> Position -> X
        259);
    }
    /**
     * Combine text elements matching a selector into a single element
     * with multiple <tspan> children.
     *
     * Move the `x` and `y` attributes from the first matched <text> element,
     * but remove them from all <tspan> elements afterwards.
     *
     * Move values of `font-size` and `fill` to individual <tspan> elements
     * and remove them from the <text> element.
     *
     * @param selector Selector for <text> elements which should be combined
     */
    ProfileImageBuilder.prototype.combineTextElements = function (selector, options) {
        var _this = this;
        var _a;
        // All <text> elements matching the selector
        var allTextElements = __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, selector);
        // First <text> element - all <tspan> elements will be moved here
        var firstTextElement = allTextElements.first();
        // First <tspan> element - we keep its position
        // FIXME)) This could be incorrect when <text> or <tspan> elements
        //         aren't ordered correctly.
        var firstTspan = firstTextElement.children("tspan").first();
        // Copy the position from <tspan> to <text>
        var x = firstTspan.attr("x");
        var y = firstTspan.attr("y");
        firstTextElement.attr("x", x).attr("y", y);
        var allTspanElements = allTextElements.children("tspan");
        // Move `font-size` and `fill` attrs to individual <tspan> elements
        for (var _i = 0, allTspanElements_1 = allTspanElements; _i < allTspanElements_1.length; _i++) {
            var element = allTspanElements_1[_i];
            var tspan = __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, element);
            var parent_1 = tspan.parent();
            tspan.attr("font-size", parent_1.attr("font-size"));
            tspan.attr("fill", parent_1.attr("fill"));
        }
        allTextElements.removeAttr("font-size").removeAttr("fill");
        // Move all <tspan> elements to the first <text> element
        allTspanElements.appendTo(firstTextElement);
        // allTspanElements is now the same as firstTextElement.children("tspan")
        // Sort <tspan> elements after consolidating them into a single <text> element
        if ((_a = options === null || options === void 0 ? void 0 : options.sortTspanElements) !== null && _a !== void 0 ? _a : false) {
            var sortedTspanElements = allTspanElements.get().sort(function (a, b) {
                var aX = __classPrivateFieldGet(_this, _ProfileImageBuilder_svg, "f").call(_this, a).attr("x");
                var bX = __classPrivateFieldGet(_this, _ProfileImageBuilder_svg, "f").call(_this, b).attr("x");
                if (!aX || !bX)
                    return 0;
                return Number(aX) - Number(bX);
            });
            // Replace <tspan> elements with the same, but sorted elements
            allTspanElements.replaceWith(sortedTspanElements);
        }
        // Remove inline x and y attributes from <tspan> elements
        allTspanElements.removeAttr("x").removeAttr("y");
        // Remove all other <text> elements
        allTextElements.slice(1).remove();
    };
    /**
     * Resize a <text> element's bounding box to the given position and width
     * and center its contents.
     *
     * @param selector Selector for the <text> element
     * @param x Horizontal position of the text bounding box
     * @param width Width of the text bounding box
     */
    ProfileImageBuilder.prototype.createTextBoundingBox = function (selector, x, width) {
        // Create a bounding box and center the text
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, selector)
            .attr("x", (x + width / 2).toString())
            .attr("width", width.toString())
            .attr("text-anchor", "middle");
        // Remove absolute x position from the <tspan>
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, selector).children("tspan").removeAttr("x");
    };
    /**
     * Apply a tint color to all elements that support tinting.
     *
     * NOTE: This function's behavior depends on the default (placeholder) tint color
     *       staying constant. See `defaultTintColor` and its upsage in the function's body.
     *
     * @param value Bun-compatible color value (e.g. `#ff0000`)
     */
    ProfileImageBuilder.prototype.tintColor = function (value) {
        var defaultTintColor = "#3C3E43";
        var elements = [
            // Left
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Nick + Title Background"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'rect[id="Stats Bar"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Stats Caps Icon"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Stats Items Icon"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'g[id="Activity Voice Icon"] path'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'g[id="Activity Text Icon"] path'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id=\"Marriage Status Text\"] tspan[fill=\"".concat(defaultTintColor, "\"]")),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'text[id="Account Creation Value"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'text[id="Guild Join Value"]'),
            // Middle
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'text[id="Exp Value"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Exp Icon"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'text[id="Exp Text"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Level Background Wave 1 Level"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Level Background Wave 1 Mask"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Level Background Wave 2 Level"]'),
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'path[id="Level Background Wave 2 Mask"]'),
            // Right
            __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, 'rect[id="Showcase Header Background"]'),
        ];
        var color = Bun.color(value, "hex");
        if (!color) {
            throw new Error("Invalid color value: ".concat(value));
        }
        for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
            var element = elements_1[_i];
            element.attr("fill", color);
        }
        return this;
    };
    ProfileImageBuilder.prototype.nickname = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Nickname Value'] > tspan").text(value);
        return this;
    };
    ProfileImageBuilder.prototype.title = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Title Value'] > tspan").text(value);
        return this;
    };
    ProfileImageBuilder.prototype.balance = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Stats Caps Value'] > tspan").text(formatBalance(value));
        return this;
    };
    ProfileImageBuilder.prototype.rep = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Stats Rep Value'] > tspan").text("".concat(value, " rep"));
        return this;
    };
    ProfileImageBuilder.prototype.items = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Stats Items Value'] > tspan").text(value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.voiceActivity = function (value) {
        var group = "g[id='Activity Voice Value']";
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "".concat(group, " > text > tspan:nth(0)")).text(value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.textActivity = function (value) {
        var group = "g[id='Activity Text Value']";
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "".concat(group, " > text > tspan:nth(0)")).text(value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.marriageStatusDays = function (value) {
        var group = __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Marriage Status Text Top'] > text");
        group.children("tspan:nth(1)").text(value.toString());
        // Leave a space between day amount and text
        group.children("tspan:nth(2)").text(" ".concat(pluralize_1.pluralizers.genitiveDays(value)));
        return this;
    };
    ProfileImageBuilder.prototype.marriageStatusUsername = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Marriage Status Text Bottom'] > text > tspan:last").text(value);
        return this;
    };
    ProfileImageBuilder.prototype.marriageStatusOpacity = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Marriage Status Text']").attr("opacity", value.toString());
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "path[id='Marriage Status Icon']").attr("opacity", value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.guildJoinDate = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Guild Join Value'] > tspan").text((0, date_fns_1.format)(value, PROFILE_DATE_FORMAT));
        return this;
    };
    ProfileImageBuilder.prototype.accountCreationDate = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Account Creation Value'] > tspan").text((0, date_fns_1.format)(value, PROFILE_DATE_FORMAT));
        return this;
    };
    ProfileImageBuilder.prototype.avatarImage = function (image) {
        // TODO)) Resolve this image via the final avatar element
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "image[data-name='discordyellow.png']").attr("href", pngBufferToDataURL(image));
        return this;
    };
    ProfileImageBuilder.prototype.marriageAvatarImage = function (image) {
        // TODO)) Resolve this image via the final avatar element
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "image[data-name='a831eb63836997d89e8e670b147f6a19.jpg']").attr("href", pngBufferToDataURL(image));
        return this;
    };
    ProfileImageBuilder.prototype.marriageAvatarOpacity = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Marriage']").attr("opacity", value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.exp = function (current, target) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Exp Value'] > tspan").text("".concat(current, "/").concat(target));
        return this;
    };
    ProfileImageBuilder.prototype.level = function (value) {
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "text[id='Level Value'] > tspan").text(value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.backgroundImage = function (image) {
        // TODO)) Resolve this image via the final background element
        __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "image[data-name='background.png']").attr("href", pngBufferToDataURL(image));
        return this;
    };
    /**
     * Set the image of a showcase badge and make it visible.
     *
     * Incorrect row or column values will be ignored.
     *
     * This is a convenience shortcut for calling:
     * - `showcaseBadgeImage(row, col, value)`
     * - `showcaseBadgeOpacity(row, col, 1)`
     * - `showcaseBadgeBackgroundStrokeWidth(row, col, 0)`
     *
     * @param row Row index (1-3)
     * @param col Column index (1-5)
     * @param image PNG image data buffer
     */
    ProfileImageBuilder.prototype.showcaseBadge = function (row, col, image) {
        return this.showcaseBadgeImage(row, col, image)
            .showcaseBadgeOpacity(row, col, 1)
            .showcaseBadgeBackgroundStrokeWidth(row, col, 0);
    };
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
     * @param image PNG image data buffer
     */
    ProfileImageBuilder.prototype.showcaseBadgeImage = function (row, col, image) {
        var elementId = this.showcaseBadgeElementId(row, col);
        // <circle id="${elementId}" fill="url(#...)"/>
        var fill = this.showcaseBadgeContainer()
            .children("circle[id='".concat(elementId, "']"))
            .first()
            .attr("fill");
        if (!fill) {
            throw new Error("`fill` attribute not found for badge '".concat(elementId, "'"));
        }
        var defs = __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "defs").first();
        // `url(#...)` -> `...`
        var fillUrl = fill.replace("url(#", "").replace(")", "");
        // <pattern id="${fillUrl}>
        var patternElement = defs.children("pattern[id='".concat(fillUrl, "']")).first();
        if (!patternElement) {
            throw new Error("Pattern element not found for badge '".concat(elementId, "'"));
        }
        // <use xlink:href="..."/>
        var imageHref = patternElement.children("use").first().attr("href");
        if (!imageHref) {
            throw new Error("Pattern element href not found for badge '".concat(elementId, "'"));
        }
        var imageId = imageHref.replace("#", "");
        // Find the placeholder image element
        var imageElement = defs.children("image[id='".concat(imageId, "']")).first();
        var newImageId = "badge_image_".concat(row, "_").concat(col);
        // Clone the placeholder image with a new ID and href
        imageElement
            .clone()
            .attr("id", newImageId)
            .attr("href", pngBufferToDataURL(image))
            .appendTo(defs);
        // Update the pattern to use the new image
        patternElement.children("use").first().attr("href", "#".concat(newImageId));
        return this;
    };
    /**
     * Set the opacity of a showcase badge.
     *
     * Incorrect row or column values will be ignored.
     *
     * @param row Row index (1-3)
     * @param col Column index (1-5)
     * @param value Opacity value (0-1)
     */
    ProfileImageBuilder.prototype.showcaseBadgeOpacity = function (row, col, value) {
        var elementId = "Showcase Badge ".concat(row, ":").concat(col);
        this.showcaseBadgeContainer()
            .children("circle[id='".concat(elementId, "']"))
            .first()
            .attr("opacity", value.toString());
        return this;
    };
    /**
     * Set the opacity of all showcase badges.
     * This will override individual badge opacities.
     * @param value Opacity value (0-1)
     */
    ProfileImageBuilder.prototype.allShowcaseBadgesOpacity = function (value) {
        this.showcaseBadgeContainer().children("circle").attr("opacity", value.toString());
        return this;
    };
    ProfileImageBuilder.prototype.showcaseBadgeElementId = function (row, col) {
        return "Showcase Badge ".concat(row, ":").concat(col);
    };
    ProfileImageBuilder.prototype.showcaseBadgeContainer = function () {
        return __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Showcase Badges']");
    };
    /**
     * Set the background stroke width of a showcase badge.
     *
     * Incorrect row or column values will be ignored.
     *
     * @param row Row index (1-3)
     * @param col Column index (1-5)
     * @param value Stroke width value
     */
    ProfileImageBuilder.prototype.showcaseBadgeBackgroundStrokeWidth = function (row, col, value) {
        var elementId = this.showcaseBadgeBackgroundElementId(row, col);
        this.showcaseBadgeBackgroundsContainer()
            .children("circle[id='".concat(elementId, "']"))
            .first()
            .attr("stroke-width", value.toString());
    };
    ProfileImageBuilder.prototype.showcaseBadgeBackgroundElementId = function (row, col) {
        return "Showcase Badge Background ".concat(row, ":").concat(col);
    };
    ProfileImageBuilder.prototype.showcaseBadgeBackgroundsContainer = function () {
        return __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").call(this, "g[id='Showcase Badge Backgrounds']");
    };
    ProfileImageBuilder.prototype.result = function () {
        return __classPrivateFieldGet(this, _ProfileImageBuilder_svg, "f").html("svg");
    };
    ProfileImageBuilder.prototype.toSharp = function () {
        return (0, sharp_1.default)(Buffer.from(this.result()), { density: 96 });
    };
    return ProfileImageBuilder;
}());
exports.ProfileImageBuilder = ProfileImageBuilder;
_ProfileImageBuilder_svg = new WeakMap();
