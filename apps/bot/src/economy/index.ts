import { Hashira } from "@hashira/core";
import { currency } from "./currency";
import { shop } from "./shop";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" })
  .use(currency)
  .use(strataEconomy)
  .use(shop);
