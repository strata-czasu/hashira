import * as v from "valibot";
import type { Creator, Tool } from "./util/tool";

const createForwardSchema = v.object({
  step: v.pipe(v.number(), v.description("Current step")),
});

const createForward: Creator<typeof createForwardSchema> = () => {
  return async () => "Continuing...";
};

export default {
  schema: createForwardSchema,
  creator: createForward,
  name: "forward",
  description: "Continue your chain of thoughts",
} as Tool<typeof createForwardSchema>;
