import { toJsonSchema } from "@valibot/to-json-schema";
import type { BaseIssue, BaseSchema } from "valibot";
import type { Tool } from "./tool";

export function getJsonDefinition(
  schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
) {
  const { $schema, ...jsonSchema } = toJsonSchema(schema);

  return jsonSchema;
}

export function getDefinition(
  tool: Tool<BaseSchema<unknown, unknown, BaseIssue<unknown>>>,
) {
  return {
    function: {
      name: tool.name,
      description: tool.description,
      strict: true,
      parameters: getJsonDefinition(tool.schema),
    },
    type: "function",
  } as const;
}
