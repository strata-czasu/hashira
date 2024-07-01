import { Hashira } from "@hashira/core";
import { shop } from "./shop";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" }).use(strataEconomy).use(shop);
