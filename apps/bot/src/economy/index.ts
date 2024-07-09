import { Hashira } from "@hashira/core";
import { inventory } from "./inventory";
import { shop } from "./shop";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" })
  .use(strataEconomy)
  .use(shop)
  .use(inventory);
