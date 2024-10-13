import type { ExtractContext } from "@hashira/core";
import type { BaseIssue, BaseSchema, InferInput } from "valibot";
import type { base } from "../../../base";
import type { ToolContext } from "./toolContext";

export interface Tool<
  T extends BaseSchema<unknown, unknown, BaseIssue<unknown>> = BaseSchema<
    unknown,
    unknown,
    BaseIssue<unknown>
  >,
> {
  name: string;
  description: string;
  schema: T;
  creator: Creator<T>;
}

export type Creator<T extends BaseSchema<unknown, unknown, BaseIssue<unknown>>> = (
  context: ExtractContext<typeof base>,
  toolContext: ToolContext,
) => (args: InferInput<T>) => Promise<unknown>;
