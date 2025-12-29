/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { ButtonStyle } from "discord.js";
import { ActionRow, Button, reconcile, render, TextDisplay } from "../src";

describe("JSX", () => {
  it("renders text and components together", () => {
    const result = render(
      <>
        Text
        <ActionRow>
          <Button label="Click me" style={ButtonStyle.Primary} customId="click" />
        </ActionRow>
      </>,
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "components": [
          TextDisplayBuilder {
            "data": {
              "content": "Text",
              "type": 10,
            },
          },
          ActionRowBuilder {
            "components": [
              ButtonBuilder {
                "data": {
                  "custom_id": "click",
                  "emoji": undefined,
                  "label": "Click me",
                  "style": 1,
                  "type": 2,
                },
              },
            ],
            "data": {
              "type": 1,
            },
          },
        ],
        "files": [],
        "flags": 32768,
      }
    `);
  });

  it("renders nested fragments correctly", () => {
    const Part1 = () => <>Hello</>;
    const Part2 = () => <>World</>;
    const result = render(
      <>
        <Part1 /> <Part2 />
      </>,
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "components": [
          TextDisplayBuilder {
            "data": {
              "content": "Hello",
              "type": 10,
            },
          },
          TextDisplayBuilder {
            "data": {
              "content": " ",
              "type": 10,
            },
          },
          TextDisplayBuilder {
            "data": {
              "content": "World",
              "type": 10,
            },
          },
        ],
        "files": [],
        "flags": 32768,
      }
    `);
  });

  it("renders empty fragment as empty array", () => {
    // biome-ignore lint/complexity/noUselessFragments: we are testing fragments here
    expect(<></>).toMatchInlineSnapshot(`[]`);
  });

  it("renders simple text as string", () => {
    expect(<>Simple Text</>).toMatchInlineSnapshot(`
      [
        "Simple Text",
      ]
    `);
  });

  it("renders conditional rendering", () => {
    const isVisible = true;

    expect(
      <>
        {isVisible ? <TextDisplay content="Visible Text" /> : null}
        {!isVisible ? <TextDisplay content="Hidden Text" /> : null}
      </>,
    ).toMatchInlineSnapshot(`
      [
        TextDisplayBuilder {
          "data": {
            "content": "Visible Text",
            "type": 10,
          },
        },
      ]
    `);
  });
});

describe("reconcile", () => {
  it("is idempotent - calling twice produces same result", () => {
    const element = (
      <>
        <TextDisplay content="Hello" />
        <Button label="Click" style={ButtonStyle.Primary} customId="btn" />
      </>
    );

    const once = reconcile(element);
    const twice = reconcile(once);

    expect(twice).toEqual(once);
  });

  it("passes through already-resolved builders unchanged", () => {
    const button = <Button label="Test" style={ButtonStyle.Primary} customId="test" />;
    const result = reconcile(button);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(button); // Same reference
  });

  it("flattens nested arrays", () => {
    const nested = [
      [<TextDisplay content="A" />],
      [[<TextDisplay content="B" />], <TextDisplay content="C" />],
    ];

    const result = reconcile(nested);

    expect(result).toHaveLength(3);
  });

  it("filters out null, undefined, and boolean values", () => {
    const withNulls = [
      <TextDisplay content="Real" />,
      null,
      undefined,
      true,
      false,
      <TextDisplay content="Also Real" />,
    ];

    const result = reconcile(withNulls);

    expect(result).toHaveLength(2);
  });

  it("resolves user-defined components (VNodes)", () => {
    const MyComponent = () => <TextDisplay content="From component" />;

    const result = reconcile(<MyComponent />);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": "From component",
          "type": 10,
        },
      }
    `);
  });

  it("resolves deeply nested user components", () => {
    const Inner = () => <TextDisplay content="Inner" />;
    const Middle = () => <Inner />;
    const Outer = () => <Middle />;

    const result = reconcile(<Outer />);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": "Inner",
          "type": 10,
        },
      }
    `);
  });

  it("handles mixed VNodes and resolved builders", () => {
    const MyText = () => <TextDisplay content="Component text" />;

    const mixed = (
      <>
        <TextDisplay content="Direct" />
        <MyText />
        <Button label="Button" style={ButtonStyle.Primary} customId="btn" />
      </>
    );

    const result = reconcile(mixed);

    expect(result).toHaveLength(3);
  });

  it("preserves strings and numbers", () => {
    const result = reconcile(["hello", 42, "world"]);

    expect(result).toEqual(["hello", 42, "world"]);
  });

  it("returns empty array for null input", () => {
    expect(reconcile(null)).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    expect(reconcile(undefined)).toEqual([]);
  });

  it("returns empty array for boolean input", () => {
    expect(reconcile(true)).toEqual([]);
    expect(reconcile(false)).toEqual([]);
  });
});
