import { Hashira } from "@hashira/core";
import { strataEconomy } from "./strata";

export const economy = new Hashira({ name: "economy" }).use(strataEconomy);
