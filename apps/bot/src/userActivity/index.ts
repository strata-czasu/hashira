import { Hashira } from "@hashira/core";
import { userTextActivity } from "./userTextActivity";

export const userActivity = new Hashira({ name: "user-activity" }).use(
  userTextActivity,
);
