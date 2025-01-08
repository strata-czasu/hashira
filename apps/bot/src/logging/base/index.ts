import { Hashira } from "@hashira/core";
import { economyLog } from "./economyLog";
import { memberLog } from "./memberLog";
import { messageLog } from "./messageLog";
import { moderationLog } from "./moderationLog";
import { profileLog } from "./profileLog";
import { roleLog } from "./roleLog";
import { strataCzasuLog } from "./strataCzasuLog";

// Base definition of loggers and log message types
export const loggingBase = new Hashira({ name: "loggingBase" })
  .use(messageLog)
  .use(memberLog)
  .use(profileLog)
  .use(roleLog)
  .use(moderationLog)
  .use(economyLog)
  .use(strataCzasuLog);
