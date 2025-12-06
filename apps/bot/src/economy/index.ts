import { Hashira } from "@hashira/core";
import { currency } from "./currency";
import { inventory } from "./inventory";
import { items } from "./items";
import { shop } from "./shop";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" })
  .use(strataEconomy)
  .use(items)
  .use(shop)
  .use(inventory)
  .use(currency);
