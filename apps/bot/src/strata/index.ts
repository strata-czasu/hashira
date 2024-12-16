import { Hashira } from "@hashira/core";
import { colorRoles } from "./colorRoles";
import { misc } from "./misc";
import { ultimatum } from "./ultimatum";

export const strataCzasu = new Hashira({ name: "strata-czasu" })
  .use(colorRoles)
  .use(misc)
  .use(ultimatum);
