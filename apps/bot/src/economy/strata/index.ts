import { Hashira } from "@hashira/core";
import { strataCurrency } from "./strataCurrency";

export const strataEconomy = new Hashira({ name: "strata-economy" }).use(
  strataCurrency,
);
