import { Hashira } from "@hashira/core";
import { brochure } from "./brochure";
import { colorRoles } from "./colorRoles";
import { embedPermissions } from "./embedPermissions";
import { misc } from "./misc";
import { pearto } from "./pearto";
import { propositions } from "./propositions";
import { ticketReminder } from "./ticketReminder";
import { ultimatum } from "./ultimatum";

export const strataCzasu = new Hashira({ name: "strata-czasu" })
  .use(brochure)
  .use(colorRoles)
  .use(embedPermissions)
  .use(misc)
  .use(pearto)
  .use(propositions)
  .use(ticketReminder)
  .use(ultimatum);
