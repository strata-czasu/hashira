import { Hashira } from "@hashira/core";
import { colorRoles } from "./colorRoles";
import { misc } from "./misc";
import { pearto } from "./pearto";
import { propositions } from "./propositions";
import { ultimatum } from "./ultimatum";

export const strataCzasu = new Hashira({ name: "strata-czasu" })
  .use(colorRoles)
  .use(misc)
  .use(pearto)
  .use(propositions)
  .use(ultimatum);
