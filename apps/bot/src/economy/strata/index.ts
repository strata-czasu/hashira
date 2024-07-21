import { Hashira } from "@hashira/core";
import { strataDaily } from "./daily";
import { strataCurrency } from "./strataCurrency";

export const strataEconomy = new Hashira({ name: "strata-economy" })
  .use(strataCurrency)
  .use(strataDaily);
