import { Hashira } from "@hashira/core";
import { colorRoles } from "./colorRoles";
import { strataMisc } from "./misc";
import { ultimatum } from "./ultimatum";

export const strataCzasu = new Hashira({ name: "strata-czasu" })
  .use(colorRoles)
  .use(strataMisc)
  .use(ultimatum);
