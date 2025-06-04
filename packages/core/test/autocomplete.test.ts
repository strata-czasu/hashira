import { describe, test } from "bun:test";
import { expectTypeOf } from "expect-type";
import { Hashira } from "../src";

// Ensure autocomplete method is chainable and typed

describe("SlashCommand autocomplete", () => {
  const app = new Hashira({ name: "auto" }).command("foo", (cmd) =>
    cmd
      .setDescription("test")
      .addString("bar", (opt) => opt.setDescription("desc").setAutocomplete(true))
      .autocomplete(async () => {})
      .handle(async () => {})
  );

  test("chainable", () => {
    expectTypeOf(app).toEqualTypeOf<Hashira>();
  });
});
