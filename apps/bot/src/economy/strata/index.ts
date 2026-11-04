import { Hashira } from "@hashira/core";

import { strataRep } from "./rep";
import { strataCurrency } from "./strataCurrency";

export const strataEconomy = new Hashira({ name: "strata-economy" })
  .use(strataCurrency)
  .use(strataRep);
