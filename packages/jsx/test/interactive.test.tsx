/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ButtonStyle } from "discord.js";
import { ActionRow, Button } from "../src";

describe("Button", () => {
  it("renders primary button with label", () => {
    expect(
      <Button label="Click me" style={ButtonStyle.Primary} customId="btn-primary" />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-primary",
          "emoji": undefined,
          "label": "Click me",
          "style": 1,
          "type": 2,
        },
      }
    `);
  });

  it("renders secondary button (default style)", () => {
    expect(
      <Button
        label="Secondary"
        customId="btn-secondary"
        style={ButtonStyle.Secondary}
      />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-secondary",
          "emoji": undefined,
          "label": "Secondary",
          "style": 2,
          "type": 2,
        },
      }
    `);
  });

  it("renders success button", () => {
    expect(
      <Button label="Success" style={ButtonStyle.Success} customId="btn-success" />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-success",
          "emoji": undefined,
          "label": "Success",
          "style": 3,
          "type": 2,
        },
      }
    `);
  });

  it("renders danger button", () => {
    expect(
      <Button label="Danger" style={ButtonStyle.Danger} customId="btn-danger" />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-danger",
          "emoji": undefined,
          "label": "Danger",
          "style": 4,
          "type": 2,
        },
      }
    `);
  });

  it("renders link button with URL", () => {
    expect(
      <Button label="Visit Site" url="https://example.com" />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "emoji": undefined,
          "label": "Visit Site",
          "style": 5,
          "type": 2,
          "url": "https://example.com",
        },
      }
    `);
  });

  it("renders premium button with SKU ID", () => {
    expect(<Button skuId="sku_123456" />).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "emoji": undefined,
          "sku_id": "sku_123456",
          "style": 6,
          "type": 2,
        },
      }
    `);
  });

  it("renders disabled button", () => {
    expect(
      <Button
        label="Disabled"
        style={ButtonStyle.Primary}
        customId="btn-disabled"
        disabled
      />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-disabled",
          "disabled": true,
          "emoji": undefined,
          "label": "Disabled",
          "style": 1,
          "type": 2,
        },
      }
    `);
  });

  it("renders button with emoji", () => {
    expect(
      <Button
        label="With Emoji"
        style={ButtonStyle.Primary}
        customId="btn-emoji"
        emoji="👍"
      />,
    ).toMatchInlineSnapshot(`
      ButtonBuilder {
        "data": {
          "custom_id": "btn-emoji",
          "emoji": {
            "animated": false,
            "id": undefined,
            "name": "👍",
          },
          "label": "With Emoji",
          "style": 1,
          "type": 2,
        },
      }
    `);
  });
});

describe("ActionRow with Buttons", () => {
  it("renders action row with multiple buttons", () => {
    expect(
      <ActionRow>
        <Button label="One" style={ButtonStyle.Primary} customId="btn-1" />
        <Button label="Two" style={ButtonStyle.Secondary} customId="btn-2" />
      </ActionRow>,
    ).toMatchInlineSnapshot(`
      ActionRowBuilder {
        "components": [
          ButtonBuilder {
            "data": {
              "custom_id": "btn-1",
              "emoji": undefined,
              "label": "One",
              "style": 1,
              "type": 2,
            },
          },
          ButtonBuilder {
            "data": {
              "custom_id": "btn-2",
              "emoji": undefined,
              "label": "Two",
              "style": 2,
              "type": 2,
            },
          },
        ],
        "data": {
          "type": 1,
        },
      }
    `);
  });
});
