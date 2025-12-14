import type { MessageEditOptions } from "discord.js";
import { type RenderContext, reconcile, setCurrentContext } from "./reconciler";
import { render as renderToMessage } from "./render";
import type { JSXNode } from "./types";

// TODO: This is AI generated to fit the new reconciler and render structure
// It doesn't make much sense as it doesn't let us actually render anything useful (event support lacking?)

/**
 * A Root manages a stateful component tree.
 *
 * It holds the state (hooks array) between renders and provides
 * a way to trigger re-renders when state changes.
 */
export class Root {
  /** The root component function to render */
  private component: () => JSXNode;

  /** Callback invoked with the new output after each render */
  private onUpdate: (output: MessageEditOptions) => void;

  /** The render context containing hook state */
  private context: RenderContext;

  /** Whether a render is currently scheduled (for batching) */
  private renderScheduled = false;

  /** The last rendered output */
  private lastOutput: MessageEditOptions | null = null;

  /**
   * Create a new Root for stateful rendering.
   *
   * @param component - A function that returns JSX (your root component)
   * @param onUpdate - Callback invoked with new MessageEditOptions after each render
   */
  constructor(
    component: () => JSXNode,
    onUpdate: (output: MessageEditOptions) => void,
  ) {
    this.component = component;
    this.onUpdate = onUpdate;

    // Create the render context
    this.context = {
      hooks: [],
      hookIndex: 0,
      scheduleUpdate: () => this.scheduleRender(),
    };
  }

  /**
   * Schedule a render to happen asynchronously.
   * Multiple calls within the same tick will be batched.
   */
  private scheduleRender(): void {
    if (this.renderScheduled) return;

    this.renderScheduled = true;

    // Use queueMicrotask to batch updates within the same tick
    queueMicrotask(() => {
      this.renderScheduled = false;
      this.performRender();
    });
  }

  /**
   * Execute the component tree and produce output.
   */
  private performRender(): void {
    // Reset hook index for this render pass
    this.context.hookIndex = 0;

    // Set up the global context so hooks can access it
    setCurrentContext(this.context);

    try {
      // Execute the component tree
      const element = this.component();

      // Reconcile VNodes to actual values
      const reconciled = reconcile(element);

      // Convert to MessageEditOptions
      this.lastOutput = renderToMessage(reconciled);

      // Notify the consumer
      this.onUpdate(this.lastOutput);
    } finally {
      // Clear the global context
      setCurrentContext(null);
    }
  }

  /**
   * Trigger the initial render.
   * Returns the initial output synchronously.
   */
  render(): MessageEditOptions {
    // Reset hook index for this render pass
    this.context.hookIndex = 0;

    // Set up the global context
    setCurrentContext(this.context);

    try {
      // Execute the component tree
      const element = this.component();

      // Reconcile VNodes to actual values
      const reconciled = reconcile(element);

      // Convert to MessageEditOptions
      this.lastOutput = renderToMessage(reconciled);

      return this.lastOutput;
    } finally {
      // Clear the global context
      setCurrentContext(null);
    }
  }

  /**
   * Get the last rendered output without triggering a new render.
   */
  getLastOutput(): MessageEditOptions | null {
    return this.lastOutput;
  }

  /**
   * Manually trigger a re-render.
   * Useful when external data changes.
   */
  update(): void {
    this.scheduleRender();
  }

  /**
   * Manually trigger a synchronous re-render.
   * Returns the new output immediately.
   */
  updateSync(): MessageEditOptions {
    return this.render();
  }
}

/**
 * Create a stateful root for rendering a component tree.
 *
 * The root manages state (via hooks like useState) and triggers
 * the onUpdate callback whenever the component tree needs to re-render.
 *
 * @param component - A function that returns JSX (your root component)
 * @param onUpdate - Callback invoked with new MessageEditOptions after each render
 * @returns A Root instance that can be used to trigger renders
 *
 * @example
 * ```tsx
 * function App() {
 *   const [count, setCount] = useState(0);
 *
 *   return (
 *     <>
 *       <TextDisplay content={`Count: ${count}`} />
 *       <ActionRow>
 *         <Button
 *           label="Increment"
 *           customId="increment"
 *           style={ButtonStyle.Primary}
 *         />
 *       </ActionRow>
 *     </>
 *   );
 * }
 *
 * const root = createRoot(App, (output) => {
 *   // Called on initial render and whenever state changes
 *   message.edit(output);
 * });
 *
 * // Perform initial render
 * const initialOutput = root.render();
 * await interaction.reply(initialOutput);
 *
 * // Later, when handling button interaction:
 * // The setCount() call inside the component will trigger onUpdate
 * ```
 */
export function createRoot(
  component: () => JSXNode,
  onUpdate: (output: MessageEditOptions) => void,
): Root {
  return new Root(component, onUpdate);
}
