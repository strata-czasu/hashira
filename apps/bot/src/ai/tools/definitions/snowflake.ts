import * as v from "valibot";

export const SnowflakeSchema = v.pipe(
  v.string(),
  v.title("Snowflake"),
  v.description(
    "A Discord snowflake. Can be parsed from mention like <@id>, <#id>, contains only digits.",
  ),
);
