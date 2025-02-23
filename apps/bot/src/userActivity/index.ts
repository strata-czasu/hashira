import { Hashira } from "@hashira/core";
import { userTextActivity } from "./userTextActivity";
import { userVoiceActivity } from "./userVoiceActivity";

export const userActivity = new Hashira({ name: "user-activity" })
  .use(userTextActivity)
  .use(userVoiceActivity);
