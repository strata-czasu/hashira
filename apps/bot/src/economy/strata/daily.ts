import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { base } from "../../base";
import { ensureUsersExist } from "../../util/ensureUsersExist";

export const strataDaily = new Hashira({ name: "strata-daily" })
  .use(base)
  .command("daily", (command) =>
    command
      .setDescription("Odbierz lub przekaż swoje codzienne punkty")
      .addUser("użytkownik", (option) =>
        option
          .setDescription("Użytkownik, któremu chcesz przekazać punkty")
          .setRequired(false),
      )
      .handle(async ({ db }, { użytkownik: user }, itx) => {
        if (!itx.inCachedGuild()) return;

        const targetUser = user ?? itx.user;
        await ensureUsersExist(db, [itx.user.id, targetUser.id]);

        const invokerMarriage = await db.query.user.findFirst({
          where: eq(schema.user.id, itx.user.id),
          columns: { marriedTo: true },
        });

        if (!invokerMarriage) {
        }
      }),
  );
