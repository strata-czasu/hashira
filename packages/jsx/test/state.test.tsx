/** biome-ignore-all lint/suspicious/noExplicitAny: it helps with tests */
import { describe, expect, it, mock } from "bun:test";
import { ButtonStyle } from "discord.js";
import { ActionRow, Button, createProgram, TextDisplay } from "../src";

describe("State Management", () => {
  it("performs initial render and returns output", () => {
    type Model = { count: number };
    type Msg = { type: "INCREMENT" };

    const init: Model = { count: 0 };
    const update = (_: Msg, model: Model) => model;
    const view = (model: Model) => <TextDisplay content={`Count: ${model.count}`} />;

    const onUpdate = mock(() => {});
    const program = createProgram({ init, update, view }, onUpdate);
    const output = program.render();

    expect(output).toMatchInlineSnapshot(`
      {
        "components": [
          TextDisplayBuilder {
            "data": {
              "content": "Count: 0",
              "type": 10,
            },
          },
        ],
        "files": [],
        "flags": 32768,
      }
    `);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("updates state and re-renders on dispatch", async () => {
    type Model = { count: number };
    type Msg = { type: "INCREMENT" } | { type: "DECREMENT" };

    const init: Model = { count: 0 };

    const update = (msg: Msg, model: Model): Model => {
      switch (msg.type) {
        case "INCREMENT":
          return { count: model.count + 1 };
        case "DECREMENT":
          return { count: model.count - 1 };
      }
    };

    const view = (model: Model) => <TextDisplay content={`Count: ${model.count}`} />;

    const updates: unknown[] = [];
    const onUpdate = mock((output: unknown) => {
      updates.push(output);
    });

    const program = createProgram({ init, update, view }, onUpdate);
    program.render();

    program.dispatch({ type: "INCREMENT" });

    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(1);

    // Verify content
    expect(program.getLastOutput()?.components?.at(0)).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": "Count: 1",
          "type": 10,
        },
      }
    `);
  });

  it("batches multiple dispatches", async () => {
    type Model = { count: number };
    type Msg = { type: "INCREMENT" };

    const init: Model = { count: 0 };
    const update = (_: Msg, model: Model) => ({ count: model.count + 1 });
    const view = (model: Model) => <TextDisplay content={`Count: ${model.count}`} />;

    const onUpdate = mock(() => {});
    const program = createProgram({ init, update, view }, onUpdate);
    program.render();

    program.dispatch({ type: "INCREMENT" });
    program.dispatch({ type: "INCREMENT" });
    program.dispatch({ type: "INCREMENT" });

    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(program.getLastOutput()?.components?.at(0)).toMatchInlineSnapshot(`
      TextDisplayBuilder {
        "data": {
          "content": "Count: 3",
          "type": 10,
        },
      }
    `);
  });

  it("simulates a paginated view with external interactions", async () => {
    type Model = {
      page: number;
      items: string[];
      pageSize: number;
    };

    type Msg = { type: "NEXT" } | { type: "PREV" };

    const allItems = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
    const init: Model = {
      page: 0,
      items: allItems,
      pageSize: 3,
    };

    const update = (msg: Msg, model: Model): Model => {
      const totalPages = Math.ceil(model.items.length / model.pageSize);
      switch (msg.type) {
        case "NEXT":
          return {
            ...model,
            page: Math.min(model.page + 1, totalPages - 1),
          };
        case "PREV":
          return {
            ...model,
            page: Math.max(model.page - 1, 0),
          };
      }
    };

    const view = (model: Model) => {
      const start = model.page * model.pageSize;
      const end = start + model.pageSize;
      const currentItems = model.items.slice(start, end);
      const totalPages = Math.ceil(model.items.length / model.pageSize);

      return (
        <>
          <TextDisplay content={currentItems.join("\\n")} />
          <ActionRow>
            <Button
              label="Previous"
              customId="prev"
              style={ButtonStyle.Primary}
              disabled={model.page === 0}
            />
            <Button
              label={`Page ${model.page + 1}/${totalPages}`}
              customId="page-indicator"
              style={ButtonStyle.Secondary}
              disabled
            />
            <Button
              label="Next"
              customId="next"
              style={ButtonStyle.Primary}
              disabled={model.page === totalPages - 1}
            />
          </ActionRow>
        </>
      );
    };

    const onUpdate = mock(() => {});
    const program = createProgram({ init, update, view }, onUpdate);

    const initialOutput = program.render() as any;

    expect(initialOutput.components[0].data.content).toBe("Item 1\\nItem 2\\nItem 3");
    expect(initialOutput.components[1].components[0].data.disabled).toBe(true); // Prev disabled

    program.dispatch({ type: "NEXT" });
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const page2Output = program.getLastOutput() as any;
    expect(page2Output.components[0].data.content).toBe("Item 4\\nItem 5\\nItem 6");
    expect(page2Output.components[1].components[0].data.disabled).toBeFalsy(); // Prev enabled

    program.dispatch({ type: "NEXT" });
    await Promise.resolve();

    const page3Output = program.getLastOutput() as any;
    expect(page3Output.components[0].data.content).toBe("Item 7\\nItem 8\\nItem 9");

    program.dispatch({ type: "NEXT" });
    await Promise.resolve();

    const page4Output = program.getLastOutput() as any;
    expect(page4Output.components[0].data.content).toBe("Item 10");
    expect(page4Output.components[1].components[2].data.disabled).toBe(true); // Next disabled
  });
});
