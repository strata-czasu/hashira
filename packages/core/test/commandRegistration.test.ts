import { describe, expect, mock, spyOn, test } from "bun:test";
import {
  REST,
  type RESTGetAPIApplicationGuildCommandsResult,
  type RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Hashira } from "../src";
import {
  loadCommandOwnership,
  parseCommandOwnership,
  validateCommandOwnership,
} from "../src/commandOwnership";
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

  test("rejects any ownership conflict before listing or mutating commands", async () => {
    const ownership = parseCommandOwnership({
      applicationId: "100",
      defaultOwner: "hashira",
      commands: [{ guildId: "200", type: 1, name: "confirm", owner: "kasutera" }],
    });
    const rest = makeRest();
    await expect(
      syncGuildCommands(
        rest,
        "100",
        "200",
        [
          { name: "profile", description: "Profile" },
          { name: "confirm", description: "Confirm" },
        ],
        ownership,
      ),
    ).rejects.toThrow("belongs to kasutera, not hashira");
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

describe("shared command ownership", () => {
  test("defaults to Hashira with explicit guild/type/name exceptions", () => {
    const ownership = parseCommandOwnership({
      applicationId: "100",
      defaultOwner: "hashira",
      commands: [{ guildId: "200", type: 1, name: "confirm", owner: "kasutera" }],
    });
    expect(() =>
      validateCommandOwnership("100", "200", "kasutera", [{ name: "confirm" }], ownership),
    ).not.toThrow();
    expect(() =>
      validateCommandOwnership("100", "200", "hashira", [{ name: "confirm", type: 2 }], ownership),
    ).not.toThrow();
    expect(() =>
      validateCommandOwnership("100", "300", "kasutera", [{ name: "confirm" }], ownership),
    ).toThrow();
    expect(() => validateCommandOwnership("999", "200", "hashira", [], ownership)).toThrow(
      "another Discord application",
    );
  });

  test("rejects unassigned commands and duplicate definitions", () => {
    const ownership = parseCommandOwnership({ applicationId: "100", commands: [] });
    expect(() =>
      validateCommandOwnership("100", "200", "hashira", [{ name: "profile" }], ownership),
    ).toThrow("no runtime");
    expect(() =>
      validateCommandOwnership("100", "200", "hashira", [
        { name: "profile" },
        { name: "profile", type: 1 },
      ]),
    ).toThrow("Duplicate local command");
  });

  test("rejects malformed policies and conflicting ownership entries", () => {
    for (const value of [
      null,
      { applicationId: "100", commands: {}, defaultOwner: "other" },
      {
        applicationId: "100",
        commands: [{ guildId: "200", type: 9, name: "profile", owner: "hashira" }],
      },
    ]) {
      expect(() => parseCommandOwnership(value)).toThrow();
    }
    const entry = { guildId: "200", type: 1, name: "profile", owner: "hashira" };
    expect(() =>
      parseCommandOwnership({
        applicationId: "100",
        commands: [entry, { ...entry, owner: "kasutera" }],
      }),
    ).toThrow("Duplicate command ownership entry");
  });

  test("supports unconfigured use and refuses unreadable configured files", async () => {
    expect(await loadCommandOwnership()).toBeUndefined();
    await expect(loadCommandOwnership("/missing/command-owners.json")).rejects.toThrow();
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
      await bot.registerGuildCommands(
        "test-token",
        "200",
        "100",
        parseCommandOwnership({ applicationId: "100", defaultOwner: "hashira", commands: [] }),
      );
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

  test("preflights ownership in every guild before writing to any guild", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hashira-command-owners-"));
    const previousPath = process.env["DISCORD_COMMAND_OWNERSHIP_FILE"];
    const path = join(directory, "owners.json");
    const get = spyOn(REST.prototype, "get").mockResolvedValue([]);
    const post = spyOn(REST.prototype, "post").mockResolvedValue({});
    try {
      await writeFile(
        path,
        JSON.stringify({
          applicationId: "100",
          defaultOwner: "hashira",
          commands: [{ guildId: "300", type: 1, name: "profile", owner: "kasutera" }],
        }),
      );
      process.env["DISCORD_COMMAND_OWNERSHIP_FILE"] = path;
      const bot = new Hashira({ name: "test" }).command("profile", (builder) =>
        builder.setDescription("Profile").handle(async () => {}),
      );
      await expect(bot.registerCommands("test-token", ["200", "300"], "100")).rejects.toThrow(
        "Command 300/1:profile belongs to kasutera, not hashira",
      );
      expect(get).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    } finally {
      if (previousPath === undefined) delete process.env["DISCORD_COMMAND_OWNERSHIP_FILE"];
      else process.env["DISCORD_COMMAND_OWNERSHIP_FILE"] = previousPath;
      get.mockRestore();
      post.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
