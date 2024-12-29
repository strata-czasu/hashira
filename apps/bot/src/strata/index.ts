import { Hashira } from "@hashira/core";
import { colorRoles } from "./colorRoles";
import { misc } from "./misc";
import { propositions } from "./propositions";
import { ultimatum } from "./ultimatum";

export const strataCzasu = new Hashira({ name: "strata-czasu" })
  .use(colorRoles)
  .use(misc)
  .use(propositions)
  .use(ultimatum);
