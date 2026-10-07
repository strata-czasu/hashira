import { describe, expect, mock, spyOn, test } from "bun:test";
import {
  REST,
  type RESTGetAPIApplicationGuildCommandsResult,
  type RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";

import { Hashira } from "../src";
import { syncGuildCommands } from "../src/commandRegistration";

function makeRest(initial: RESTGetAPIApplicationGuildCommandsResult = []) {
  return {
    get: mock<REST["get"]>(async () => initial),
    post: mock<REST["post"]>(async () => ({})),
    patch: mock<REST["patch"]>(async () => ({})),
  };
}

function command(id: string, name: string, type: 1 | 2 | 3 = 1) {
  return {
    id,
    name,
    type,
    application_id: "100",
    description: "Old",
    version: "1",
    default_member_permissions: null,
  };
}

describe("incremental guild command registration", () => {
  test("updates local commands by ID and creates missing commands without touching foreign commands", async () => {
    const rest = makeRest([command("native", "confirm"), command("existing", "profile")]);
    await syncGuildCommands(rest, "100", "200", [
      { name: "profile", description: "Profile", type: 1 },
      { name: "daily", description: "Daily", type: 1 },
    ]);
    expect(rest.get.mock.calls).toEqual([[Routes.applicationGuildCommands("100", "200")]]);
    expect(rest.patch.mock.calls).toEqual([
      [
        Routes.applicationGuildCommand("100", "200", "existing"),
        {
          body: {
            name: "profile",
            description: "Profile",
            options: [],
            default_member_permissions: null,
            name_localizations: null,
            description_localizations: null,
            nsfw: false,
          },
        },
      ],
    ]);
    expect(rest.post).toHaveBeenCalledTimes(1);
    expect(rest.post.mock.calls[0]?.[0]).toEqual(Routes.applicationGuildCommands("100", "200"));
  });

  test("distinguishes slash, user and message commands with the same name", async () => {
    const rest = makeRest([command("user", "profile", 2), command("message", "profile", 3)]);
    await syncGuildCommands(rest, "100", "200", [
      { name: "profile", description: "Profile", type: 1 },
      { name: "profile", type: 2 },
      { name: "profile", type: 3 },
    ]);
    expect(rest.post).toHaveBeenCalledTimes(1);
    expect(rest.patch.mock.calls.map(([route]) => route)).toEqual([
      Routes.applicationGuildCommand("100", "200", "user"),
      Routes.applicationGuildCommand("100", "200", "message"),
    ]);
    for (const [, options] of rest.patch.mock.calls) {
      expect(options?.body).not.toHaveProperty("type");
      expect(options?.body).not.toHaveProperty("options");
    }
  });

  test("preserves group options, permissions and translations", async () => {
    const definition: RESTPostAPIApplicationCommandsJSONBody = {
      name: "currency",
      description: "Currency",
      type: 1,
      nsfw: true,
      default_member_permissions: "8",
      name_localizations: { pl: "waluta" },
      description_localizations: { pl: "Waluta" },
      options: [{ type: 1, name: "list", description: "List currencies" }],
    };
    const rest = makeRest();
    await syncGuildCommands(rest, "100", "200", [definition]);
    expect(rest.post.mock.calls[0]?.[1]).toEqual({ body: definition });
  });

  test("an empty local catalog performs no REST operations", async () => {
    const rest = makeRest([command("native", "confirm")]);
    await syncGuildCommands(rest, "100", "200", []);
    expect(rest.get).not.toHaveBeenCalled();
    expect(rest.post).not.toHaveBeenCalled();
    expect(rest.patch).not.toHaveBeenCalled();
  });

  test("propagates REST failures and stops further writes", async () => {
    const rest = makeRest();
    const error = new Error("Registration failed");
    rest.post.mockImplementation(async () => {
      throw error;
    });
    await expect(
      syncGuildCommands(rest, "100", "200", [
        { name: "one", description: "One" },
        { name: "two", description: "Two" },
      ]),
    ).rejects.toBe(error);
    expect(rest.post).toHaveBeenCalledTimes(1);
  });
});

describe("Hashira registration entry points", () => {
  test("registers the composed slash and context menu catalog without bulk writes or deletes", async () => {
    const get = spyOn(REST.prototype, "get").mockResolvedValue([]);
    const post = spyOn(REST.prototype, "post").mockResolvedValue({});
    const patch = spyOn(REST.prototype, "patch").mockResolvedValue({});
    const put = spyOn(REST.prototype, "put").mockRejectedValue(new Error("Unexpected bulk write"));
    const remove = spyOn(REST.prototype, "delete").mockRejectedValue(
      new Error("Unexpected deletion"),
    );
    try {
      const bot = new Hashira({ name: "test" })
        .command("profile", (builder) => builder.setDescription("Profile").handle(async () => {}))
        .userContextMenu("profile", null, async () => {})
        .messageContextMenu("profile", null, async () => {});
      await bot.registerGuildCommands("test-token", "200", "100");
      expect(post.mock.calls.map(([, options]) => options?.body)).toEqual([
        expect.objectContaining({ name: "profile", type: 1 }),
        expect.objectContaining({ name: "profile", type: 2 }),
        expect.objectContaining({ name: "profile", type: 3 }),
      ]);
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(patch).not.toHaveBeenCalled();
    } finally {
      for (const spy of [get, post, patch, put, remove]) spy.mockRestore();
    }
  });
});
