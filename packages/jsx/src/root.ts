import type { MessageEditOptions } from "discord.js";
import { reconcile } from "./reconciler";
import { render } from "./render";
import type { JSXNode } from "./types";

export interface ProgramConfig<Model, Msg> {
  init: Model;
  update: (msg: Msg, model: Model) => Model;
  view: (model: Model) => JSXNode;
}

export class Program<Model, Msg> {
  private state: Model;
  private updateFn: (msg: Msg, model: Model) => Model;
  private viewFn: (model: Model) => JSXNode;
  private onUpdate: (output: MessageEditOptions) => void;
  private renderScheduled = false;
  private lastOutput: MessageEditOptions | null = null;

  constructor(
    config: ProgramConfig<Model, Msg>,
    onUpdate: (output: MessageEditOptions) => void,
  ) {
    this.state = config.init;
    this.updateFn = config.update;
    this.viewFn = config.view;
    this.onUpdate = onUpdate;
  }

  dispatch(msg: Msg): void {
    const newState = this.updateFn(msg, this.state);

    if (this.state === newState) return;

    this.state = newState;
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;

    this.renderScheduled = true;

    queueMicrotask(() => {
      this.renderScheduled = false;
      this.performRender();
    });
  }

  private performRender(): void {
    const element = this.viewFn(this.state);
    const reconciled = reconcile(element);
    this.lastOutput = render(reconciled);
    this.onUpdate(this.lastOutput);
  }

  render(): MessageEditOptions {
    const element = this.viewFn(this.state);
    const reconciled = reconcile(element);
    this.lastOutput = render(reconciled);
    return this.lastOutput;
  }

  getLastOutput(): MessageEditOptions | null {
    return this.lastOutput;
  }
}

export function createProgram<Model, Msg>(
  config: ProgramConfig<Model, Msg>,
  onUpdate: (output: MessageEditOptions) => void,
): Program<Model, Msg> {
  return new Program(config, onUpdate);
}
