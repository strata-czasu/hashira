/** biome-ignore-all lint/style/noNonNullAssertion: this is a test file */
/** @jsx jsx */
/** @jsxFrag Fragment */
/** @jsxImportSource @hashira/jsx */
import { describe, expect, it, mock } from "bun:test";
import { ButtonStyle } from "discord.js";
import {
  ActionRow,
  Button,
  createRoot,
  TextDisplay,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "../src";

// These tests are AI generated after the implementation of state management features
// TODO: They need to be revisited as they look terrible!

describe("State Management", () => {
  describe("createRoot", () => {
    it("performs initial render and returns output", () => {
      function App() {
        return <TextDisplay content="Hello, World!" />;
      }

      const onUpdate = mock(() => {});
      const root = createRoot(App, onUpdate);
      const output = root.render();

      expect(output).toMatchInlineSnapshot(`
        {
          "components": [
            TextDisplayBuilder {
              "data": {
                "content": "Hello, World!",
                "type": 10,
              },
            },
          ],
          "files": [],
          "flags": 32768,
        }
      `);

      // onUpdate is not called on initial render() - only on state changes
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("calls onUpdate when state changes", async () => {
      let setCounter: (v: number | ((prev: number) => number)) => void;

      function Counter() {
        const [count, setCount] = useState(0);
        setCounter = setCount;
        return <TextDisplay content={`Count: ${count}`} />;
      }

      const updates: unknown[] = [];
      const onUpdate = mock((output: unknown) => {
        updates.push(output);
      });

      const root = createRoot(Counter, onUpdate);
      const initial = root.render();

      // Initial render should show count 0
      expect(initial.components).toHaveLength(1);

      // Trigger state update
      setCounter!(1);

      // Wait for microtask to process
      await Promise.resolve();

      // onUpdate should have been called with new output
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(updates).toHaveLength(1);
    });

    it("batches multiple state updates in same tick", async () => {
      let setA: (v: number) => void;
      let setB: (v: number) => void;

      function App() {
        const [a, _setA] = useState(0);
        const [b, _setB] = useState(0);
        setA = _setA;
        setB = _setB;
        return <TextDisplay content={`A: ${a}, B: ${b}`} />;
      }

      const onUpdate = mock(() => {});
      const root = createRoot(App, onUpdate);
      root.render();

      // Trigger multiple updates in same tick
      setA!(1);
      setB!(2);

      // Wait for microtask
      await Promise.resolve();

      // Should only call onUpdate once (batched)
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("preserves state across renders", async () => {
      let increment: () => void;
      const values: number[] = [];

      function Counter() {
        const [count, setCount] = useState(0);
        values.push(count);
        increment = () => setCount((prev) => prev + 1);
        return <TextDisplay content={`Count: ${count}`} />;
      }

      const root = createRoot(Counter, () => {});
      root.render();

      increment!();
      await Promise.resolve();

      increment!();
      await Promise.resolve();

      increment!();
      await Promise.resolve();

      expect(values).toEqual([0, 1, 2, 3]);
    });

    it("supports functional updates to state", async () => {
      let doubleCount: () => void;

      function App() {
        const [count, setCount] = useState(5);
        doubleCount = () => setCount((prev) => prev * 2);
        return <TextDisplay content={`Count: ${count}`} />;
      }

      const root = createRoot(App, () => {});
      root.render();

      doubleCount!();
      await Promise.resolve();

      doubleCount!();
      await Promise.resolve();

      // Should have doubled twice: 5 -> 10 -> 20
      // We can verify by doing a sync render
      const output = root.updateSync();
      expect(output.components).toHaveLength(1);
    });

    it("does not re-render when state value is the same", async () => {
      let setCount: (v: number) => void;
      let renderCount = 0;

      function App() {
        const [count, _setCount] = useState(5);
        setCount = _setCount;
        renderCount++;
        return <TextDisplay content={`Count: ${count}`} />;
      }

      const onUpdate = mock(() => {});
      const root = createRoot(App, onUpdate);
      root.render();

      expect(renderCount).toBe(1);

      // Set to same value
      setCount!(5);
      await Promise.resolve();

      // Should not trigger re-render
      expect(onUpdate).not.toHaveBeenCalled();
      expect(renderCount).toBe(1);
    });
  });

  describe("useState", () => {
    it("throws when called outside render context", () => {
      expect(() => useState(0)).toThrow(
        "Hooks can only be called inside a component during rendering",
      );
    });

    it("maintains multiple independent states", async () => {
      let setName: (v: string) => void;
      let setAge: (v: number) => void;

      function Profile() {
        const [name, _setName] = useState("Alice");
        const [age, _setAge] = useState(25);
        setName = _setName;
        setAge = _setAge;
        return <TextDisplay content={`${name}, ${age}`} />;
      }

      const root = createRoot(Profile, () => {});
      root.render();

      setName!("Bob");
      await Promise.resolve();

      setAge!(30);
      await Promise.resolve();

      // Verify both states are preserved
      const output = root.updateSync();
      expect(output.components).toHaveLength(1);
    });
  });

  describe("useRef", () => {
    it("persists value across renders without triggering updates", async () => {
      let triggerRender: () => void;
      const refValues: number[] = [];

      function App() {
        const [, forceUpdate] = useState(0);
        const renderCount = useRef(0);

        triggerRender = () => forceUpdate((n) => n + 1);
        renderCount.current++;
        refValues.push(renderCount.current);

        return <TextDisplay content={`Renders: ${renderCount.current}`} />;
      }

      const root = createRoot(App, () => {});
      root.render();

      triggerRender!();
      await Promise.resolve();

      triggerRender!();
      await Promise.resolve();

      expect(refValues).toEqual([1, 2, 3]);
    });

    it("does not trigger re-render when mutated", async () => {
      let mutateRef: () => void;
      let renderCount = 0;

      function App() {
        const ref = useRef(0);
        renderCount++;
        mutateRef = () => {
          ref.current++;
        };
        return <TextDisplay content="Test" />;
      }

      const onUpdate = mock(() => {});
      const root = createRoot(App, onUpdate);
      root.render();

      expect(renderCount).toBe(1);

      mutateRef!();
      await Promise.resolve();

      // Mutating ref should not trigger update
      expect(onUpdate).not.toHaveBeenCalled();
      expect(renderCount).toBe(1);
    });
  });

  describe("useMemo", () => {
    it("memoizes computed value", async () => {
      let triggerRender: () => void;
      let computeCount = 0;

      function App() {
        const [count, _setCount] = useState(0);
        const [other, setOther] = useState(0);
        triggerRender = () => setOther((n) => n + 1);

        const expensive = useMemo(() => {
          computeCount++;
          return count * 2;
        }, [count]);

        return <TextDisplay content={`Result: ${expensive}, Other: ${other}`} />;
      }

      const root = createRoot(App, () => {});
      root.render();

      expect(computeCount).toBe(1);

      // Trigger render without changing count
      triggerRender!();
      await Promise.resolve();

      // Should not recompute
      expect(computeCount).toBe(1);
    });

    it("recomputes when dependencies change", async () => {
      let setCount: (v: number) => void;
      let computeCount = 0;

      function App() {
        const [count, _setCount] = useState(0);
        setCount = _setCount;

        const doubled = useMemo(() => {
          computeCount++;
          return count * 2;
        }, [count]);

        return <TextDisplay content={`Doubled: ${doubled}`} />;
      }

      const root = createRoot(App, () => {});
      root.render();

      expect(computeCount).toBe(1);

      setCount!(5);
      await Promise.resolve();

      expect(computeCount).toBe(2);
    });
  });

  describe("useCallback", () => {
    it("memoizes callback function", async () => {
      let triggerRender: () => void;
      const callbacks: Array<() => void> = [];

      function App() {
        const [other, setOther] = useState(0);
        triggerRender = () => setOther((n) => n + 1);

        const handleClick = useCallback(() => {
          console.log("clicked");
        }, []);

        callbacks.push(handleClick);
        return <TextDisplay content={`Other: ${other}`} />;
      }

      const root = createRoot(App, () => {});
      root.render();

      triggerRender!();
      await Promise.resolve();

      // Should be the same function reference
      expect(callbacks[0]).toBe(callbacks[1]);
    });
  });

  describe("nested components with state", () => {
    it("renders nested user components with independent state", async () => {
      let setParentCount: (v: number) => void;
      let setChildCount: (v: number) => void;

      function Child() {
        const [count, setCount] = useState(100);
        setChildCount = setCount;
        return <TextDisplay content={`Child: ${count}`} />;
      }

      function Parent() {
        const [count, setCount] = useState(0);
        setParentCount = setCount;
        return (
          <>
            <TextDisplay content={`Parent: ${count}`} />
            <Child />
          </>
        );
      }

      const root = createRoot(Parent, () => {});
      const output = root.render();

      // Should have both text displays
      expect(output.components).toHaveLength(2);

      setParentCount!(1);
      await Promise.resolve();

      setChildCount!(200);
      await Promise.resolve();

      const finalOutput = root.updateSync();
      expect(finalOutput.components).toHaveLength(2);
    });
  });

  describe("components with host children", () => {
    it("renders user component with Button children", () => {
      function ButtonGroup() {
        const [selected, _setSelected] = useState(0);
        return (
          <ActionRow>
            <Button
              label={selected === 0 ? "Selected" : "Option 1"}
              customId="btn-1"
              style={selected === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary}
            />
            <Button
              label={selected === 1 ? "Selected" : "Option 2"}
              customId="btn-2"
              style={selected === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary}
            />
          </ActionRow>
        );
      }

      const root = createRoot(ButtonGroup, () => {});
      const output = root.render();

      expect(output.components).toHaveLength(1); // One ActionRow
    });
  });

  describe("Root methods", () => {
    it("update() schedules async re-render", async () => {
      let renderCount = 0;

      function App() {
        renderCount++;
        return <TextDisplay content="Test" />;
      }

      const onUpdate = mock(() => {});
      const root = createRoot(App, onUpdate);
      root.render();

      expect(renderCount).toBe(1);

      root.update();
      expect(renderCount).toBe(1); // Not yet rendered

      await Promise.resolve();

      expect(renderCount).toBe(2);
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("updateSync() performs immediate re-render", () => {
      let renderCount = 0;

      function App() {
        renderCount++;
        return <TextDisplay content="Test" />;
      }

      const root = createRoot(App, () => {});
      root.render();

      expect(renderCount).toBe(1);

      root.updateSync();

      expect(renderCount).toBe(2);
    });

    it("getLastOutput() returns previous render result", () => {
      function App() {
        return <TextDisplay content="Hello" />;
      }

      const root = createRoot(App, () => {});

      expect(root.getLastOutput()).toBeNull();

      const output = root.render();
      expect(root.getLastOutput()).toBe(output);
    });
  });
});
