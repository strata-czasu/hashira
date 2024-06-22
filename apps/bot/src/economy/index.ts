import { Hashira } from "@hashira/core";
import { currency } from "./currency";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" })
  .use(currency)
  .use(strataEconomy);
