export interface ExecutionContext {
  cwd: string;
  dryRun?: boolean;
  env?: Record<string, string>;
}

export abstract class Executable<Result = unknown> {
  constructor(public readonly id: string) {}

  abstract execute(ctx: ExecutionContext): Promise<Result>;
}

export interface ParamMeta<Params = any> {
  [K: string]: {
    description?: string;
    required?: boolean;
    defaultValue?: any;
  };
}

export abstract class Action<Params = any, Result = unknown> {
  constructor(public readonly id: string, public readonly paramsMeta?: ParamMeta<Params>) {}

  describe(params: Params): string {
    return `${this.id}(${JSON.stringify(params)})`;
  }

  createStepFromParams(stepId: string, params: Params): Step<Params, Result> {
    return new Step(stepId, this, params);
  }

  abstract run(params: Params, ctx: ExecutionContext): Promise<Result>;
}

export class Step<Params = any, Result = unknown> extends Executable<Result> {
  constructor(
    id: string,
    public readonly action: Action<Params, Result>,
    public readonly params: Params
  ) {
    super(id);
  }

  async execute(ctx: ExecutionContext): Promise<Result> {
    if (ctx.dryRun) {
      const description = this.action.describe(this.params);
      // eslint-disable-next-line no-console
      console.log(`[dry-run][step:${this.id}] ${description}`);
      return Promise.resolve(undefined as unknown as Result);
    }

    return this.action.run(this.params, ctx);
  }
}

export class Plan extends Executable<unknown[]> {
  private readonly executables: Executable[] = [];

  add(executable: Executable): this {
    this.executables.push(executable);
    return this;
  }

  async execute(ctx: ExecutionContext): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const executable of this.executables) {
      // eslint-disable-next-line no-await-in-loop
      const result = await executable.execute(ctx);
      results.push(result);
    }
    return results;
  }
}

export type Handler<Params = any, Result = unknown> = (
  params: Params,
  ctx: ExecutionContext
) => Promise<Result> | Result;

export class HandlerAction<Params = any, Result = unknown> extends Action<Params, Result> {
  constructor(id: string, private readonly handler: Handler<Params, Result>) {
    super(id);
  }

  async run(params: Params, ctx: ExecutionContext): Promise<Result> {
    return this.handler(params, ctx);
  }
}

export type CommandBuilder<Params = any> = (params: Params) => string;

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export class CommandLineAction<Params = { command: string }> extends Action<Params, CommandResult> {
  constructor(id: string, private readonly commandBuilder: CommandBuilder<Params> = (params: any) => (params as any).command) {
    super(id);
  }

  describe(params: Params): string {
    const command = this.commandBuilder(params);
    return command;
  }

  async run(params: Params, ctx: ExecutionContext): Promise<CommandResult> {
    const command = this.commandBuilder(params);
    const env = { ...process.env, ...ctx.env };
    const { exec } = await import('child_process');

    return new Promise<CommandResult>((resolve, reject) => {
      exec(command, { cwd: ctx.cwd, env }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }
}
